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
    if (this.config.nativeMessaging.supportsPersistentConnection) {
      this.setupPersistentConnection();
    }
    // Safari uses message-based approach, no persistent connection needed
  }
  
  setupPersistentConnection() {
    try {
      console.log(`Attempting to connect to native app: ${this.config.nativeMessaging.appId}`);
      this.nativePort = chrome.runtime.connectNative(this.config.nativeMessaging.appId);
      this.nativePort.onMessage.addListener(this.handleNativeMessage.bind(this));
      this.nativePort.onDisconnect.addListener(this.handleNativeDisconnect.bind(this));
      console.log('Native messaging port established successfully.');
    } catch (error) {
      console.error('Failed to connect to native app. Error details:', error.message, error.stack);
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
      // Content script format
      nativeRequest = message.payload;
    } else if (message.command && message.requestId) {
      // Popup API format
      nativeRequest = {
        action: message.command,
        requestId: message.requestId,
        data: message.payload
      };
    } else if (message.action) {
      // Direct API format
      nativeRequest = message;
    }
    
    if (this.config.nativeMessaging.supportsPersistentConnection) {
      return this.handleChromeNativeRequest(nativeRequest, sendResponse);
    } else {
      return this.handleSafariNativeRequest(nativeRequest, sendResponse);
    }
  }
  
  handleChromeNativeRequest(nativeRequest, sendResponse) {
    const { requestId } = nativeRequest;
    
    if (!this.nativePort) {
      sendResponse({ 
        error: 'Native app not connected',
        errorType: 'NATIVE_APP_NOT_FOUND',
        downloadUrl: this.config.ui.downloadUrl
      });
      return true;
    }
    
    // Store response handler
    if (requestId) {
      this.requestHandlers.set(requestId, sendResponse);
    }
    
    // Send to native app
    try {
      this.nativePort.postMessage(nativeRequest);
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
    browser.runtime.sendNativeMessage(this.config.nativeMessaging.appId, nativeRequest)
      .then(response => {
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
    const { requestId } = message;
    
    if (requestId && this.requestHandlers.has(requestId)) {
      const sendResponse = this.requestHandlers.get(requestId);
      sendResponse(message);
      this.requestHandlers.delete(requestId);
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