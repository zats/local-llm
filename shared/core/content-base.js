/**
 * Unified content script for LocalLLM extension
 * Provides cross-browser content script functionality
 */

class UnifiedContentScript {
  constructor(config) {
    this.config = config;
    this.init();
  }
  
  init() {
    this.injectScript();
    this.setupMessageHandlers();
  }
  
  injectScript() {
    // Get the appropriate script name based on browser
    const scriptName = this.config.resources.injectedScript;
    const runtime = this.config.browser === 'chrome' ? chrome.runtime : browser.runtime;
    
    // Create and inject the script
    const script = document.createElement('script');
    script.src = runtime.getURL(scriptName);
    script.onload = function() {
      this.remove();
    };
    
    // Inject into page
    (document.head || document.documentElement).appendChild(script);
  }
  
  setupMessageHandlers() {
    const runtime = this.config.browser === 'chrome' ? chrome.runtime : browser.runtime;
    // Listen for streaming responses from background script
    runtime.onMessage.addListener((message, sender, sendResponse) => {
      // Check if this is a streaming response meant for the page
      if (message.type === 'streamingResponse') {
        // Transform response format for injected script
        const transformedResponse = {
          type: this.config.messaging.responseType,
          requestId: message.requestId,
          success: true,
          data: message.data,
          nativeType: message.nativeType
        };        
        // Send response back to page
        window.postMessage(transformedResponse, '*');
      }
    });
    
    // Listen for messages from the injected script
    window.addEventListener('message', (event) => {
      // Only accept messages from same origin
      if (event.source !== window) return;

      // Check for LocalLLM messages
      if (event.data && event.data.type === this.config.messaging.requestType) {
        this.forwardToBackground(event.data);
      }
    });
  }
  
  forwardToBackground(message) {
    const runtime = this.config.browser === 'chrome' ? chrome.runtime : browser.runtime;
    // Forward message to background script
    if (this.config.browser === 'chrome') {
      // Chrome Manifest V3 uses callback-based API
      runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          // Send error response back to page
          const errorResponse = {
            type: this.config.messaging.responseType,
            requestId: message.requestId,
            success: false,
            error: chrome.runtime.lastError.message,
            errorType: 'CONTENT_SCRIPT_ERROR'
          };
          window.postMessage(errorResponse, '*');
        } else {
          // Transform response format for injected script
          const transformedResponse = {
            type: this.config.messaging.responseType,
            requestId: message.requestId,
            success: true,
            data: response
          };          
          // Send response back to page
          window.postMessage(transformedResponse, '*');
        }
      });
    } else {
      // Safari/Firefox use Promise-based API
      runtime.sendMessage(message).then(response => {
        // Transform response format for injected script
        const transformedResponse = {
          type: this.config.messaging.responseType,
          requestId: message.requestId,
          success: true,
          data: response
        };
        
        // Send response back to page
        window.postMessage(transformedResponse, '*');
      }).catch(error => {
        // Send error response back to page
        const errorResponse = {
          type: this.config.messaging.responseType,
          requestId: message.requestId,
          success: false,
          error: error.message,
          errorType: 'CONTENT_SCRIPT_ERROR'
        };
        window.postMessage(errorResponse, '*');
      });
    }
  }
}

// Export for both module and script contexts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UnifiedContentScript;
} else if (typeof self !== 'undefined') {
  self.UnifiedContentScript = UnifiedContentScript;
} else if (typeof window !== 'undefined') {
  window.UnifiedContentScript = UnifiedContentScript;
}