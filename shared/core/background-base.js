/**
 * Unified background script for Native Foundation Models extension
 * Works with both Chrome (persistent connection) and Safari (message-based) native messaging
 */

class UnifiedBackground {
  constructor(config) {
    this.config = config;
    this.nativePort = null;
    this.requestHandlers = new Map();
    
    this.init();
  }
  
  init() {
    this.setupMessageHandlers();
    this.setupActionHandler();
  }
  
  setupPersistentConnection() {
    if (this.nativePort) {
      return; // Already connected
    }
    
    try {
      this.nativePort = chrome.runtime.connectNative(this.config.nativeMessaging.appId);
      this.nativePort.onMessage.addListener(this.handleNativeMessage.bind(this));
      this.nativePort.onDisconnect.addListener(this.handleNativeDisconnect.bind(this));
    } catch (error) {
      throw error;
    }
  }
  
  setupMessageHandlers() {
    const runtime = this.config.browser === 'chrome' ? chrome.runtime : browser.runtime;
    runtime.onMessage.addListener(this.handleExtensionMessage.bind(this));
  }
  
  setupActionHandler() {
    const action = this.config.browser === 'chrome' ? chrome.action : browser.action;
    const tabs = this.config.browser === 'chrome' ? chrome.tabs : browser.tabs;
    const runtime = this.config.browser === 'chrome' ? chrome.runtime : browser.runtime;
    
    action.onClicked.addListener((tab) => {
      const playgroundUrl = runtime.getURL(this.config.ui.playgroundUrl);
      tabs.create({ url: playgroundUrl });
    });
  }
  
  handleExtensionMessage(message, sender, sendResponse) {
    // Handle legacy greeting
    if (message.greeting === "hello") {
      sendResponse({ farewell: "goodbye" });
      return;
    }
    
    // Handle different message formats
    if (message.type === this.config.messaging.requestType || 
        (message.command && message.requestId) || 
        message.action) {
      
      return this.handleNativeFoundationModelsRequest(message, sender, sendResponse);
    }
  }
  
  handleNativeFoundationModelsRequest(message, sender, sendResponse) {
    // Normalize the request format
    let nativeRequest;
    
    if (message.type === this.config.messaging.requestType) {
      // Content script format - use the full message structure
      nativeRequest = {
        command: message.command,
        requestId: message.requestId,
        payload: message.payload
      };
    } else if (message.command && message.requestId) {
      // Popup API format
      nativeRequest = {
        command: message.command,
        requestId: message.requestId,
        payload: message.payload
      };
    } else if (message.action) {
      // Direct API format - convert action to command for native app
      nativeRequest = {
        command: message.action,
        requestId: message.requestId,
        payload: message.payload
      };
    }
    
    if (this.config.nativeMessaging.supportsPersistentConnection) {
      return this.handleChromeNativeRequest(nativeRequest, sendResponse, sender);
    } else {
      return this.handleSafariNativeRequest(nativeRequest, sendResponse);
    }
  }
  
  handleChromeNativeRequest(nativeRequest, sendResponse, sender) {
    const { requestId } = nativeRequest;

    // Establish connection on-demand if not already connected
    if (!this.nativePort) {
      try {
        this.setupPersistentConnection();
      } catch (error) {
        sendResponse({ 
          error: 'Native app not connected',
          errorType: 'NATIVE_APP_NOT_FOUND',
          downloadUrl: this.config.ui.downloadUrl
        });
        return true;
      }
    }
    
    // Store response handler and sender info for streaming
    if (requestId) {
      this.requestHandlers.set(requestId, { 
        sendResponse,
        sender,
        isStreaming: nativeRequest.command === 'getCompletionStream'
      });
    }
    
    // Send to native app
    try {
      this.nativePort.postMessage(nativeRequest);
    } catch (error) {
      sendResponse({ 
        error: error.message,
        errorType: 'MESSAGING_ERROR'
      });
      return false;
    }
    
    return true; // Keep message channel open
  }
  
  handleSafariNativeRequest(nativeRequest, sendResponse) {
    // Safari uses direct native messaging, not persistent connections    
    // Transform message format for Safari Swift handler
    const safariMessage = {
      action: nativeRequest.command,  // Safari expects "action", not "command"
      requestId: nativeRequest.requestId,
      data: nativeRequest.payload
    };
        
    browser.runtime.sendNativeMessage(this.config.nativeMessaging.appId, safariMessage)
      .then(response => {
        sendResponse(response);
      })
      .catch(error => {
        sendResponse({
          error: 'Native app not connected',
          errorType: 'NATIVE_APP_NOT_FOUND',
          downloadUrl: this.config.ui.downloadUrl
        });
      });
    
    return true; // Keep message channel open for async response
  }
  
  handleNativeMessage(message) {
    // Handle response from native app (Chrome only)
    const { requestId } = message;
    if (requestId && this.requestHandlers.has(requestId)) {
      const handlerInfo = this.requestHandlers.get(requestId);
      const sendResponse = typeof handlerInfo === 'function' ? handlerInfo : handlerInfo.sendResponse;
      const sender = handlerInfo.sender;
      const isStreaming = handlerInfo.isStreaming;
      // For streaming, send responses directly to content script
      if (isStreaming && sender && sender.tab) {
        if (this.config.browser === 'chrome') {
          chrome.tabs.sendMessage(sender.tab.id, {
            type: 'streamingResponse',
            requestId: message.requestId,
            data: message
          }).catch(error => {
            console.error('Error sending streaming message to content script:', error);
          });
        } else {
          browser.tabs.sendMessage(sender.tab.id, {
            type: 'streamingResponse',
            requestId: message.requestId,
            data: message
          }).catch(error => {
            console.error('Error sending streaming message to content script:', error);
          });
        }
        
        // Only call sendResponse for the first chunk to establish the connection
        if (message.type === 'streamChunk' && !handlerInfo.firstChunkSent) {
          handlerInfo.firstChunkSent = true;
          try {
            sendResponse(message);
          } catch (error) {
            console.error('Error calling sendResponse for first chunk:', error);
          }
        }
      } else {
        // For non-streaming, use normal sendResponse
        try {
          sendResponse(message);
        } catch (error) {
          console.error('Error calling sendResponse:', error);
        }
      }
      
      // Only delete handler for non-streaming responses or when stream ends
      if (message.type !== 'streamChunk') {
        this.requestHandlers.delete(requestId);
      }
    }
  }
  
  handleNativeDisconnect() {
    // Handle native app disconnect (Chrome only)
    const error = chrome.runtime.lastError;
    if (error) {
      console.error('Native messaging host disconnected:', error.message);
    }
    
    this.nativePort = null;
    
    // Notify any pending requests
    for (const [requestId, sendResponse] of this.requestHandlers) {
      sendResponse({
        error: 'Native app disconnected',
        errorType: 'NATIVE_APP_DISCONNECTED',
        downloadUrl: this.config.ui.downloadUrl
      });
    }
    this.requestHandlers.clear();
  }
}

// Export for both module and script contexts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UnifiedBackground;
} else if (typeof self !== 'undefined') {
  self.UnifiedBackground = UnifiedBackground;
} else if (typeof window !== 'undefined') {
  window.UnifiedBackground = UnifiedBackground;
}