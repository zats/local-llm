//
//  NativeFoundationModelsService.swift
//  SafariExtensionApp Extension
//
//  Created by Sash Zats on 7/2/25.
//

import Foundation
import SafariServices
import os.log

class NativeFoundationModelsService {
    private var activeStreams: [String: Task<Void, Never>] = [:]
    private var sessions: [String: LanguageModelSession] = [:]
    
    // MARK: - Public API
    
    func checkAvailability() async -> [String: Any] {
        let timestamp = Int(Date().timeIntervalSince1970)
        let id = "availability-\(UUID().uuidString.prefix(8))"
        let available = LanguageModelSession.isAvailable()
        
        return [
            "id": id,
            "object": "availability.check",
            "created": timestamp,
            "available": available,
            "reason": available ? "Ready" : "LLM framework not available"
        ]
    }
    
    func getCompletion(prompt: String, options: [String: Any] = [:]) async -> [String: Any] {
        let timestamp = Int(Date().timeIntervalSince1970)
        let id = "chatcmpl-\(UUID().uuidString.prefix(8))"
        
        // Extract options
        let temperature = options["temperature"] as? Double ?? 0.8
        let maxTokens = options["maximumResponseTokens"] as? Int ?? 512
        let systemPrompt = options["systemPrompt"] as? String
        
        os_log(.default, "Generating completion for prompt: %@ (temp: %f, maxTokens: %d)", prompt, temperature, maxTokens)
        
        do {
            // Create session with optional system prompt
            let session = try LanguageModelSession(systemPrompt: systemPrompt)
            
            // Create generation options
            var generationOptions = GenerationOptions()
            generationOptions.temperature = temperature
            generationOptions.maximumResponseTokens = maxTokens
            
            // Generate response
            let response = try await session.generateResponseDirect(to: prompt, options: generationOptions)            
            return [
                "id": id,
                "object": "chat.completion",
                "created": timestamp,
                "choices": [[
                    "index": 0,
                    "message": [
                        "role": "assistant",
                        "content": response
                    ],
                    "finish_reason": "stop"
                ]]
            ]
        } catch let error as LanguageModelError {
            os_log(.error, "Language model error: %@", error.userFriendlyMessage)
            return [
                "id": id,
                "object": "chat.completion",
                "created": timestamp,
                "error": [
                    "message": error.userFriendlyMessage,
                    "type": "language_model_error"
                ]
            ]
        } catch {
            os_log(.error, "Unexpected error: %@", error.localizedDescription)
            return [
                "id": id,
                "object": "chat.completion",
                "created": timestamp,
                "error": [
                    "message": "An unexpected error occurred: \(error.localizedDescription)",
                    "type": "internal_error"
                ]
            ]
        }
    }
    
    func getCompletionStream(
        prompt: String,
        options: [String: Any] = [:],
        requestId: String,
        context: NSExtensionContext
    ) async {
        let task = Task {
            do {
                let timestamp = Int(Date().timeIntervalSince1970)
                let id = "chatcmpl-\(UUID().uuidString.prefix(8))"
                
                // Extract options
                let temperature = options["temperature"] as? Double ?? 0.8
                let maxTokens = options["maximumResponseTokens"] as? Int ?? 512
                let systemPrompt = options["systemPrompt"] as? String
                
                os_log(.default, "Starting streaming completion for prompt: %@ (temp: %f, maxTokens: %d)", prompt, temperature, maxTokens)
                
                // Create session with optional system prompt
                let session = try LanguageModelSession(systemPrompt: systemPrompt)
                
                // Create generation options
                var generationOptions = GenerationOptions()
                generationOptions.temperature = temperature
                generationOptions.maximumResponseTokens = maxTokens
                
                // Collect all chunks like Chrome does, but send as batch
                var chunks: [[String: Any]] = []
                
                // Add initial role chunk
                let roleChunk = createStreamChunk(id: id, content: "", timestamp: timestamp, role: "assistant")
                chunks.append(roleChunk)
                
                // Collect content chunks as they arrive
                var previousContent = ""
                for try await accumulatedContent in session.streamResponseDirect(to: prompt, options: generationOptions) {
                    // Check if task was cancelled
                    if Task.isCancelled {
                        break
                    }
                    
                    // Calculate the delta (new content only)
                    let deltaContent = String(accumulatedContent.dropFirst(previousContent.count))
                    previousContent = accumulatedContent
                    
                    // Add content chunk (if we have content)
                    if !deltaContent.isEmpty {
                        let streamChunk = createStreamChunk(id: id, content: deltaContent, timestamp: timestamp)
                        chunks.append(streamChunk)
                    }
                }
                
                // Add final chunk
                if !Task.isCancelled {
                    let finalChunk = createStreamChunk(id: id, content: "", timestamp: timestamp, isLast: true)
                    chunks.append(finalChunk)
                    
                    // Send complete streaming response as a single message
                    sendCompleteStreamResponse(
                        chunks: chunks,
                        fullResponse: previousContent,
                        prompt: prompt,
                        id: id,
                        timestamp: timestamp,
                        requestId: requestId,
                        context: context
                    )
                }
                
            } catch let error as LanguageModelError {
                os_log(.error, "Language model streaming error: %@", error.userFriendlyMessage)
                sendStreamError(error: error.userFriendlyMessage, requestId: requestId, context: context)
            } catch {
                os_log(.error, "Unexpected streaming error: %@", error.localizedDescription)
                sendStreamError(error: "An unexpected error occurred: \(error.localizedDescription)", requestId: requestId, context: context)
            }
            
            // Clean up
            activeStreams.removeValue(forKey: requestId)
        }
        
        activeStreams[requestId] = task
        await task.value
    }
    
