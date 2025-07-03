// Background script for NativeFoundationModels Extension

// Log when extension is installed or started
browser.runtime.onInstalled.addListener(() => {
    // Extension installed/updated
});

browser.runtime.onStartup.addListener(() => {
    // Extension started
});

// Handle messages from content scripts
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {

    // Legacy greeting support
    if (request.greeting === "hello") {
        sendResponse({ farewell: "goodbye" });
        return;
    }

    // Handle NativeFoundationModels API calls
    if (request.action) {
        handleNativeFoundationModelsRequest(request, sender, sendResponse);
        return true; // Keep message channel open for async response
    }
});

async function handleNativeFoundationModelsRequest(request, sender, sendResponse) {
    try {
        
        // Safari extension: Try to communicate with Safari Web Extension Handler
        let response;
        
        // Try native messaging first (this should trigger SafariWebExtensionHandler.beginRequest)
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendNativeMessage) {
            // Try chrome.runtime.sendNativeMessage
            response = await new Promise((resolve, reject) => {
                chrome.runtime.sendNativeMessage(request, (response) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            });
        } else if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.sendNativeMessage) {
            // Try browser.runtime.sendNativeMessage
            response = await browser.runtime.sendNativeMessage(request);
        } else {
            // If native messaging isn't available, we need to find another way
            throw new Error('Native messaging API not available in Safari');
        }
        
        sendResponse(response);
        
    } catch (error) {
        console.error("Critical error communicating with Safari Web Extension Handler:", error);
        
        // Fallback: return error response
        sendResponse({
            requestId: request.requestId,
            type: 'response',
            error: error.message || 'Failed to communicate with native Safari extension handler'
        });
    }
}

// Handle responses from native handler for streaming
browser.runtime.onConnectExternal.addListener((port) => {
    
    port.onMessage.addListener((message) => {
        
        // Forward streaming responses to content scripts
        if (message.type === 'stream' || message.type === 'streamEnd') {
            browser.tabs.query({active: true, currentWindow: true}).then(tabs => {
                tabs.forEach(tab => {
                    browser.tabs.sendMessage(tab.id, {
                        type: 'nativeResponse',
                        data: message
                    }).catch(err => {
                        // Ignore errors for inactive tabs
                    });
                });
            });
        }
    });
});
