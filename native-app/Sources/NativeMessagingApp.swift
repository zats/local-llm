import Foundation

class NativeMessagingApp: @unchecked Sendable {
    private var activeSessions: [String: LanguageModelSession] = [:]
    private let stdin = FileHandle.standardInput
    private let stdout = FileHandle.standardOutput
    private let stderr = FileHandle.standardError
    
    func run() {      
        // Set up input monitoring - keep reading until no more data
        stdin.readabilityHandler = { [weak self] handle in
            self?.handleAllAvailableInput(from: handle)
        }
        
        // Keep the app running
        RunLoop.main.run()
    }
    
    private func handleAllAvailableInput(from fileHandle: FileHandle) {
        // Keep reading messages while data is available
        while true {
            autoreleasepool {
                if !handleSingleInput(from: fileHandle) {
                    return // No more complete messages available
                }
            }
        }
    }
    
    private func handleSingleInput(from fileHandle: FileHandle) -> Bool {
        // Try to read message length (4 bytes)
        guard let lengthData = try? fileHandle.read(upToCount: 4),
              lengthData.count == 4 else {
            // No complete length header available
            return false
        }
        
        let messageLength = lengthData.withUnsafeBytes { bytes in
            bytes.load(as: UInt32.self).littleEndian
        }
        
        // Validate message length (reasonable bounds)
        guard messageLength > 0 && messageLength < 1024 * 1024 else { // Max 1MB
            logMessage("Invalid message length: \(messageLength)")
            sendError("Invalid message length")
            return false
        }
        
        // Try to read message data
        guard let messageData = try? fileHandle.read(upToCount: Int(messageLength)),
              messageData.count == Int(messageLength) else {
            logMessage("Failed to read complete message (expected \(messageLength) bytes)")
            return false
        }
        
        // Parse and process the message
        do {
            let message = try JSONSerialization.jsonObject(with: messageData) as? [String: Any]
            processMessage(message)
            return true
        } catch {
            logMessage("Failed to parse JSON: \(error)")
            sendError("Invalid JSON message")
            return true // Continue reading other messages
        }
    }
    
    private func processMessage(_ message: [String: Any]?) {
        guard let message = message else {
            logMessage("Received nil message")
            sendError("Null message received")
            return
        }
        
        guard let requestId = message["requestId"] as? String else {
            logMessage("Missing or invalid requestId in message: \(message)")
            sendError("Missing requestId field")
            return
        }
        
        guard let command = message["command"] as? String else {
            logMessage("Missing or invalid command in message: \(message)")
            sendError("Missing command field", requestId: requestId)
            return
        }
        
        logMessage("Processing command: \(command) with requestId: \(requestId)")
        
        let payload = message["payload"] as? [String: Any]
        
        switch command {
        case "checkAvailability":
            handleCheckAvailability(requestId: requestId)
            
        case "getCompletion":
            handleGetCompletion(requestId: requestId, payload: payload)
            
        case "getCompletionStream":
            handleGetCompletionStream(requestId: requestId, payload: payload)
            
        case "startPlaygroundSession":
            handleStartPlaygroundSession(requestId: requestId)
            
        case "sendPlaygroundMessage":
            handleSendPlaygroundMessage(requestId: requestId, payload: payload)
            
        case "endPlaygroundSession":
            handleEndPlaygroundSession(requestId: requestId, payload: payload)
            
        default:
            sendError("Unknown command: \(command)", requestId: requestId)
        }
    }
    
    private func handleCheckAvailability(requestId: String) {
        // Check if LLM framework is available
        let available = LanguageModelSession.isAvailable()
        
        let response: [String: Any] = [
            "requestId": requestId,
            "type": "availabilityResponse",
            "payload": [
                "available": available,
                "reason": available ? "Ready" : "LLM framework not available"
            ]
        ]
        
        sendMessage(response)
    }
    
    private func handleGetCompletion(requestId: String, payload: [String: Any]?) {
        guard let payload = payload,
              let prompt = payload["prompt"] as? String else {
            sendError("Missing prompt", requestId: requestId)
            return
        }
        
        // Copy values before Task to avoid capturing non-Sendable dictionary
        let options = createGenerationOptions(from: payload)
        let promptCopy = prompt
        let requestIdCopy = requestId
        
        Task {
            do {
                let session = try LanguageModelSession()
                let response = try await session.generateResponseDirect(to: promptCopy, options: options)
                
                let responseMessage: [String: Any] = [
                    "requestId": requestIdCopy,
                    "type": "completionResponse", 
                    "payload": [
                        "response": response
                    ]
                ]
                
                sendMessage(responseMessage)
            } catch {
                sendError("Generation failed: \(error.localizedDescription)", requestId: requestIdCopy)
            }
        }
    }
    
    private func handleGetCompletionStream(requestId: String, payload: [String: Any]?) {
        guard let payload = payload,
              let prompt = payload["prompt"] as? String else {
            sendError("Missing prompt", requestId: requestId)
            return
        }
        
        // Copy values before Task to avoid capturing non-Sendable dictionary
        let options = createGenerationOptions(from: payload)
        let promptCopy = prompt
        let requestIdCopy = requestId
        
        Task {
            do {
                // Use streamResponseDirect for API calls (no conversation history)
                let session = try LanguageModelSession()
                
                for try await token in session.streamResponseDirect(to: promptCopy, options: options) {
                    let chunkMessage: [String: Any] = [
                        "requestId": requestIdCopy,
                        "type": "streamChunk",
                        "payload": [
                            "token": token
                        ]
                    ]
                    sendMessage(chunkMessage)
                }
                
                let endMessage: [String: Any] = [
                    "requestId": requestIdCopy,
                    "type": "streamEnd",
                    "payload": [:]
                ]
                sendMessage(endMessage)
                
            } catch {
                sendError("Streaming failed: \(error.localizedDescription)", requestId: requestIdCopy)
            }
        }
    }
    
