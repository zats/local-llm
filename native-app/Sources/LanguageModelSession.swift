import Foundation
import FoundationModels

public class LanguageModelSession: @unchecked Sendable {
    private var session: FoundationModels.LanguageModelSession?
    private var transcript: [String] = []
    
    public init() throws {
        // Check if Foundation Models is available
        guard Self.isAvailable() else {
            throw LanguageModelError.sessionNotAvailable("Can't initialize LanguageModelSession; it is unavailable")
        }
        
        self.session = FoundationModels.LanguageModelSession()
    }
    
    public static func isAvailable() -> Bool {
        SystemLanguageModel.default.isAvailable
    }
    
    public func generateResponse(to prompt: String, options: GenerationOptions) async throws -> String {
        guard let session = session else {
            throw LanguageModelError.sessionNotAvailable("No session found")
        }
        
        let generationOptions = FoundationModels.GenerationOptions(
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
                    continuation.finish(throwing: LanguageModelError.generationFailed(error.localizedDescription))
                }
            }
        }
    }
    
    private func buildConversationContext(newPrompt: String) -> String {
        // If this is the first message, just return the prompt
        if transcript.isEmpty {
            return newPrompt
        }
        
        // Build the full conversation context
        var context = transcript.joined(separator: "\n")
        context += "\nUser: \(newPrompt)"
        
        return context
    }
}

public enum LanguageModelError: Error, LocalizedError {
    case sessionNotAvailable(String)
    case generationFailed(String)
    
    public var errorDescription: String? {
        switch self {
        case .sessionNotAvailable(let reason):
            return "Foundation Models framework is not available: \(reason)"
        case .generationFailed(let message):
            return "Language model generation failed: \(message)"
        }
    }
}

public struct GenerationOptions: Sendable {
    public var temperature: Double = 0.8
    public var maximumResponseTokens: Int = 512
    public var samplingMode: SamplingMode = .topP
    
    public init() {}
    
    public enum SamplingMode: Sendable {
        case topP
        case topK
        case greedy
    }
}
