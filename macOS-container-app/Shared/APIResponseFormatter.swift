import Foundation

public struct APIResponseFormatter {
    
    // MARK: - Response Types
    
    public static func availabilityResponse(available: Bool) -> [String: Any] {
        [
            "id": "availability-\(UUID().uuidString.prefix(8))",
            "object": "availability.check",
            "created": Int(Date().timeIntervalSince1970),
            "available": available,
            "reason": available ? "Ready" : "LLM framework not available"
        ]
    }
    
    public static func completionResponse(content: String, id: String? = nil) -> [String: Any] {
        let responseId = id ?? "chatcmpl-\(UUID().uuidString.prefix(8))"
        return [
            "id": responseId,
            "object": "chat.completion",
            "created": Int(Date().timeIntervalSince1970),
            "choices": [[
                "index": 0,
                "message": [
                    "role": "assistant",
                    "content": content
                ],
                "finish_reason": "stop"
            ]]
        ]
    }
    
    public static func streamChunk(
        id: String,
        content: String? = nil,
        role: String? = nil,
        isLast: Bool = false,
        timestamp: Int? = nil
    ) -> [String: Any] {
        var delta: [String: Any] = [:]
        
        if let role = role {
            delta["role"] = role
        }
        
        if let content = content, !content.isEmpty {
            delta["content"] = content
        }
        
        if isLast {
            delta = [:]
        }
        
        return [
            "id": id,
            "object": "chat.completion.chunk",
            "created": timestamp ?? Int(Date().timeIntervalSince1970),
            "choices": [[
                "index": 0,
                "delta": delta,
                "finish_reason": isLast ? "stop" : NSNull()
            ]]
        ]
    }
    
    public static func errorResponse(error: Error, id: String? = nil) -> [String: Any] {
        let (message, errorCode) = formatError(error)
        let responseId = id ?? "error-\(UUID().uuidString.prefix(8))"
        
        return [
            "id": responseId,
            "object": "error",
            "created": Int(Date().timeIntervalSince1970),
            "error": [
                "message": message,
                "type": errorCode,
                "param": NSNull(),
                "code": errorCode
            ]
        ]
    }
    
    // MARK: - Stream Response Collection (Safari-style)
    
    public static func completeStreamResponse(
        chunks: [[String: Any]],
        fullResponse: String,
        id: String,
        timestamp: Int
    ) -> [String: Any] {
        [
            "id": id,
            "object": "chat.completion.stream",
            "created": timestamp,
            "chunks": chunks,
            "fullResponse": completionResponse(content: fullResponse, id: id)
        ]
    }
    
    // MARK: - Generation Options Parsing
    
    public static func parseGenerationOptions(from payload: [String: Any]) -> GenerationOptions {
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
                options.samplingMode = .topP()
            case "top-k":
                options.samplingMode = .topK()
            case "greedy":
                options.samplingMode = .greedy
            default:
                break
            }
        }
        
        return options
    }
    
    // MARK: - Error Formatting
    
    private static func formatError(_ error: Error) -> (message: String, code: String) {
        if let languageModelError = error as? LanguageModelError {
            switch languageModelError {
            case .assetsUnavailable:
                return (languageModelError.userFriendlyMessage, "assets_unavailable")
            case .contextWindowExceeded:
                return (languageModelError.userFriendlyMessage, "context_window_exceeded")
            case .guardrailViolation:
                return (languageModelError.userFriendlyMessage, "guardrail_violation")
            case .decodingFailure:
                return (languageModelError.userFriendlyMessage, "decoding_failure")
            case .unsupportedGuide:
                return (languageModelError.userFriendlyMessage, "unsupported_guide")
            case .sessionNotAvailable:
                return (languageModelError.userFriendlyMessage, "session_not_available")
            case .generationFailed:
                return (languageModelError.userFriendlyMessage, "generation_failed")
            }
        }
        
        return ("An unexpected error occurred: \(error.localizedDescription)", "internal_error")
    }
    
    // MARK: - Stream Helpers
    
    public struct StreamContext {
        public let id: String
        public let timestamp: Int
        public var previousContent: String = ""
        public var isFirstChunk: Bool = true
        
        public init(id: String? = nil) {
            self.id = id ?? "chatcmpl-\(UUID().uuidString.prefix(8))"
            self.timestamp = Int(Date().timeIntervalSince1970)
        }
        
        public mutating func processAccumulatedContent(_ accumulatedContent: String) -> String {
            let deltaContent = String(accumulatedContent.dropFirst(previousContent.count))
            previousContent = accumulatedContent
            return deltaContent
        }
    }
}