    private func handleStartPlaygroundSession(requestId: String) {
        let sessionId = UUID().uuidString
        do {
            let session = try LanguageModelSession()
            activeSessions[sessionId] = session
            
            let response: [String: Any] = [
                "requestId": requestId,
                "type": "playgroundSessionStarted",
                "payload": [
                    "sessionId": sessionId
                ]
            ]
            
            sendMessage(response)
            logMessage("Started playground session: \(sessionId)")
        } catch {
            sendError("Failed to create session: \(error.localizedDescription)", requestId: requestId)
        }
    }
    
    private func handleSendPlaygroundMessage(requestId: String, payload: [String: Any]?) {
        guard let payload = payload,
              let sessionId = payload["sessionId"] as? String,
              let prompt = payload["prompt"] as? String else {
            sendError("Missing sessionId or prompt", requestId: requestId)
            return
        }
        
        guard let session = activeSessions[sessionId] else {
            sendError("Session not found: \(sessionId)", requestId: requestId)
            return
        }
        
        // Copy values before Task to avoid capturing non-Sendable types
        let options = createGenerationOptions(from: payload)
        let promptCopy = prompt
        let sessionIdCopy = sessionId
        let requestIdCopy = requestId
        
        Task {
            do {
                
                for try await token in session.streamResponse(to: promptCopy, options: options) {
                    let chunkMessage: [String: Any] = [
                        "requestId": requestIdCopy,
                        "type": "streamChunk",
                        "payload": [
                            "sessionId": sessionIdCopy,
                            "token": token
                        ]
                    ]
                    sendMessage(chunkMessage)
                }
                
                let endMessage: [String: Any] = [
                    "requestId": requestIdCopy,
                    "type": "streamEnd",
                    "payload": [
                        "sessionId": sessionIdCopy
                    ]
                ]
                sendMessage(endMessage)
                
            } catch {
                let errorMessage: [String: Any] = [
                    "requestId": requestIdCopy,
                    "type": "error",
                    "payload": [
                        "sessionId": sessionIdCopy,
                        "message": error.localizedDescription,
                        "code": "generation_failed"
                    ]
                ]
                sendMessage(errorMessage)
            }
        }
    }
    
    private func handleEndPlaygroundSession(requestId: String, payload: [String: Any]?) {
        guard let payload = payload,
              let sessionId = payload["sessionId"] as? String else {
            sendError("Missing sessionId", requestId: requestId)
            return
        }
        
        activeSessions.removeValue(forKey: sessionId)
        logMessage("Ended playground session: \(sessionId)")
        
        let response: [String: Any] = [
            "requestId": requestId,
            "type": "sessionEnded",
            "payload": [
                "sessionId": sessionId
            ]
        ]
        
        sendMessage(response)
    }
    
    private func createGenerationOptions(from payload: [String: Any]) -> GenerationOptions {
        var options = GenerationOptions()
        
        if let temperature = payload["temperature"] as? Double {
            options.temperature = temperature
        }
        
        if let maxTokens = payload["maximumResponseTokens"] as? Int {
            options.maximumResponseTokens = maxTokens
        }
        
        return options
    }
    
    private func sendMessage(_ message: [String: Any]) {
        do {
            let data = try JSONSerialization.data(withJSONObject: message)
            var length = UInt32(data.count).littleEndian
            
            stdout.write(Data(bytes: &length, count: 4))
            stdout.write(data)
            
            // Force flush to ensure immediate delivery  
            do {
                if #available(macOS 10.15, *) {
                    try stdout.synchronize()
                }
            } catch {
                // Ignore synchronize errors - not all handles support it
            }
            
            // Debug log the response (without sensitive data)
            if let requestId = message["requestId"] as? String,
               let type = message["type"] as? String {
                logMessage("Sent response: \(type) for request: \(requestId)")
            }
        } catch {
            logMessage("Failed to send message: \(error)")
        }
    }
    
    private func sendError(_ message: String, requestId: String? = nil) {
        var errorMessage: [String: Any] = [
            "type": "error",
            "payload": [
                "message": message,
                "code": "native_error"
            ]
        ]
        
        if let requestId = requestId {
            errorMessage["requestId"] = requestId
        }
        
        sendMessage(errorMessage)
    }
    
    private func logMessage(_ message: String) {
        let timestamp = Date()
        let logMessage = "[\(timestamp)] \(message)\n"
        
        // Write to stderr
        if let data = logMessage.data(using: .utf8) {
            stderr.write(data)
        }
        
        // Also write to log file for debugging
        let logPath = "/tmp/chromellm-native.log"
        if let logData = logMessage.data(using: .utf8) {
            if FileManager.default.fileExists(atPath: logPath) {
                let fileHandle = FileHandle(forWritingAtPath: logPath)
                fileHandle?.seekToEndOfFile()
                fileHandle?.write(logData)
                fileHandle?.closeFile()
            } else {
                try? logData.write(to: URL(fileURLWithPath: logPath))
            }
        }
    }
}
