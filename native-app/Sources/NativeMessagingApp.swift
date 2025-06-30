import Foundation
import os.log

class NativeMessagingApp: @unchecked Sendable {
    private var activeSessions: [String: LanguageModelSession] = [:]
    private let stdin = FileHandle.standardInput
    private let stdout = FileHandle.standardOutput
    private let stderr = FileHandle.standardError
    private let logger = OSLog(subsystem: "com.nativefoundationmodels.native", category: "NativeMessagingApp")
    
    func run() {
        logMessage("NativeMessagingApp started.", type: .info)
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
            logMessage("Failed to read 4-byte length header or no more data.", type: .error)
            exit(1) // Exit on read failure to prevent infinite loop
        }
        
        let messageLength = lengthData.withUnsafeBytes { bytes in
            bytes.load(as: UInt32.self).littleEndian
        }
        
        // Validate message length (reasonable bounds)
        guard messageLength > 0 && messageLength < 1024 * 1024 else { // Max 1MB
            logMessage("Invalid message length: \(messageLength)", type: .error)
            sendError("Invalid message length")
            return false
        }
        
        // Try to read message data
        let messageDataResult = try? fileHandle.read(upToCount: Int(messageLength))
        guard let messageData = messageDataResult,
              messageData.count == Int(messageLength) else {
            logMessage("Failed to read complete message (expected \(messageLength) bytes, got \(messageDataResult?.count ?? 0))", type: .error)
            return false
        }
        
