// Content Script - Bridge between page and extension
console.log('🚀 NativeFoundationModels content script bridge starting...');

// Inject the actual API script into the page context
function injectPageScript() {
    try {
        const script = document.createElement('script');
        script.src = browser.runtime.getURL('inject.js');
        script.onload = function() {
            console.log('✅ inject.js loaded successfully');
            this.remove();
        };
        script.onerror = function() {
            console.error('❌ Failed to load inject.js');
            this.remove();
        };
        
        (document.head || document.documentElement).appendChild(script);
        console.log('📝 inject.js script tag added to page');
    } catch (error) {
        console.error('❌ Failed to inject page script:', error);
    }
}

// Listen for messages from the injected page script
window.addEventListener('message', async (event) => {
    if (event.data && event.data.type === 'nativeRequest') {
        const { request } = event.data;
        console.log('📨 Content script received request from page:', request);
        
        try {
            // Safari extension: Send message to Safari Web Extension Handler
            // In Safari, this should trigger SafariWebExtensionHandler.beginRequest()
            console.log('🔄 Sending request to Safari Web Extension Handler:', request);
            
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
                console.log('🔄 Trying chrome.runtime.sendNativeMessage...');
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
                console.log('🔄 Trying browser.runtime.sendNativeMessage...');
                response = await browser.runtime.sendNativeMessage(message);
            } else {
                // Fallback: Try sending to background script which might have native access
                console.log('🔄 Trying browser.runtime.sendMessage to background...');
                response = await browser.runtime.sendMessage(message);
            }
            
            console.log('📨 Content script received response from Safari handler:', response);
            
            // Send response back to page
            window.postMessage({
                type: 'nativeResponse',
                response: response
            }, '*');
        } catch (error) {
            console.error('❌ Content script error:', error);
            
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
        console.log('📨 Content script received streaming response from background:', message);
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

console.log('✅ Content script bridge setup complete');
