/**
 * Unified content script for Native Foundation Models extension
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
    
    // Listen for messages from the injected script
    window.addEventListener('message', (event) => {
      // Only accept messages from same origin
      if (event.source !== window) return;
      
      // Check for Native Foundation Models messages
      if (event.data && event.data.type === this.config.messaging.requestType) {
        this.forwardToBackground(event.data);
      }
    });
  }
  
  forwardToBackground(message) {
    const runtime = this.config.browser === 'chrome' ? chrome.runtime : browser.runtime;
    
    // Forward message to background script
    runtime.sendMessage(message).then(response => {
      // Send response back to page
      window.postMessage({
        type: this.config.messaging.responseType,
        payload: response,
        requestId: message.requestId
      }, '*');
    }).catch(error => {
      console.error('Content script message forwarding error:', error);
      
      // Send error response back to page
      window.postMessage({
        type: this.config.messaging.responseType,
        payload: { 
          error: error.message,
          errorType: 'CONTENT_SCRIPT_ERROR'
        },
        requestId: message.requestId
      }, '*');
    });
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