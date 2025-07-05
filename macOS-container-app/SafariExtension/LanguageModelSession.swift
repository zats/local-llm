import Foundation
import FoundationModels

public class LanguageModelSession: @unchecked Sendable {
    private var session: FoundationModels.LanguageModelSession?
    private var transcript: [String] = []
    private var systemPrompt: String?
    
    public init(systemPrompt: String? = nil) throws {
        // Check if Foundation Models is available
        guard Self.isAvailable() else {
            throw LanguageModelError.sessionNotAvailable("Can't initialize LanguageModelSession; it is unavailable")
        }
        
        self.systemPrompt = systemPrompt
        
        // Create session with instructions if system prompt is provided
        if let systemPrompt = systemPrompt, !systemPrompt.isEmpty {
            let instructions = Instructions(systemPrompt)
            self.session = FoundationModels.LanguageModelSession(instructions: instructions)
        } else {
            self.session = FoundationModels.LanguageModelSession()
        }
    }
    
    public static func isAvailable() -> Bool {
        SystemLanguageModel.default.isAvailable
    }
    
    public func generateResponse(to prompt: String, options: GenerationOptions) async throws -> String {
        guard let session = session else {
            throw LanguageModelError.sessionNotAvailable("No session found")
        }
        
        let generationOptions = FoundationModels.GenerationOptions(
            sampling: options.samplingMode.toFoundationModelsSamplingMode(),
            temperature: options.temperature,
            maximumResponseTokens: options.maximumResponseTokens
        )
        
        // Build full conversation context for the LLM
        let conversationContext = self.buildConversationContext(newPrompt: prompt)
        let response = try await session.respond(to: conversationContext, options: generationOptions)
        let responseText = response.content
        
        // Add to transcript after successful response
        transcript.append("User: \(prompt)")
        transcript.append("Assistant: \(responseText)")
        return responseText
    }
    
    public func streamResponse(to prompt: String, options: GenerationOptions) -> AsyncThrowingStream<String, Error> {
        return AsyncThrowingStream { continuation in
            Task {
                guard let session = self.session else {
                    continuation.finish(throwing: LanguageModelError.sessionNotAvailable("No session found when streaming response"))
                    return
                }
                
                let generationOptions = FoundationModels.GenerationOptions(
                    temperature: options.temperature,
                    maximumResponseTokens: options.maximumResponseTokens
                )
                
                do {
                    // Build full conversation context for the LLM
                    let conversationContext = self.buildConversationContext(newPrompt: prompt)
                    let responseStream = session.streamResponse(to: conversationContext, options: generationOptions)
                    var fullResponse = ""
                    
                    for try await token in responseStream {
                        fullResponse += token
                        continuation.yield(token)
                    }
                    
                    // Add to transcript after successful response
                    self.transcript.append("User: \(prompt)")
                    self.transcript.append("Assistant: \(fullResponse)")
                    continuation.finish()
                    
                } catch {
                    continuation.finish(throwing: self.mapFoundationModelsError(error))
                }
            }
        }
    }
    
    public func generateResponseDirect(to prompt: String, options: GenerationOptions) async throws -> String {
        // Direct completion without conversation history for API calls
        guard let session = session else {
            throw LanguageModelError.sessionNotAvailable("No session found")
        }
        
        let generationOptions = FoundationModels.GenerationOptions(
            sampling: options.samplingMode.toFoundationModelsSamplingMode(),
            temperature: options.temperature,
            maximumResponseTokens: options.maximumResponseTokens
        )
        
        // Use prompt directly - system prompt is handled by Instructions
        let response = try await session.respond(to: prompt, options: generationOptions)
        return response.content
    }
    
    public func streamResponseDirect(to prompt: String, options: GenerationOptions) -> AsyncThrowingStream<String, Error> {
        // Direct streaming without conversation history for API calls
        return AsyncThrowingStream { continuation in
            Task {
                guard let session = self.session else {
                    continuation.finish(throwing: LanguageModelError.sessionNotAvailable("No session found when streaming response"))
                    return
                }
                
                let generationOptions = FoundationModels.GenerationOptions(
                    temperature: options.temperature,
                    maximumResponseTokens: options.maximumResponseTokens
                )
                
                do {
                    // Use prompt directly - system prompt is handled by Instructions
                    let responseStream = session.streamResponse(to: prompt, options: generationOptions)
                    
                    for try await token in responseStream {
                        continuation.yield(token)
                    }
                    
                    continuation.finish()
                    
                } catch {
                    continuation.finish(throwing: self.mapFoundationModelsError(error))
                }
            }
        }
    }
    