        // Parse and process the message
        do {
            let message = try JSONSerialization.jsonObject(with: messageData) as? [String: Any]
            processMessage(message)
            return true
        } catch {
            logMessage("Failed to parse JSON: \(error)", type: .error)
            sendError("Invalid JSON message")
            return true // Continue reading other messages
        }
    }
    
    private func processMessage(_ message: [String: Any]?) {
        guard let message = message else {
            logMessage("Received nil message", type: .error)
            sendError("Null message received")
            return
        }
        
        guard let requestId = message["requestId"] as? String else {
            logMessage("Missing or invalid requestId in message: \(message)", type: .error)
            sendError("Missing requestId field")
            return
        }
        
        guard let command = message["command"] as? String else {
            logMessage("Missing or invalid command in message: \(message)", type: .error)
            sendError("Missing command field", requestId: requestId)
            return
        }
        
        logMessage("Processing command: \(command) with requestId: \(requestId)", type: .info)
        
        let payload = message["payload"] as? [String: Any]
        
        switch command {
        case "checkAvailability":
            logMessage("Received checkAvailability command.", type: .info)
            handleCheckAvailability(requestId: requestId)
            
        case "getCompletion":
            logMessage("Received getCompletion command.", type: .info)
            handleGetCompletion(requestId: requestId, payload: payload)
            
        case "getCompletionStream":
            logMessage("Received getCompletionStream command.", type: .info)
            handleGetCompletionStream(requestId: requestId, payload: payload)
            
        case "startPlaygroundSession":
            logMessage("Received startPlaygroundSession command.", type: .info)
            handleStartPlaygroundSession(requestId: requestId, payload: payload)
            
        case "sendPlaygroundMessage":
            logMessage("Received sendPlaygroundMessage command.", type: .info)
            handleSendPlaygroundMessage(requestId: requestId, payload: payload)
            
        case "endPlaygroundSession":
            logMessage("Received endPlaygroundSession command.", type: .info)
            handleEndPlaygroundSession(requestId: requestId, payload: payload)
            
        default:
            logMessage("Received unknown command: \(command)", type: .error)
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
                sendStructuredError(error, requestId: requestIdCopy)
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
                sendStructuredError(error, requestId: requestIdCopy)
            }
        }
    }
    
    private func handleStartPlaygroundSession(requestId: String, payload: [String: Any]? = nil) {
        let sessionId = UUID().uuidString
        do {
            let systemPrompt = payload?["systemPrompt"] as? String
            let session = try LanguageModelSession(systemPrompt: systemPrompt)
            activeSessions[sessionId] = session
            
            let response: [String: Any] = [
                "requestId": requestId,
                "type": "playgroundSessionStarted",
                "payload": [
                    "sessionId": sessionId
                ]
            ]
            
            sendMessage(response)
            logMessage("Started playground session: \(sessionId) with system prompt: \(systemPrompt ?? "none")", type: .info)
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
                sendStructuredSessionError(error, requestId: requestIdCopy, sessionId: sessionIdCopy)
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
        logMessage("Ended playground session: \(sessionId)", type: .info)
        
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
        
        if let samplingModeString = payload["samplingMode"] as? String {
            switch samplingModeString {
            case "top-p":
                // Use default parameters for top-p
                options.samplingMode = .topP()
            case "top-k":
                // Use default parameters for top-k
                options.samplingMode = .topK()
            case "greedy":
                options.samplingMode = .greedy
            default:
                // Keep default (topP)
                break
            }
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
                logMessage("Sent response: \(type) for request: \(requestId)", type: .debug)
            }
        } catch {
            logMessage("Failed to send message: \(error)", type: .error)
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
    
    private func sendStructuredError(_ error: Error, requestId: String) {
        var errorCode = "generation_failed"
        var userMessage = "An error occurred while generating a response."
        
        if let languageModelError = error as? LanguageModelError {
            switch languageModelError {
            case .assetsUnavailable:
                errorCode = "assets_unavailable"
                userMessage = languageModelError.userFriendlyMessage
            case .contextWindowExceeded:
                errorCode = "context_window_exceeded"
                userMessage = languageModelError.userFriendlyMessage
            case .guardrailViolation:
                errorCode = "guardrail_violation"
                userMessage = languageModelError.userFriendlyMessage
            case .decodingFailure:
                errorCode = "decoding_failure"
                userMessage = languageModelError.userFriendlyMessage
            case .unsupportedGuide:
                errorCode = "unsupported_guide"
                userMessage = languageModelError.userFriendlyMessage
            case .sessionNotAvailable:
                errorCode = "session_not_available"
                userMessage = languageModelError.userFriendlyMessage
            case .generationFailed:
                errorCode = "generation_failed"
                userMessage = languageModelError.userFriendlyMessage
            }
        }
        
        let errorMessage: [String: Any] = [
            "requestId": requestId,
            "type": "error",
            "payload": [
                "message": userMessage,
                "code": errorCode,
                "technical_details": error.localizedDescription
            ]
        ]
        
        sendMessage(errorMessage)
    }
    
    private func sendStructuredSessionError(_ error: Error, requestId: String, sessionId: String) {
        var errorCode = "generation_failed"
        var userMessage = "An error occurred while generating a response."
        
        if let languageModelError = error as? LanguageModelError {
            switch languageModelError {
            case .assetsUnavailable:
                errorCode = "assets_unavailable"
                userMessage = languageModelError.userFriendlyMessage
            case .contextWindowExceeded:
                errorCode = "context_window_exceeded"
                userMessage = languageModelError.userFriendlyMessage
            case .guardrailViolation:
                errorCode = "guardrail_violation"
                userMessage = languageModelError.userFriendlyMessage
            case .decodingFailure:
                errorCode = "decoding_failure"
                userMessage = languageModelError.userFriendlyMessage
            case .unsupportedGuide:
                errorCode = "unsupported_guide"
                userMessage = languageModelError.userFriendlyMessage
            case .sessionNotAvailable:
                errorCode = "session_not_available"
                userMessage = languageModelError.userFriendlyMessage
            case .generationFailed:
                errorCode = "generation_failed"
                userMessage = languageModelError.userFriendlyMessage
            }
        }
        
        let errorMessage: [String: Any] = [
            "requestId": requestId,
            "type": "error",
            "payload": [
                "sessionId": sessionId,
                "message": userMessage,
                "code": errorCode,
                "technical_details": error.localizedDescription
            ]
        ]
        
        sendMessage(errorMessage)
    }
    
    private func logMessage(_ message: String, type: OSLogType = .debug) {
        let timestamp = Date()
        let logMessage = "[" + String(describing: timestamp) + "] " + message + "\n"
        
        // Write to stderr
        if type == .error, let data = message.data(using: .utf8) {
            stderr.write(data)
        }
                
        // Use os.log for system-wide logging
        os_log("%{public}@", log: logger, type: type, message)
    }
}
