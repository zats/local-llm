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

  // Override sendMessage to use appropriate runtime API based on browser
  async sendMessage(command, payload = {}) {
    const requestId = this.generateRequestId();
    
    console.log(`[PopupAPI-DEBUG] Starting sendMessage - command: ${command}, requestId: ${requestId}`);
    console.log(`[PopupAPI-DEBUG] Payload:`, payload);
    console.log(`[PopupAPI-DEBUG] Browser: ${this.config.browser}`);
    
    try {
      // Use browser-specific messaging API
      const runtimeAPI = this.config.browser === 'safari' ? browser.runtime : chrome.runtime;
      
      const messageToSend = {
        command: command,  // Use 'command' not 'type' to match background script expectations
        requestId,
        payload
      };
      
      console.log(`[PopupAPI-DEBUG] Sending message:`, messageToSend);
      
      const response = await runtimeAPI.sendMessage(messageToSend);
      
      console.log(`[PopupAPI-DEBUG] Received response:`, response);
      console.log(`[PopupAPI-DEBUG] Response type: ${typeof response}, has error: ${!!response?.error}`);

      // Handle successful responses - Safari returns different response types
      if (response && !response.error) {
        console.log(`[PopupAPI-DEBUG] Processing successful response, response.type: ${response.type}`);
        
        if (response.type === 'availabilityResponse') {
          console.log(`[PopupAPI-DEBUG] Returning availability payload:`, response.payload);
          return response.payload;          
        } else if (response.type === 'completionResponse') {
          console.log(`[PopupAPI-DEBUG] Returning completion payload:`, response.payload);
          return response.payload;
        } else if (response.success) {
          console.log(`[PopupAPI-DEBUG] Returning success data:`, response.data);
          return response.data;
        } else if (response.payload) {
          console.log(`[PopupAPI-DEBUG] Returning direct payload:`, response.payload);
          // Direct payload response
          return response.payload;
        } else {
          console.log(`[PopupAPI-DEBUG] Returning full response:`, response);
          // Fallback to full response
          return response;
        }
      } else {
        console.error(`[PopupAPI-DEBUG] Error response received:`, response);
        console.log(`[PopupAPI-DEBUG] response.error:`, response?.error);
        console.log(`[PopupAPI-DEBUG] response.payload:`, response?.payload);
        console.log(`[PopupAPI-DEBUG] response.payload.error:`, response?.payload?.error);
        
        const errorMessage = response?.error || response?.payload?.error || 'Unknown error';
        const errorDetails = response?.payload?.error || response?.error;
        
        console.log(`[PopupAPI-DEBUG] Extracted error message:`, errorMessage);
        console.log(`[PopupAPI-DEBUG] Extracted error details:`, errorDetails);
        
        const error = new Error(errorMessage);
        error.cause = errorDetails;
        throw error;
      }
    } catch (error) {
      console.error('[PopupAPI-DEBUG] Exception in sendMessage:', error);
      console.log(`[PopupAPI-DEBUG] Error message: ${error.message}`);
      console.log(`[PopupAPI-DEBUG] Error cause:`, error.cause);
      throw error;
    }
  }

  // Override _streamCompletion to use appropriate messaging for each browser
  async* _streamCompletion(messages, options = {}) {
    const requestId = this.generateRequestId();
    
    // Safari doesn't support persistent connections, so we use batched streaming
    if (this.config.browser === 'safari') {
      // For Safari, request streaming which will return all chunks at once
      try {
        const response = await this.sendMessage('chatCompletion', { 
          messages, 
          model: options.model || 'localLLM-default',
          stream: true,  // Request streaming to get chunks
          ...options 
        });
        
        console.log('[PopupAPI-DEBUG] Safari streaming response:', response);
        
        // Check if we got a streamResponse with chunks
        if (response && response.data && response.data.chunks) {
          // Yield each chunk from the batched response
          for (const chunk of response.data.chunks) {
            yield chunk;
          }
        } else if (response && response.chunks) {
          // Direct chunks array
          for (const chunk of response.chunks) {
            yield chunk;
          }
        } else {
          // Fallback: Convert single response to OpenAI chunk format
          const openAIChunk = this._formatAsOpenAIChunk(response, options.model);
          yield openAIChunk;
        }
        
      } catch (error) {
        const streamError = new Error(error.message);
        streamError.cause = error.cause || error;
        throw streamError;
      }
      return;
    }
    
    // Chrome port-based streaming
    const port = chrome.runtime.connect({ name: 'localLLM-stream' });
    
    const chunks = [];
    let streamComplete = false;
    let streamError = null;
    let chunkWaiters = [];
    
    port.onMessage.addListener((message) => {
      if (message.requestId === requestId) {
        if (message.error) {
          const error = new Error(message.error);
          error.cause = message.errorDetails || message.error;
          streamError = error;
          streamComplete = true;
        } else if (message.done) {
          streamComplete = true;
        } else if (message.chunk) {
          const responseData = message.chunk.payload || message.chunk.data || message.chunk;
          
          // Handle error responses in chunk format
          if (responseData.type === 'error' || responseData.error) {
            const errorMessage = responseData.error || responseData.payload?.error || responseData.payload?.message || 'Unknown error';
            const error = new Error(errorMessage);
            error.cause = responseData.payload?.error || responseData.error || responseData;
            streamError = error;
            streamComplete = true;
          }
          // Convert to OpenAI format chunks using parent class methods
          else if (responseData.object === 'chat.completion.chunk') {
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
      command: 'chatCompletion',  // Use OpenAI-compatible command
      requestId,
      payload: { 
        messages, 
        model: options.model || 'localLLM-default',
        stream: true,
        ...options 
      }
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