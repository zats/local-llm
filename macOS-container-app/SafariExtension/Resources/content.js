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

console.log("DEBUG: content.js loaded and setting up message listener");

// Listen for messages from the injected page script
window.addEventListener('message', async (event) => {
    console.log("DEBUG: content.js received message:", event.data);
    
    if (event.data && event.data.type === 'nativeRequest') {
        const { request } = event.data;
        console.log("DEBUG: content.js processing nativeRequest:", request);
        
        try {
            // Safari extension: Send message to background script
            // Only the background script can call sendNativeMessage() in Safari
            
            const messageToBackground = {
                type: 'nativeRequest',
                payload: request
            };
            
            console.log("DEBUG: content.js sending to background:", messageToBackground);
            
            // Send to background script via browser.runtime.sendMessage()
            const response = await browser.runtime.sendMessage(messageToBackground);
            
            console.log("DEBUG: content.js received response from background:", response);
            
            // Send response back to page
            const responseToPage = {
                type: 'nativeResponse',
                response: response
            };
            
            console.log("DEBUG: content.js sending response back to page:", responseToPage);
            window.postMessage(responseToPage, '*');
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