    private func logMessage(_ message: String) {
        let timestamp = Date()
        let logMessage = "[\(timestamp)] LanguageModelSession: \(message)\n"
        
        // Write to log file for debugging
        let logPath = "/tmp/nativefoundationmodels-native.log"
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
    
    private func buildConversationContext(newPrompt: String) -> String {
        // System prompt is now handled by Instructions in the session initialization
        // Build the conversation context without manual system prompt insertion
        
        if transcript.isEmpty {
            return "User: \(newPrompt)"
        }
        
        // Build the full conversation context
        var context = transcript.joined(separator: "\n")
        context += "\nUser: \(newPrompt)"
        
        return context
    }
    
    private func mapFoundationModelsError(_ error: Error) -> LanguageModelError {
        // Check if it's a Foundation Models specific error
        if let generationError = error as? FoundationModels.LanguageModelSession.GenerationError {
            switch generationError {
            case .assetsUnavailable(_):
                return .assetsUnavailable("Model assets are not available")
            case .decodingFailure(_):
                return .decodingFailure("Failed to decode response")
            case .exceededContextWindowSize(_):
                return .contextWindowExceeded("Conversation is too long")
            case .guardrailViolation(_):
                return .guardrailViolation("Content safety violation")
            case .unsupportedGuide(_):
                return .unsupportedGuide("Unsupported generation guide")
            case .unsupportedLanguageOrLocale(_):
                return .generationFailed("Language or locale not supported")
            case .rateLimited(_):
                return .generationFailed("Rate limited - too many requests")
            @unknown default:
                return .generationFailed("Unknown Foundation Models error: \(error.localizedDescription)")
            }
        }
        
        // Fallback for other errors
        return .generationFailed(error.localizedDescription)
    }
}

public enum LanguageModelError: Error, LocalizedError {
    case sessionNotAvailable(String)
    case generationFailed(String)
    case assetsUnavailable(String)
    case contextWindowExceeded(String)
    case guardrailViolation(String)
    case decodingFailure(String)
    case unsupportedGuide(String)
    
    public var errorDescription: String? {
        switch self {
        case .sessionNotAvailable(let reason):
            return "Foundation Models framework is not available: \(reason)"
        case .generationFailed(let message):
            return "Language model generation failed: \(message)"
        case .assetsUnavailable(let message):
            return "Model assets are unavailable: \(message)"
        case .contextWindowExceeded(let message):
            return "Context window size exceeded: \(message)"
        case .guardrailViolation(let message):
            return "Content safety violation: \(message)"
        case .decodingFailure(let message):
            return "Response decoding failed: \(message)"
        case .unsupportedGuide(let message):
            return "Unsupported generation guide: \(message)"
        }
    }
    
    public var userFriendlyMessage: String {
        switch self {
        case .sessionNotAvailable:
            return "Apple Intelligence is not available on this device or is disabled. Please enable it in Settings."
        case .assetsUnavailable:
            return "The AI model is currently downloading or unavailable. Please try again later."
        case .contextWindowExceeded:
            return "The conversation is too long. Please start a new chat to continue."
        case .guardrailViolation:
            return "This request contains content that cannot be processed for safety reasons."
        case .decodingFailure:
            return "There was an issue processing the AI response. Please try again."
        case .unsupportedGuide:
            return "The requested output format is not supported."
        case .generationFailed:
            return "The AI encountered an error while generating a response. Please try again."
        }
    }
}

public struct GenerationOptions: Sendable {
    public var temperature: Double = 0.8
    public var maximumResponseTokens: Int = 512
    public var samplingMode: SamplingMode = .topP()
    
    public init() {}
    
    public enum SamplingMode: Sendable {
        case topP(probabilityThreshold: Double = 0.9, seed: UInt64? = nil)
        case topK(count: Int = 50, seed: UInt64? = nil)
        case greedy
        
        func toFoundationModelsSamplingMode() -> FoundationModels.GenerationOptions.SamplingMode {
            switch self {
            case .topP(let threshold, let seed):
                return .random(probabilityThreshold: threshold, seed: seed)
            case .topK(let count, let seed):
                return .random(top: count, seed: seed)
            case .greedy:
                return .greedy
            }
        }
    }
}