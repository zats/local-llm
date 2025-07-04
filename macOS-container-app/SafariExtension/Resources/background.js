// Background script for NativeFoundationModels Extension

// Log when extension is installed or started
browser.runtime.onInstalled.addListener(() => {
    // Extension installed/updated
});

browser.runtime.onStartup.addListener(() => {
    // Extension started
});

// Handle toolbar button click - open playground in new tab
browser.action.onClicked.addListener((tab) => {
    const playgroundUrl = browser.runtime.getURL('playground.html');
    browser.tabs.create({ url: playgroundUrl });
});

// Handle messages from content scripts
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {

    // Legacy greeting support
    if (request.greeting === "hello") {
        sendResponse({ farewell: "goodbye" });
        return;
    }

    // Handle NativeFoundationModels API calls from content script
    if (request.type === 'nativeRequest' && request.payload) {
        handleNativeFoundationModelsRequest(request.payload, sender, sendResponse);
        return true; // Keep message channel open for async response
    }

    // Handle popup API calls (popup-api.js sends { requestId, command, payload })
    if (request.command && request.requestId) {
        const nativeRequest = {
            action: request.command,
            requestId: request.requestId,
            data: request.payload
        };
        handleNativeFoundationModelsRequest(nativeRequest, sender, sendResponse);
        return true; // Keep message channel open for async response
    }

    // Handle direct API calls (legacy support)
    if (request.action) {
        handleNativeFoundationModelsRequest(request, sender, sendResponse);
        return true; // Keep message channel open for async response
    }
});

async function handleNativeFoundationModelsRequest(request, sender, sendResponse) {
    try {
        console.log("Background script handling request:", request.action, "with ID:", request.requestId);
        
        // Safari extension: Use browser.runtime.sendNativeMessage WITHOUT app ID
        // This should trigger SafariWebExtensionHandler.beginRequest() in Swift
        
        // Create message format expected by SafariWebExtensionHandler
        const message = {
            action: request.action,
            requestId: request.requestId,
            data: request.data || {}
        };
        
        // Safari extensions use sendNativeMessage - it should automatically route to SafariWebExtensionHandler
        const response = await new Promise((resolve, reject) => {
            // Try Safari's sendNativeMessage - it should route to SafariWebExtensionHandler.beginRequest()
            if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.sendNativeMessage) {
                browser.runtime.sendNativeMessage(message, (response) => {
                    if (browser.runtime.lastError) {
                        console.error('Safari native message error:', browser.runtime.lastError);
                        reject(new Error(browser.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            } else {
                reject(new Error('browser.runtime.sendNativeMessage not available'));
            }
        });
        
        console.log("Received response:", response);
        sendResponse(response);
        
    } catch (error) {
        console.error("Critical error communicating with Safari Web Extension Handler:", error);
        
        // Return error response
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
