//
//  SafariWebExtensionHandler.swift
//  SafariExtensionApp Extension
//
//  Created by Sash Zats on 7/2/25.
//

import SafariServices
import os.log
import Foundation

struct NativeFoundationModelsRequest: Codable {
    let action: String
    let requestId: String
    let data: [String: AnyCodable]
}

struct NativeFoundationModelsResponse: Codable {
    let requestId: String
    let type: String?
    let data: AnyCodable?
    let error: String?
}

struct AnyCodable: Codable {
    let value: Any

    init(_ value: Any) {
        self.value = value
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let intValue = try? container.decode(Int.self) {
            value = intValue
        } else if let doubleValue = try? container.decode(Double.self) {
            value = doubleValue
        } else if let stringValue = try? container.decode(String.self) {
            value = stringValue
        } else if let boolValue = try? container.decode(Bool.self) {
            value = boolValue
        } else if let arrayValue = try? container.decode([AnyCodable].self) {
            value = arrayValue.map { $0.value }
        } else if let dictValue = try? container.decode([String: AnyCodable].self) {
            value = dictValue.mapValues { $0.value }
        } else {
            value = NSNull()
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        if let intValue = value as? Int {
            try container.encode(intValue)
        } else if let doubleValue = value as? Double {
            try container.encode(doubleValue)
        } else if let stringValue = value as? String {
            try container.encode(stringValue)
        } else if let boolValue = value as? Bool {
            try container.encode(boolValue)
        } else if let arrayValue = value as? [Any] {
            try container.encode(arrayValue.map { AnyCodable($0) })
        } else if let dictValue = value as? [String: Any] {
            try container.encode(dictValue.mapValues { AnyCodable($0) })
        } else {
            try container.encodeNil()
        }
    }
}

class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    
    private let nativeFoundationModels = NativeFoundationModelsService()

    func beginRequest(with context: NSExtensionContext) {
        let request = context.inputItems.first as? NSExtensionItem

        let profile = request?.userInfo?[SFExtensionProfileKey] as? UUID
        let message = request?.userInfo?[SFExtensionMessageKey]

        os_log(.default, "Received message from browser.runtime.sendNativeMessage: %@ (profile: %@)", String(describing: message), profile?.uuidString ?? "none")

        // Handle NativeFoundationModels API requests
        if let messageDict = message as? [String: Any],
           let action = messageDict["action"] as? String,
           let requestId = messageDict["requestId"] as? String {
            
            Task {
                await handleNativeFoundationModelsRequest(
                    action: action,
                    requestId: requestId,
                    data: messageDict["data"] as? [String: Any] ?? [:],
                    context: context
                )
            }
            return
        }

        // Legacy echo response
        let response = NSExtensionItem()
        response.userInfo = [ SFExtensionMessageKey: [ "echo": message ] ]
        context.completeRequest(returningItems: [ response ], completionHandler: nil)
    }
    
    private func handleNativeFoundationModelsRequest(
        action: String,
        requestId: String,
        data: [String: Any],
        context: NSExtensionContext
    ) async {
        os_log(.default, "Handling NativeFoundationModels request: %@ (ID: %@)", action, requestId)
        
        do {
            let responseData: Any
            let type: String
            
            switch action {
            case "checkAvailability":
                responseData = await nativeFoundationModels.checkAvailability()
                type = "availabilityResponse"

            case "getCompletion":
                let prompt = data["prompt"] as? String ?? ""
                let options = data["options"] as? [String: Any] ?? [:]
                responseData = await nativeFoundationModels.getCompletion(prompt: prompt, options: options)
                type = "completionResponse"

            case "getCompletionStream":
                let prompt = data["prompt"] as? String ?? ""
                let options = data["options"] as? [String: Any] ?? [:]
                await nativeFoundationModels.getCompletionStream(
                    prompt: prompt,
                    options: options,
                    requestId: requestId,
                    context: context
                )
                return
                
            case "cancelStream":
                nativeFoundationModels.cancelStream(requestId: requestId)
                responseData = ["success": true]
                type = "streamEnd"
                
            case "chatCompletion":
                let messages = data["messages"] as? [[String: Any]] ?? []
                let options = data
                let stream = data["stream"] as? Bool ?? false
                
                if stream {
                    await nativeFoundationModels.getChatCompletionStream(
                        messages: messages,
                        options: options,
                        requestId: requestId,
                        context: context
                    )
                    return
                } else {
                    responseData = await nativeFoundationModels.getChatCompletion(
                        messages: messages,
                        options: options
                    )
                    type = "completionResponse"
                }
                
            default:
                throw NSError(domain: "NativeFoundationModels", code: 400, userInfo: [
                    NSLocalizedDescriptionKey: "Unknown action: \(action)"
                ])
            }
            
            sendResponse(requestId: requestId, type: type, data: responseData, context: context)
            
        } catch {
            os_log(.error, "Error handling request %@: %@", requestId, error.localizedDescription)
            sendResponse(requestId: requestId, type: "error", error: error.localizedDescription, context: context)
        }
    }
    
    private func sendResponse(requestId: String, type: String, data: Any? = nil, error: String? = nil, context: NSExtensionContext) {
        let response = NSExtensionItem()
        let responseDict: [String: Any] = [
            "requestId": requestId,
            "type": type,
            "payload": data as Any,
            "error": error as Any
        ]
        
        response.userInfo = [ SFExtensionMessageKey: responseDict ]
        context.completeRequest(returningItems: [ response ], completionHandler: nil)
    }
}
