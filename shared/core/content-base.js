/**
 * Unified content script for Native Foundation Models extension
 * Provides cross-browser content script functionality
 */

class UnifiedContentScript {
  constructor(config) {
    console.log('🔧 UnifiedContentScript initializing...', config.browser);
    this.config = config;
    this.init();
  }
  
  init() {
    console.log('🔧 UnifiedContentScript init() called');
    this.injectScript();
    this.setupMessageHandlers();
    console.log('🔧 UnifiedContentScript initialization complete');
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
    console.log('🔧 Setting up message handlers for', this.config.browser);
    
    // Listen for messages from the injected script
    window.addEventListener('message', (event) => {
      // Only accept messages from same origin
      if (event.source !== window) return;
      
      // Debug: log all messages that come through
      if (event.data && event.data.type) {
        console.log('🔧 Content script saw message type:', event.data.type, 'expecting:', this.config.messaging.requestType);
      }
      
      // Check for Native Foundation Models messages
      if (event.data && event.data.type === this.config.messaging.requestType) {
        console.log('🔧 Content script received message:', event.data);
        this.forwardToBackground(event.data);
      }
    });
    console.log('🔧 Message handlers setup complete');
  }
  
  forwardToBackground(message) {
    const runtime = this.config.browser === 'chrome' ? chrome.runtime : browser.runtime;
    console.log('🔧 Forwarding message to background script:', message);
    
    // Forward message to background script
    if (this.config.browser === 'chrome') {
      // Chrome Manifest V3 uses callback-based API
      runtime.sendMessage(message, (response) => {
        console.log('🔧 Background script responded:', response);
        if (chrome.runtime.lastError) {
          console.error('🔧 Content script message forwarding error:', chrome.runtime.lastError);
          
          // Send error response back to page
          window.postMessage({
            type: this.config.messaging.responseType,
            requestId: message.requestId,
            success: false,
            error: chrome.runtime.lastError.message,
            errorType: 'CONTENT_SCRIPT_ERROR'
          }, '*');
        } else {
          console.log('🔧 Sending response back to page:', response);
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
        console.error('Content script message forwarding error:', error);
        
        // Send error response back to page
        window.postMessage({
          type: this.config.messaging.responseType,
          requestId: message.requestId,
          success: false,
          error: error.message,
          errorType: 'CONTENT_SCRIPT_ERROR'
        }, '*');
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