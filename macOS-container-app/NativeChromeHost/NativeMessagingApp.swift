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
            
        case "chatCompletion":
            logMessage("Received chatCompletion command.", type: .info)
            handleChatCompletion(requestId: requestId, payload: payload)
            
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
            "payload": APIResponseFormatter.availabilityResponse(available: available)
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
        let options = APIResponseFormatter.parseGenerationOptions(from: payload)
        let systemPrompt = payload["systemPrompt"] as? String
        let promptCopy = prompt
        let requestIdCopy = requestId
        
        Task {
            do {
                let session = try LanguageModelSession(systemPrompt: systemPrompt)
                let response = try await session.generateResponseDirect(to: promptCopy, options: options)
                
                let responseMessage: [String: Any] = [
                    "requestId": requestIdCopy,
                    "type": "completionResponse", 
                    "payload": APIResponseFormatter.completionResponse(content: response)
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
        let options = APIResponseFormatter.parseGenerationOptions(from: payload)
        let systemPrompt = payload["systemPrompt"] as? String
        let promptCopy = prompt
        let requestIdCopy = requestId
        
        Task {
            do {
                // Use streamResponseDirect for API calls (no conversation history)
                let session = try LanguageModelSession(systemPrompt: systemPrompt)
                var streamContext = APIResponseFormatter.StreamContext()
                
                for try await accumulatedContent in session.streamResponseDirect(to: promptCopy, options: options) {
                    // Calculate the delta (new content only)
                    let deltaContent = streamContext.processAccumulatedContent(accumulatedContent)
                    
                    // Send role in first chunk if we have content
                    if streamContext.isFirstChunk && !deltaContent.isEmpty {
                        // First send role-only chunk
                        let roleChunkMessage: [String: Any] = [
                            "requestId": requestIdCopy,
                            "type": "streamChunk",
                            "payload": APIResponseFormatter.streamChunk(
                                id: streamContext.id,
                                role: "assistant",
                                timestamp: streamContext.timestamp
                            )
                        ]
                        sendMessage(roleChunkMessage)
                        streamContext.isFirstChunk = false
                    }
                    
                    // Send content chunk (if we have content)
                    if !deltaContent.isEmpty {
                        let chunkMessage: [String: Any] = [
                            "requestId": requestIdCopy,
                            "type": "streamChunk",
                            "payload": APIResponseFormatter.streamChunk(
                                id: streamContext.id,
                                content: deltaContent,
                                timestamp: streamContext.timestamp
                            )
                        ]
                        sendMessage(chunkMessage)
                    }
                }
                
                let endMessage: [String: Any] = [
                    "requestId": requestIdCopy,
                    "type": "streamEnd",
                    "payload": APIResponseFormatter.streamChunk(
                        id: streamContext.id,
                        isLast: true,
                        timestamp: streamContext.timestamp
                    )
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
        let options = APIResponseFormatter.parseGenerationOptions(from: payload)
        let promptCopy = prompt
        let sessionIdCopy = sessionId
        let requestIdCopy = requestId
        
        Task {
            do {
                var streamContext = APIResponseFormatter.StreamContext()
                
                for try await accumulatedContent in session.streamResponse(to: promptCopy, options: options) {
                    // Calculate the delta (new content only)
                    let deltaContent = streamContext.processAccumulatedContent(accumulatedContent)
                    
                    // Send role in first chunk if we have content
                    if streamContext.isFirstChunk && !deltaContent.isEmpty {
                        // First send role-only chunk
                        var roleChunk = APIResponseFormatter.streamChunk(
                            id: streamContext.id,
                            role: "assistant",
                            timestamp: streamContext.timestamp
                        )
                        // Add sessionId to payload
                        var rolePayload = roleChunk
                        rolePayload["sessionId"] = sessionIdCopy
                        
                        let roleChunkMessage: [String: Any] = [
                            "requestId": requestIdCopy,
                            "type": "streamChunk",
                            "payload": rolePayload
                        ]
                        sendMessage(roleChunkMessage)
                        streamContext.isFirstChunk = false
                    }
                    
                    // Send content chunk (if we have content)
                    if !deltaContent.isEmpty {
                        var contentChunk = APIResponseFormatter.streamChunk(
                            id: streamContext.id,
                            content: deltaContent,
                            timestamp: streamContext.timestamp
                        )
                        // Add sessionId to payload
                        var contentPayload = contentChunk
                        contentPayload["sessionId"] = sessionIdCopy
                        
                        let chunkMessage: [String: Any] = [
                            "requestId": requestIdCopy,
                            "type": "streamChunk",
                            "payload": contentPayload
                        ]
                        sendMessage(chunkMessage)
                    }
                }
                
                var finalChunk = APIResponseFormatter.streamChunk(
                    id: streamContext.id,
                    isLast: true,
                    timestamp: streamContext.timestamp
                )
                // Add sessionId to payload
                var finalPayload = finalChunk
                finalPayload["sessionId"] = sessionIdCopy
                
                let endMessage: [String: Any] = [
                    "requestId": requestIdCopy,
                    "type": "streamEnd",
                    "payload": finalPayload
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
    
    private func handleChatCompletion(requestId: String, payload: [String: Any]?) {
        guard let payload = payload,
              let messages = payload["messages"] as? [[String: Any]] else {
            sendError("Missing messages array", requestId: requestId)
            return
        }
        
        // Convert OpenAI messages to prompt format
        let prompt = convertMessagesToPrompt(messages)
        let isStreaming = payload["stream"] as? Bool ?? false
        
        // Copy values before Task to avoid capturing non-Sendable dictionary
        let options = APIResponseFormatter.parseGenerationOptions(from: payload)
        let systemPrompt = extractSystemPrompt(from: messages)
        let promptCopy = prompt
        let requestIdCopy = requestId
        
        if isStreaming {
            // Handle streaming chat completion
            Task {
                do {
                    let session = try LanguageModelSession(systemPrompt: systemPrompt)
                    var streamContext = APIResponseFormatter.StreamContext()
                    
                    for try await accumulatedContent in session.streamResponseDirect(to: promptCopy, options: options) {
                        let deltaContent = streamContext.processAccumulatedContent(accumulatedContent)
                        
                        // Send role chunk on first message
                        if streamContext.isFirstChunk {
                            let roleChunkMessage: [String: Any] = [
                                "requestId": requestIdCopy,
                                "type": "streamChunk",
                                "payload": APIResponseFormatter.streamChunk(
                                    id: streamContext.id,
                                    role: "assistant",
                                    timestamp: streamContext.timestamp
                                )
                            ]
                            sendMessage(roleChunkMessage)
                            streamContext.isFirstChunk = false
                        }
                        
                        // Send content chunk (if we have content)
                        if !deltaContent.isEmpty {
                            let chunkMessage: [String: Any] = [
                                "requestId": requestIdCopy,
                                "type": "streamChunk",
                                "payload": APIResponseFormatter.streamChunk(
                                    id: streamContext.id,
                                    content: deltaContent,
                                    timestamp: streamContext.timestamp
                                )
                            ]
                            sendMessage(chunkMessage)
                        }
                    }
                    
                    let endMessage: [String: Any] = [
                        "requestId": requestIdCopy,
                        "type": "streamEnd",
                        "payload": APIResponseFormatter.streamChunk(
                            id: streamContext.id,
                            isLast: true,
                            timestamp: streamContext.timestamp
                        )
                    ]
                    sendMessage(endMessage)
                    
                } catch {
                    sendStructuredError(error, requestId: requestIdCopy)
                }
            }
        } else {
            // Handle non-streaming chat completion
            Task {
                do {
                    let session = try LanguageModelSession(systemPrompt: systemPrompt)
                    let response = try await session.generateResponseDirect(to: promptCopy, options: options)
                    
                    let responseMessage: [String: Any] = [
                        "requestId": requestIdCopy,
                        "type": "completionResponse", 
                        "payload": APIResponseFormatter.completionResponse(content: response)
                    ]
                    
                    sendMessage(responseMessage)
                } catch {
                    sendStructuredError(error, requestId: requestIdCopy)
                }
            }
        }
    }
    
    private func convertMessagesToPrompt(_ messages: [[String: Any]]) -> String {
        var prompt = ""
        for message in messages {
            if let role = message["role"] as? String,
               let content = message["content"] as? String {
                switch role {
                case "system":
                    // System messages are handled separately
                    continue
                case "user":
                    prompt += "User: \(content)\n\n"
                case "assistant":
                    prompt += "Assistant: \(content)\n\n"
                default:
                    prompt += "\(content)\n\n"
                }
            }
        }
        return prompt.trimmingCharacters(in: .whitespacesAndNewlines)
    }
    
    private func extractSystemPrompt(from messages: [[String: Any]]) -> String? {
        for message in messages {
            if let role = message["role"] as? String,
               let content = message["content"] as? String,
               role == "system" {
                return content
            }
        }
        return nil
    }

    private func sendError(_ message: String, requestId: String? = nil) {
        var errorMessage: [String: Any] = [
            "type": "error",
            "payload": [
                "error": [
                    "message": message,
                    "type": "native_error",
                    "param": NSNull(),
                    "code": "native_error"
                ]
            ]
        ]
        
        if let requestId = requestId {
            errorMessage["requestId"] = requestId
        }
        
        sendMessage(errorMessage)
    }
    
    private func sendStructuredError(_ error: Error, requestId: String) {
        let errorMessage: [String: Any] = [
            "requestId": requestId,
            "type": "error",
            "payload": APIResponseFormatter.errorResponse(error: error)
        ]
        
        sendMessage(errorMessage)
    }
    
    private func sendStructuredSessionError(_ error: Error, requestId: String, sessionId: String) {
        var errorPayload = APIResponseFormatter.errorResponse(error: error)
        errorPayload["sessionId"] = sessionId
        
        let errorMessage: [String: Any] = [
            "requestId": requestId,
            "type": "error",
            "payload": errorPayload
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
