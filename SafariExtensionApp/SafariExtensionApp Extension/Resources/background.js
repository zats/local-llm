// Background script for NativeFoundationModels Extension
console.log('🚀 Background script starting...');

// Log when extension is installed or started
browser.runtime.onInstalled.addListener(() => {
    console.log('✅ Extension installed/updated');
});

browser.runtime.onStartup.addListener(() => {
    console.log('✅ Extension started');
});

// Handle messages from content scripts
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Background received request: ", request);

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
        console.log(`Handling ${request.action} request:`, request);
        
        // Safari extension: Try to communicate with Safari Web Extension Handler
        let response;
        
        // Try native messaging first (this should trigger SafariWebExtensionHandler.beginRequest)
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendNativeMessage) {
            console.log('🔄 Background trying chrome.runtime.sendNativeMessage...');
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
            console.log('🔄 Background trying browser.runtime.sendNativeMessage...');
            response = await browser.runtime.sendNativeMessage(request);
        } else {
            // If native messaging isn't available, we need to find another way
            console.log('⚠️ Native messaging not available, using fallback...');
            throw new Error('Native messaging API not available in Safari');
        }
        
        console.log("Received response from Safari Web Extension Handler:", response);
        sendResponse(response);
        
    } catch (error) {
        console.error("Error communicating with Safari Web Extension Handler:", error);
        
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
    console.log("External connection established");
    
    port.onMessage.addListener((message) => {
        console.log("Received message from native:", message);
        
        // Forward streaming responses to content scripts
        if (message.type === 'stream' || message.type === 'streamEnd') {
            browser.tabs.query({active: true, currentWindow: true}).then(tabs => {
                tabs.forEach(tab => {
                    browser.tabs.sendMessage(tab.id, {
                        type: 'nativeResponse',
                        data: message
                    }).catch(err => {
                        // Ignore errors for inactive tabs
                        console.log("Could not send to tab:", tab.id, err);
                    });
                });
            });
        }
    });
});
