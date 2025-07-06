/**
 * Unified background script for LocalLLM extension
 * Works with both Chrome (persistent connection) and Safari (message-based) native messaging
 */

class UnifiedBackground {
  constructor(config) {
    this.config = config;
    this.nativePort = null;
    this.requestHandlers = new Map();
    
    // Initialize platform-specific configuration
    if (this.config.init) {
      this.config.init();
    }
    
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
    runtime.onConnect.addListener(this.handlePortConnection.bind(this));
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
  
  handlePortConnection(port) {
    console.log('[NFM-BG] Port connection established:', port.name);
    
    if (port.name === 'localLLM-stream') {
      port.onMessage.addListener((message) => {
        console.log('[NFM-BG] Port message received:', message);
        this.handlePortMessage(message, port);
      });
      
      port.onDisconnect.addListener(() => {
        console.log('[NFM-BG] Port disconnected');
      });
    }
  }
  
  handlePortMessage(message, port) {
    // Handle streaming requests through port
    const { command, requestId, payload } = message;
    
    if (command === 'getCompletionStream') {
      const nativeRequest = {
        command,
        requestId,
        payload
      };
      
      console.log('[NFM-BG] Handling streaming request via port:', nativeRequest);
      
      // Set up streaming response handler
      this.requestHandlers.set(requestId, {
        sendResponse: (response) => {
          if (response.error) {
            port.postMessage({ requestId, error: response.error });
          } else {
            port.postMessage({ requestId, chunk: response });
          }
        },
        sender: null,
        isStreaming: true,
        port: port
      });
      
      // Establish native connection if needed
      if (!this.nativePort) {
        try {
          this.setupPersistentConnection();
        } catch (error) {
          port.postMessage({ 
            requestId, 
            error: 'Native app not connected',
            errorType: 'NATIVE_APP_NOT_FOUND'
          });
          return;
        }
      }
      
      // Send to native app
      try {
        this.nativePort.postMessage(nativeRequest);
      } catch (error) {
        port.postMessage({ 
          requestId, 
          error: error.message,
          errorType: 'MESSAGING_ERROR'
        });
      }
    }
  }
  
  handleNativeFoundationModelsRequest(message, sender, sendResponse) {
    console.log('[NFM-BG] Handling native foundation models request:', message);
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
    
    console.log('[NFM-BG] Normalized native request:', nativeRequest);
    console.log('[NFM-BG] Supports persistent connection:', this.config.nativeMessaging.supportsPersistentConnection);
    
    if (this.config.nativeMessaging.supportsPersistentConnection) {
      return this.handleChromeNativeRequest(nativeRequest, sendResponse, sender);
    } else {
      return this.handleSafariNativeRequest(nativeRequest, sendResponse);
    }
  }
  
  handleChromeNativeRequest(nativeRequest, sendResponse, sender) {
    console.log('[NFM-BG-Chrome] Handling Chrome native request:', nativeRequest);
    const { requestId } = nativeRequest;

    // Establish connection on-demand if not already connected
    if (!this.nativePort) {
      console.log('[NFM-BG-Chrome] No native port, setting up persistent connection');
      try {
        this.setupPersistentConnection();
        console.log('[NFM-BG-Chrome] Persistent connection established');
      } catch (error) {
        console.error('[NFM-BG-Chrome] Failed to establish persistent connection:', error);
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
      const isStreaming = nativeRequest.command === 'getCompletionStream';
      console.log('[NFM-BG-Chrome] Storing request handler for requestId:', requestId, 'isStreaming:', isStreaming);
      this.requestHandlers.set(requestId, { 
        sendResponse,
        sender,
        isStreaming
      });
    }
    
    // Send to native app
    try {
      console.log('[NFM-BG-Chrome] Sending message to native app:', nativeRequest);
      this.nativePort.postMessage(nativeRequest);
    } catch (error) {
      console.error('[NFM-BG-Chrome] Failed to send message to native app:', error);
      sendResponse({ 
        error: error.message,
        errorType: 'MESSAGING_ERROR'
      });
      return false;
    }
    
    return true; // Keep message channel open
  }
  
  handleSafariNativeRequest(nativeRequest, sendResponse) {
    console.log('[NFM-BG-Safari] Handling Safari native request:', nativeRequest);
    // Safari uses direct native messaging, not persistent connections    
    // Transform message format for Safari Swift handler
    const safariMessage = {
      action: nativeRequest.command,  // Safari expects "action", not "command"
      requestId: nativeRequest.requestId,
      data: nativeRequest.payload
    };
    
    console.log('[NFM-BG-Safari] Transformed message for Safari:', safariMessage);
    console.log('[NFM-BG-Safari] Native app ID:', this.config.nativeMessaging.appId);
        
    browser.runtime.sendNativeMessage(this.config.nativeMessaging.appId, safariMessage)
      .then(response => {
        console.log('[NFM-BG-Safari] Received response from native app:', response);
        sendResponse(response);
      })
      .catch(error => {
        console.error('[NFM-BG-Safari] Failed to send message to native app:', error);
        sendResponse({
          error: 'Native app not connected',
          errorType: 'NATIVE_APP_NOT_FOUND',
          downloadUrl: this.config.ui.downloadUrl
        });
      });
    
    return true; // Keep message channel open for async response
  }
  
  handleNativeMessage(message) {
    console.log('[NFM-BG-Chrome] Received message from native app:', message);
    // Handle response from native app (Chrome only)
    const { requestId, type } = message;
    if (requestId && this.requestHandlers.has(requestId)) {
      console.log('[NFM-BG-Chrome] Found request handler for requestId:', requestId, 'type:', type);
      const handlerInfo = this.requestHandlers.get(requestId);
      const sendResponse = typeof handlerInfo === 'function' ? handlerInfo : handlerInfo.sendResponse;
      const sender = handlerInfo.sender;
      const isStreaming = handlerInfo.isStreaming;
      console.log('[NFM-BG-Chrome] Handler info - isStreaming:', isStreaming, 'hasSender:', !!sender);
      // For streaming via port (popup), send directly to port
      if (isStreaming && handlerInfo.port) {
        console.log('[NFM-BG-Chrome] Sending streaming response to port');
        try {
          if (type === 'streamEnd' || type === 'error') {
            // Send final chunk and mark as done
            handlerInfo.port.postMessage({ requestId, chunk: message, done: true });
          } else {
            // Send streaming chunk
            handlerInfo.port.postMessage({ requestId, chunk: message });
          }
        } catch (error) {
          console.error('[NFM-BG-Chrome] Error sending message to port:', error);
        }
      }
      // For streaming, send responses directly to content script
      else if (isStreaming && sender && sender.tab) {
        console.log('[NFM-BG-Chrome] Sending streaming response to content script, tabId:', sender.tab.id);
        if (this.config.browser === 'chrome') {
          chrome.tabs.sendMessage(sender.tab.id, {
            type: 'streamingResponse',
            requestId: message.requestId,
            data: message,
            nativeType: type
          }).catch(error => {
            console.error('[NFM-BG-Chrome] Error sending streaming message to content script:', error);
          });
        } else {
          browser.tabs.sendMessage(sender.tab.id, {
            type: 'streamingResponse',
            requestId: message.requestId,
            data: message,
            nativeType: type
          }).catch(error => {
            console.error('[NFM-BG-Chrome] Error sending streaming message to content script:', error);
          });
        }
        
        // Only call sendResponse for the first chunk to establish the connection
        if (type === 'streamChunk' && !handlerInfo.firstChunkSent) {
          console.log('[NFM-BG-Chrome] Sending first chunk response via sendResponse');
          handlerInfo.firstChunkSent = true;
          try {
            sendResponse(message);
          } catch (error) {
            console.error('[NFM-BG-Chrome] Error calling sendResponse for first chunk:', error);
          }
        }
      } else {
        console.log('[NFM-BG-Chrome] Sending non-streaming response via sendResponse');
        // For non-streaming, use normal sendResponse
        try {
          sendResponse(message);
        } catch (error) {
          console.error('[NFM-BG-Chrome] Error calling sendResponse:', error);
        }
      }
      
      // Only delete handler for non-streaming responses or when stream ends
      if (type !== 'streamChunk') {
        console.log('[NFM-BG-Chrome] Deleting request handler for requestId:', requestId);
        this.requestHandlers.delete(requestId);
      }
    } else {
      console.warn('[NFM-BG-Chrome] No handler found for requestId:', requestId);
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