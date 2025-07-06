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
        let available = LanguageModelSession.isAvailable()
        return APIResponseFormatter.availabilityResponse(available: available)
    }
    
    func getCompletion(prompt: String, options: [String: Any] = [:]) async -> [String: Any] {
        // Extract options
        let generationOptions = APIResponseFormatter.parseGenerationOptions(from: options)
        let systemPrompt = options["systemPrompt"] as? String
        
        os_log(.default, "Generating completion for prompt: %@ (temp: %f, maxTokens: %d)", prompt, generationOptions.temperature, generationOptions.maximumResponseTokens)
        
        do {
            // Create session with optional system prompt
            let session = try LanguageModelSession(systemPrompt: systemPrompt)
            
            // Generate response
            let response = try await session.generateResponseDirect(to: prompt, options: generationOptions)
            return APIResponseFormatter.completionResponse(content: response)
        } catch {
            os_log(.error, "Error generating completion: %@", error.localizedDescription)
            return APIResponseFormatter.errorResponse(error: error)
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
                let generationOptions = APIResponseFormatter.parseGenerationOptions(from: options)
                let systemPrompt = options["systemPrompt"] as? String
                
                os_log(.default, "Starting streaming completion for prompt: %@ (temp: %f, maxTokens: %d)", prompt, generationOptions.temperature, generationOptions.maximumResponseTokens)
                
                // Create session with optional system prompt
                let session = try LanguageModelSession(systemPrompt: systemPrompt)
                
                // Collect all chunks like Chrome does, but send as batch
                var chunks: [[String: Any]] = []
                
                // Add initial role chunk
                let roleChunk = APIResponseFormatter.streamChunk(id: id, role: "assistant", timestamp: timestamp)
                chunks.append(roleChunk)
                
                // Collect content chunks as they arrive
                var streamContext = APIResponseFormatter.StreamContext(id: id)
                for try await accumulatedContent in session.streamResponseDirect(to: prompt, options: generationOptions) {
                    // Check if task was cancelled
                    if Task.isCancelled {
                        break
                    }
                    
                    // Calculate the delta (new content only)
                    let deltaContent = streamContext.processAccumulatedContent(accumulatedContent)
                    
                    // Add content chunk (if we have content)
                    if !deltaContent.isEmpty {
                        let streamChunk = APIResponseFormatter.streamChunk(id: id, content: deltaContent, timestamp: timestamp)
                        chunks.append(streamChunk)
                    }
                }
                
                // Add final chunk
                if !Task.isCancelled {
                    let finalChunk = APIResponseFormatter.streamChunk(id: id, isLast: true, timestamp: timestamp)
                    chunks.append(finalChunk)
                    
                    // Send complete streaming response as a single message
                    sendCompleteStreamResponse(
                        chunks: chunks,
                        fullResponse: streamContext.previousContent,
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
            "data": APIResponseFormatter.completeStreamResponse(
                chunks: chunks,
                fullResponse: fullResponse,
                id: id,
                timestamp: timestamp
            )
        ]
        
        response.userInfo = [ SFExtensionMessageKey: responseDict ]
        context.completeRequest(returningItems: [ response ], completionHandler: nil)
        
        os_log(.default, "Sent complete stream response for request: %@", requestId)
    }
    
    private func sendStreamChunkToPage(chunk: [String: Any], requestId: String) async {
        await MainActor.run {
            sendMessageToActivePage(messageData: [
                "requestId": requestId,
                "type": "streamChunk",
                "chunk": chunk
            ], messageName: "nativeStreamChunk")
            os_log(.default, "Sent stream chunk to page for request: %@", requestId)
        }
    }
    
    private func sendStreamErrorToPage(error: String, requestId: String) async {
        await MainActor.run {
            sendMessageToActivePage(messageData: [
                "requestId": requestId,
                "type": "streamError",
                "error": error
            ], messageName: "nativeStreamChunk")
            os_log(.error, "Sent stream error to page for request: %@", requestId)
        }
    }
    
    // MARK: - Unified messaging helper
    
    private func sendMessageToActivePage(messageData: [String: Any], messageName: String) {
        #if os(macOS)
        SFSafariApplication.getActiveWindow { window in
            window?.getActiveTab { tab in
                tab?.getActivePage { page in
                    page?.dispatchMessageToScript(withName: messageName, userInfo: messageData)
                }
            }
        }
        #else
        // On iOS, Safari extension communication works differently
        // The extension context approach used in SafariWebExtensionHandler is the primary communication method
        // Real-time streaming to pages is handled through the extension context response system
        // This is a design difference between macOS and iOS Safari extensions
        os_log(.info, "iOS Safari extension uses extension context for communication, not direct page messaging")
        #endif
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

