//
//  SimpleChatSessionManager.swift
//
//  Created by Sash Zats on 6/30/25.
//

import Foundation
import Combine
import FoundationModels

struct ChatMessage: Identifiable, Codable {
    let id: UUID
    let role: MessageRole
    let content: String
    let timestamp: Date
    
    enum MessageRole: String, Codable {
        case system = "system"
        case user = "user" 
        case assistant = "assistant"
    }
    
    init(role: MessageRole, content: String, timestamp: Date) {
        self.id = UUID()
        self.role = role
        self.content = content
        self.timestamp = timestamp
    }
    
    init(id: UUID, role: MessageRole, content: String, timestamp: Date) {
        self.id = id
        self.role = role
        self.content = content
        self.timestamp = timestamp
    }
}

@MainActor
class SimpleChatSessionManager: ObservableObject {
    @Published var messages: [ChatMessage] = []
    @Published var isLoading = false
    @Published var isAvailable = false
    @Published var systemPrompt = "You are a helpful assistant."
    @Published var errorMessage: String?
    
    private var session: FoundationModels.LanguageModelSession?
    
    init() {
        checkAvailability()
    }
    
    func checkAvailability() {
        isAvailable = SystemLanguageModel.default.isAvailable
    }
    
    func createNewSession() {
        do {
            if systemPrompt.isEmpty {
                session = FoundationModels.LanguageModelSession()
            } else {
                let instructions = Instructions(systemPrompt)
                session = FoundationModels.LanguageModelSession(instructions: instructions)
            }
            messages.removeAll()
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
            session = nil
        }
    }
    
    func sendMessage(_ content: String) {
        guard !content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        
        let userMessage = ChatMessage(role: .user, content: content, timestamp: Date())
        messages.append(userMessage)
        
        Task {
            await generateResponse(for: content)
        }
    }
    
    func streamMessage(_ content: String) {
        guard !content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        
        let userMessage = ChatMessage(role: .user, content: content, timestamp: Date())
        messages.append(userMessage)
        
        Task {
            await streamResponse(for: content)
        }
    }
    
    private func generateResponse(for prompt: String) async {
        guard let session = session else {
            await MainActor.run {
                errorMessage = "No active session. Please create a new session."
            }
            return
        }
        
        await MainActor.run {
            isLoading = true
            errorMessage = nil
        }
        
        do {
            let options = FoundationModels.GenerationOptions()
            let response = try await session.respond(to: prompt, options: options)
            
            await MainActor.run {
                let assistantMessage = ChatMessage(role: .assistant, content: response.content, timestamp: Date())
                messages.append(assistantMessage)
                isLoading = false
            }
            
        } catch {
            await MainActor.run {
                errorMessage = "Generation failed: \(error.localizedDescription)"
                isLoading = false
            }
        }
    }
    
    private func streamResponse(for prompt: String) async {
        guard let session = session else {
            await MainActor.run {
                errorMessage = "No active session. Please create a new session."
            }
            return
        }
        
        await MainActor.run {
            isLoading = true
            errorMessage = nil
        }
        
        do {
            let options = FoundationModels.GenerationOptions()
            let responseStream = session.streamResponse(to: prompt, options: options)
            
            // Create initial assistant message with fixed ID
            let messageId = UUID()
            let timestamp = Date()
            let assistantMessage = ChatMessage(id: messageId, role: .assistant, content: "", timestamp: timestamp)
            
            await MainActor.run {
                messages.append(assistantMessage)
                isLoading = false
            }
            
            var fullResponse = ""
            var isFirstToken = true
            
            for try await token in responseStream {
                // Debug logging to understand the token behavior
                print("DEBUG: Received token: '\(token)'")
                print("DEBUG: Token length: \(token.count)")
                
                // Check if this might be cumulative content rather than delta
                if isFirstToken {
                    fullResponse = token
                    isFirstToken = false
                    print("DEBUG: First token - setting fullResponse to: '\(fullResponse)'")
                } else {
                    // Check if token is cumulative by seeing if it contains our previous response
                    if token.hasPrefix(fullResponse) {
                        // This is cumulative content, use it directly
                        fullResponse = token
                        print("DEBUG: Cumulative token detected - fullResponse: '\(fullResponse)'")
                    } else {
                        // This is delta content, append it
                        fullResponse += token
                        print("DEBUG: Delta token detected - fullResponse: '\(fullResponse)'")
                    }
                }
                
                await MainActor.run {
                    // Update the message with the same ID
                    if let lastIndex = messages.lastIndex(where: { $0.id == messageId }) {
                        let updatedMessage = ChatMessage(
                            id: messageId,
                            role: .assistant,
                            content: fullResponse,
                            timestamp: timestamp
                        )
                        messages[lastIndex] = updatedMessage
                    }
                }
            }
            
        } catch {
            await MainActor.run {
                errorMessage = "Streaming failed: \(error.localizedDescription)"
                isLoading = false
            }
        }
    }
    
    func clearChat() {
        messages.removeAll()
        errorMessage = nil
    }
    
    func updateSystemPrompt(_ newPrompt: String) {
        systemPrompt = newPrompt
        createNewSession()
    }
    
    // Generate JavaScript code equivalent for the current conversation
    func generateJavaScriptCode() -> String {
        var jsCode = "// Check if localLLM is available\n"
        jsCode += "if (!(await window.localLLM?.available())) {\n"
        jsCode += "  console.log('Local LLM unavailable - please install the LocalLLM app');\n"
        jsCode += "  return;\n"
        jsCode += "}\n\n"
        
        jsCode += "console.log('LocalLLM ready! 🚀');\n\n"
        
        // Build messages array for the current conversation
        var apiMessages: [[String: String]] = []
        if !systemPrompt.isEmpty {
            apiMessages.append(["role": "system", "content": systemPrompt])
        }
        
        // Include conversation messages if any exist
        for message in messages {
            apiMessages.append([
                "role": message.role.rawValue,
                "content": message.content
            ])
        }
        
        // If no conversation messages, add a sample message
        if messages.isEmpty {
            apiMessages.append(["role": "user", "content": "Hello! Can you help me?"])
        }
        
        jsCode += "// Configuration and messages\n"
        jsCode += "const messages = \(formatMessagesAsJS(apiMessages));\n\n"
                
        jsCode += "// Streaming completion (alternative)\n"
        jsCode += "const stream = await window.localLLM.chat.completions.create({\n"
        jsCode += "  messages: messages,\n"
        jsCode += "  stream: true\n"
        jsCode += "});\n\n"
        
        jsCode += "console.log('Streaming response:');\n"
        jsCode += "for await (const chunk of stream) {\n"
        jsCode += "  const delta = chunk.choices[0]?.delta?.content;\n"
        jsCode += "  if (delta) {\n"
        jsCode += "    process.stdout.write(delta); // Or append to your UI\n"
        jsCode += "  }\n"
        jsCode += "}\n"
        jsCode += "console.log('\\n--- End of response ---');"
        
        return jsCode
    }
    
    private func formatMessagesAsJS(_ messages: [[String: String]]) -> String {
        let jsonData = try! JSONSerialization.data(withJSONObject: messages, options: [.prettyPrinted])
        return String(data: jsonData, encoding: .utf8)!
    }
}
