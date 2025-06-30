// Background service worker for ChromeLLM extension
class ChromeLLMBackground {
  constructor() {
    this.nativePort = null;
    this.requestHandlers = new Map();
    this.setupNativeMessaging();
    this.setupMessageHandlers();
  }

  setupNativeMessaging() {
    try {
      this.nativePort = chrome.runtime.connectNative('com.chromellm.native');
      this.nativePort.onMessage.addListener(this.handleNativeMessage.bind(this));
      this.nativePort.onDisconnect.addListener(this.handleNativeDisconnect.bind(this));
      console.log('Native messaging port established');
    } catch (error) {
      console.error('Failed to connect to native app:', error);
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
new ChromeLLMBackground();