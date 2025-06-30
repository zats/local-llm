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
        transcript.append("User: \(prompt)")
        
        guard let session = session else {
            throw LanguageModelError.sessionNotAvailable("No session found")
        }
        
        let generationOptions = FoundationModels.GenerationOptions(
            temperature: options.temperature,
            maximumResponseTokens: options.maximumResponseTokens
        )
        
        let response = try await session.respond(to: prompt, options: generationOptions)
        let responseText = response.content
        transcript.append("Assistant: \(responseText)")
        return responseText
    }
    
    public func streamResponse(to prompt: String, options: GenerationOptions) -> AsyncThrowingStream<String, Error> {
        return AsyncThrowingStream { continuation in
            Task {
                self.transcript.append("User: \(prompt)")
                
                guard let session = self.session else {
                    continuation.finish(throwing: LanguageModelError.sessionNotAvailable("No session found when streaming response"))
                    return
                }
                
                let generationOptions = FoundationModels.GenerationOptions(
                    temperature: options.temperature,
                    maximumResponseTokens: options.maximumResponseTokens
                )
                
                do {
                    let responseStream = session.streamResponse(to: prompt, options: generationOptions)
                    var fullResponse = ""
                    
                    for try await token in responseStream {
                        fullResponse += token
                        continuation.yield(token)
                    }
                    
                    self.transcript.append("Assistant: \(fullResponse)")
                    continuation.finish()
                    
                } catch {
                    continuation.finish(throwing: LanguageModelError.generationFailed(error.localizedDescription))
                }
            }
        }
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
