// Content Script - Bridge between page and extension

// Inject the actual API script into the page context
function injectPageScript() {
    // Check if already injected to prevent duplicates
    if (document.querySelector('script[data-nfm-injected]')) {
        return;
    }
    
    try {
        const script = document.createElement('script');
        script.src = browser.runtime.getURL('inject.js');
        script.setAttribute('data-nfm-injected', 'true');
        script.onload = function() {
            this.remove();
        };
        script.onerror = function() {
            console.error("Critical error: Failed to load inject.js script");
            this.remove();
        };
        
        (document.head || document.documentElement).appendChild(script);
    } catch (error) {
        console.error("Critical error: Failed to inject page script:", error);
    }
}

// Listen for messages from the injected page script
window.addEventListener('message', async (event) => {
    if (event.data && event.data.type === 'nativeRequest') {
        const { request } = event.data;
        
        try {
            // Safari extension: Send message to Safari Web Extension Handler
            // In Safari, this should trigger SafariWebExtensionHandler.beginRequest()
            
            // Create message format expected by SafariWebExtensionHandler
            const message = {
                action: request.action,
                requestId: request.requestId,
                data: request.data || {}
            };
            
            // Try different Safari extension messaging approaches
            let response;
            
            // First try: Direct native messaging (if Safari supports it)
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendNativeMessage) {
                // Try chrome.runtime.sendNativeMessage
                response = await new Promise((resolve, reject) => {
                    chrome.runtime.sendNativeMessage(message, (response) => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else {
                            resolve(response);
                        }
                    });
                });
            } else if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.sendNativeMessage) {
                // Try browser.runtime.sendNativeMessage
                response = await browser.runtime.sendNativeMessage(message);
            } else {
                // Fallback: Try sending to background script which might have native access
                response = await browser.runtime.sendMessage(message);
            }
            
            // Received response from Safari handler
            
            // Send response back to page
            window.postMessage({
                type: 'nativeResponse',
                response: response
            }, '*');
        } catch (error) {
            console.error("Critical error in content script:", error);
            
            // Send error back to page
            window.postMessage({
                type: 'nativeResponse',
                response: {
                    requestId: request.requestId,
                    error: error.message || 'Safari extension communication failed'
                }
            }, '*');
        }
    }
});

// Listen for responses from background script (for streaming)
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'nativeResponse') {
        window.postMessage({
            type: 'nativeResponse',
            response: message.data
        }, '*');
    }
});

// Inject the page script when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectPageScript);
} else {
    injectPageScript();
}

// Content script bridge setup complete