    func cancelStream(requestId: String) {
        activeStreams[requestId]?.cancel()
        activeStreams.removeValue(forKey: requestId)
        os_log(.default, "Cancelled stream: %@", requestId)
    }
    
    // MARK: - Private Methods
    
    private func createStreamChunk(id: String, content: String, timestamp: Int, role: String? = nil, isLast: Bool = false) -> [String: Any] {
        var delta: [String: Any] = [:]
        
        if let role = role {
            delta["role"] = role
        }
        
        if !content.isEmpty {
            delta["content"] = content
        }
        
        if isLast {
            delta = [:]
        }
        
        return [
            "id": id,
            "object": "chat.completion.chunk",
            "created": timestamp,
            "choices": [[
                "index": 0,
                "delta": delta,
                "finish_reason": isLast ? "stop" : NSNull()
            ]]
        ]
    }
    
    private func sendCompleteStreamResponse(
        chunks: [[String: Any]],
        fullResponse: String,
        prompt: String,
        id: String,
        timestamp: Int,
        requestId: String,
        context: NSExtensionContext
    ) {
        let response = NSExtensionItem()
        let responseDict: [String: Any] = [
            "requestId": requestId,
            "type": "streamResponse",
            "data": [
                "id": id,
                "object": "chat.completion.stream",
                "created": timestamp,
                "chunks": chunks,
                "fullResponse": [
                    "id": id,
                    "object": "chat.completion",
                    "created": timestamp,
                    "choices": [[
                        "index": 0,
                        "message": [
                            "role": "assistant",
                            "content": fullResponse
                        ],
                        "finish_reason": "stop"
                    ]],
                ]
            ]
        ]
        
        response.userInfo = [ SFExtensionMessageKey: responseDict ]
        context.completeRequest(returningItems: [ response ], completionHandler: nil)
        
        os_log(.default, "Sent complete stream response for request: %@", requestId)
    }
    
    private func sendStreamChunkToPage(chunk: [String: Any], requestId: String) async {
        await MainActor.run {
            #if os(macOS)
            SFSafariApplication.getActiveWindow { window in
                window?.getActiveTab { tab in
                    tab?.getActivePage { page in
                        let messageData: [String: Any] = [
                            "requestId": requestId,
                            "type": "streamChunk",
                            "chunk": chunk
                        ]
                        page?.dispatchMessageToScript(withName: "nativeStreamChunk", userInfo: messageData)
                        os_log(.default, "Sent stream chunk to page for request: %@", requestId)
                    }
                }
            }
#else
#warning("Sending info back to safari on iOS is unimplemented")
#endif
        }
    }
    
    private func sendStreamErrorToPage(error: String, requestId: String) async {
        await MainActor.run {
#if os(macOS)
            SFSafariApplication.getActiveWindow { window in
                window?.getActiveTab { tab in
                    tab?.getActivePage { page in
                        let messageData: [String: Any] = [
                            "requestId": requestId,
                            "type": "streamError",
                            "error": error
                        ]
                        page?.dispatchMessageToScript(withName: "nativeStreamChunk", userInfo: messageData)
                        os_log(.error, "Sent stream error to page for request: %@", requestId)
                    }
                }
            }
#else
#warning("Sending info back to safari on iOS is unimplemented")
#endif
        }
    }
    
    private func sendStreamError(error: String, requestId: String, context: NSExtensionContext) {
        let response = NSExtensionItem()
        let responseDict: [String: Any] = [
            "requestId": requestId,
            "type": "response",
            "error": error
        ]
        
        response.userInfo = [ SFExtensionMessageKey: responseDict ]
        context.completeRequest(returningItems: [ response ], completionHandler: nil)
        
        os_log(.error, "Sent stream error for request: %@", requestId)
    }
}

