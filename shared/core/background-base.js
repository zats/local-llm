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
    this.setupNativeMessaging();
    this.setupMessageHandlers();
    this.setupActionHandler();
    this.setupInstallHandlers();
  }
  
  setupInstallHandlers() {
    // Handle extension installation/startup
    const runtime = this.config.browser === 'chrome' ? chrome.runtime : browser.runtime;
    
    runtime.onInstalled.addListener(() => {
      console.log('Native Foundation Models extension installed/updated');
    });
    
    if (runtime.onStartup) {
      runtime.onStartup.addListener(() => {
        console.log('Native Foundation Models extension started');
      });
    }
  }
  
  setupNativeMessaging() {
    // For Chrome, we'll establish connection on-demand rather than at startup
    // Safari uses message-based approach, no persistent connection needed
  }
  
  setupPersistentConnection() {
    if (this.nativePort) {
      return; // Already connected
    }
    
    try {
      console.log(`Attempting to connect to native app: ${this.config.nativeMessaging.appId}`);
      this.nativePort = chrome.runtime.connectNative(this.config.nativeMessaging.appId);
      this.nativePort.onMessage.addListener(this.handleNativeMessage.bind(this));
      this.nativePort.onDisconnect.addListener(this.handleNativeDisconnect.bind(this));
      console.log('Native messaging port established successfully.');
    } catch (error) {
      console.error('Failed to connect to native app. Error details:', error.message, error.stack);
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
    console.log('🔧 Background received extension message:', message);
    
    // Handle legacy greeting
    if (message.greeting === "hello") {
      console.log('🔧 Handling legacy greeting');
      sendResponse({ farewell: "goodbye" });
      return;
    }
    
    // Handle different message formats
    if (message.type === this.config.messaging.requestType || 
        (message.command && message.requestId) || 
        message.action) {
      
      console.log('🔧 Handling Native Foundation Models request');
      return this.handleNativeFoundationModelsRequest(message, sender, sendResponse);
    }
    
    console.log('🔧 Message not handled by background script');
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
      return this.handleChromeNativeRequest(nativeRequest, sendResponse);
    } else {
      return this.handleSafariNativeRequest(nativeRequest, sendResponse);
    }
  }
  
  handleChromeNativeRequest(nativeRequest, sendResponse) {
    const { requestId } = nativeRequest;
    console.log('🔧 Handling Chrome native request:', nativeRequest);
    
    // Establish connection on-demand if not already connected
    if (!this.nativePort) {
      try {
        this.setupPersistentConnection();
      } catch (error) {
        console.error('Failed to establish native connection:', error);
        sendResponse({ 
          error: 'Native app not connected',
          errorType: 'NATIVE_APP_NOT_FOUND',
          downloadUrl: this.config.ui.downloadUrl
        });
        return true;
      }
    }
    
    // Store response handler
    if (requestId) {
      console.log('🔧 Storing response handler for requestId:', requestId);
      this.requestHandlers.set(requestId, sendResponse);
    }
    
    // Send to native app
    try {
      console.log('🔧 Sending message to native app:', nativeRequest);
      this.nativePort.postMessage(nativeRequest);
      console.log('🔧 Message sent successfully to native app');
    } catch (error) {
      console.error('Failed to send message to native app:', error);
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
    console.log('🔧 Handling Safari native request:', nativeRequest);
    
    // Transform message format for Safari Swift handler
    const safariMessage = {
      action: nativeRequest.command,  // Safari expects "action", not "command"
      requestId: nativeRequest.requestId,
      data: nativeRequest.payload
    };
    
    console.log('🔧 Sending to Safari native handler:', safariMessage);
    
    browser.runtime.sendNativeMessage(this.config.nativeMessaging.appId, safariMessage)
      .then(response => {
        console.log('🔧 Safari native response:', response);
        sendResponse(response);
      })
      .catch(error => {
        console.error('Safari native messaging error:', error);
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
    console.log('🔧 Received message from native app:', message);
    const { requestId } = message;
    
    if (requestId && this.requestHandlers.has(requestId)) {
      console.log('🔧 Found response handler for requestId:', requestId);
      const sendResponse = this.requestHandlers.get(requestId);
      console.log('🔧 Sending response back to content script:', message);
      sendResponse(message);
      this.requestHandlers.delete(requestId);
    } else {
      console.log('🔧 No response handler found for requestId:', requestId);
      console.log('🔧 Available handlers:', Array.from(this.requestHandlers.keys()));
    }
  }
  
  handleNativeDisconnect() {
    // Handle native app disconnect (Chrome only)
    const error = chrome.runtime.lastError;
    if (error) {
      console.error('Native messaging host disconnected:', error.message);
    } else {
      console.log('Native messaging host disconnected normally');
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