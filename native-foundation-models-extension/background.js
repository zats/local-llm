// Background service worker for NativeFoundationModels extension
class NativeFoundationModelsBackground {
  constructor() {
    this.nativePort = null;
    this.requestHandlers = new Map();
    this.setupNativeMessaging();
    this.setupMessageHandlers();
  }

  setupNativeMessaging() {
    try {
      console.log('Attempting to connect to native app: com.nativefoundationmodels.native');
      this.nativePort = chrome.runtime.connectNative('com.nativefoundationmodels.native');
      this.nativePort.onMessage.addListener(this.handleNativeMessage.bind(this));
      this.nativePort.onDisconnect.addListener(this.handleNativeDisconnect.bind(this));
      console.log('Native messaging port established successfully.');
    } catch (error) {
      console.error('Failed to connect to native app. Error details:', error.message, error.stack);
    }
  }

  setupMessageHandlers() {
    chrome.runtime.onMessage.addListener(this.handleExtensionMessage.bind(this));
  }

  handleExtensionMessage(message, sender, sendResponse) {
    const { requestId, command, payload } = message;
    
    if (!this.nativePort) {
      sendResponse({ error: 'Native app not connected' });
      return true;
    }

    // Store response handler
    this.requestHandlers.set(requestId, sendResponse);
    
    // Forward to native app
    this.nativePort.postMessage({ requestId, command, payload });
    
    return true; // Keep message channel open for async response
  }

  handleNativeMessage(message) {
    const { requestId, type, payload } = message;
    
    if (type === 'streamChunk' || type === 'streamEnd' || type === 'error') {
      // Forward streaming messages to popup if it's listening
      chrome.runtime.sendMessage({ type, payload }).catch(() => {
        // Popup might not be open, ignore error
      });
      
      // Forward streaming messages to content scripts
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, message).catch(() => {
            // Content script might not be active, ignore error
          });
        });
      });
    }
    
    // Handle regular responses
    if (requestId && this.requestHandlers.has(requestId)) {
      const sendResponse = this.requestHandlers.get(requestId);
      sendResponse(message);
      
      // Clean up handler unless it's a streaming response
      if (type !== 'streamChunk') {
        this.requestHandlers.delete(requestId);
      }
    }
  }

  handleNativeDisconnect() {
    console.log('Native app disconnected');
    this.nativePort = null;
    
    // Notify all pending requests
    this.requestHandlers.forEach((sendResponse) => {
      sendResponse({ error: 'Native app disconnected' });
    });
    this.requestHandlers.clear();
  }
}

// Initialize background service
new NativeFoundationModelsBackground();