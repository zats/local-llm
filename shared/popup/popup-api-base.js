// Verify LocalLLM class is available - fail fast if not
function getLocalLLMClass() {
  if (window.UnifiedInjectedScript?.LocalLLM) {
    console.log('[PopupAPI] Using UnifiedInjectedScript.LocalLLM');
    return window.UnifiedInjectedScript.LocalLLM;
  }
  
  if (window.LocalLLMScript?.LocalLLM) {
    console.log('[PopupAPI] Using LocalLLMScript.LocalLLM');
    return window.LocalLLMScript.LocalLLM;
  }
  
  // Fail hard - don't allow empty class inheritance
  console.error('[PopupAPI] CRITICAL ERROR: LocalLLM class not found!');
  console.error('[PopupAPI] Available window properties:', Object.keys(window).filter(k => k.includes('LLM') || k.includes('Inject')));
  console.error('[PopupAPI] UnifiedInjectedScript:', window.UnifiedInjectedScript);
  console.error('[PopupAPI] LocalLLMScript:', window.LocalLLMScript);
  
  throw new Error('POPUP API INITIALIZATION FAILED: LocalLLM class not available. injected-base.js must be loaded before popup-api-base.js');
}

// Reuse the LocalLLM class from injected-base.js but override messaging for extension context
class UnifiedPopupAPI extends getLocalLLMClass() {
  constructor(config) {
    console.log('[PopupAPI] Initializing with config:', config);
    super(config);
  }

  // Add missing methods that the initialization function expects
  async* getCompletionStream(prompt, options = {}) {
    // This is for backward compatibility - redirect to streaming completion
    yield* this._streamCompletion(prompt, options);
  }

  // Check LocalLLM availability status
  async checkStatus() {
    try {
      const response = await this.sendMessage('checkAvailability');      
      // Parse the native app response format
      if (response.payload && response.payload.available !== undefined) {
        return response.payload.available ? 'available' : 'unavailable';
      }
      
      // Fallback for direct response format
      if (response.available !== undefined) {
        return response.available ? 'available' : 'unavailable';
      }
      
      return 'unavailable';
    } catch (error) {
      console.error('Status check error:', error);
      return 'unavailable';
    }
  }

  // Override sendMessage to use chrome.runtime instead of window.postMessage
  async sendMessage(command, payload = {}) {
    const requestId = this.generateRequestId();
    
    try {
      const response = await chrome.runtime.sendMessage({
        command: command,  // Use 'command' not 'type' to match background script expectations
        requestId,
        payload
      });

      if (response && (response.success || response.type === 'availabilityResponse')) {
        if (response.type === 'availabilityResponse') {
          return response.payload;
        } else {
          return response.data;
        }
      } else {
        console.error(response)
        throw new Error(response?.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Extension message error:', error);
      throw error;
    }
  }

  // Override _streamCompletion to use chrome.runtime.connect instead of window.postMessage
  async* _streamCompletion(prompt, options = {}) {
    const requestId = this.generateRequestId();
    
    const port = chrome.runtime.connect({ name: 'localLLM-stream' });
    
    const chunks = [];
    let streamComplete = false;
    let streamError = null;
    let chunkWaiters = [];
    
    port.onMessage.addListener((message) => {
      if (message.requestId === requestId) {
        if (message.error) {
          streamError = { error: { message: message.error, type: 'stream_error', code: 'stream_failed' } };
          streamComplete = true;
        } else if (message.done) {
          streamComplete = true;
        } else if (message.chunk) {
          const responseData = message.chunk.payload || message.chunk.data || message.chunk;
          
          // Convert to OpenAI format chunks using parent class methods
          if (responseData.object === 'chat.completion.chunk') {
            chunks.push(responseData);
          } else if (responseData.object === 'chat.completion') {
            const openAIChunk = this._formatAsOpenAIChunk(responseData, options.model);
            chunks.push(openAIChunk);
            streamComplete = true;
          } else {
            const openAIChunk = this._formatAsOpenAIChunk(responseData, options.model);
            chunks.push(openAIChunk);
          }
        }
        
        chunkWaiters.forEach(resolve => resolve());
        chunkWaiters = [];
      }
    });
    
    // Send streaming request
    port.postMessage({
      command: 'getCompletionStream',  // Use 'command' not 'type'
      requestId,
      payload: { prompt, ...options }
    });
    
    try {
      let chunkIndex = 0;
      while (true) {
        if (streamError) {
          throw streamError;
        }
        
        while (chunkIndex < chunks.length) {
          yield chunks[chunkIndex];
          chunkIndex++;
        }
        
        if (streamComplete && chunkIndex >= chunks.length) {
          break;
        }
        
        await new Promise(resolve => {
          chunkWaiters.push(resolve);
        });
      }
    } finally {
      port.disconnect();
    }
  }
}