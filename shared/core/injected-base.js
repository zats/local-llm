/**
 * LocalLLM - Local-first Chat Completion API
 * Provides OpenAI-compatible interface for on-device language models
 */

(function() {
  'use strict';

  // Prevent duplicate loading
  if (typeof window.localLLM !== 'undefined') {
    return;
  }

  class LocalLLM {
    constructor(config = {}) {
      this.config = config;
      this.sessions = new Map(); // Track active sessions
      this.requestCounter = 0;
      
      // OpenAI-compatible chat.completions interface
      this.chat = {
        completions: {
          create: this.createChatCompletion.bind(this)
        }
      };
    }
    
    // Async availability check - always queries the native extension
    async available() {
      try {
        const result = await this.checkAvailability();
        return result.available;
      } catch (error) {
        return false;
      }
    }

    // OpenAI-compatible chat.completions.create method
    async createChatCompletion(options) {
      
      // Handle streaming
      if (options.stream) {
        return this._createStreamingCompletion(options);
      }
      
      // Handle regular completion
      return this._createRegularCompletion(options);
    }
    
    async _createRegularCompletion(options) {
      const { messages, model = 'localLLM-default', ...otherOptions } = options;
      
      // Convert to our internal format
      const prompt = this._messagesToPrompt(messages);
      
      try {
        const response = await this.sendMessage('getCompletion', { 
          prompt, 
          model, 
          ...otherOptions 
        });
        
        // Convert response to OpenAI format
        const responseData = response.payload || response.data || response;
        return this._formatAsOpenAIResponse(responseData, model);
      } catch (error) {
        throw this._formatAsOpenAIError(error);
      }
    }
    
    _createStreamingCompletion(options) {
      const { messages, model = 'localLLM-default', ...otherOptions } = options;
      const prompt = this._messagesToPrompt(messages);
      
      // Return async generator for streaming
      return this._streamCompletion(prompt, { model, ...otherOptions });
    }
    
    _messagesToPrompt(messages) {
      // Convert OpenAI messages format to simple prompt
      return messages.map(msg => {
        if (msg.role === 'system') return `System: ${msg.content}`;
        if (msg.role === 'user') return `User: ${msg.content}`;
        if (msg.role === 'assistant') return `Assistant: ${msg.content}`;
        return msg.content;
      }).join('\n\n');
    }
    
    _formatAsOpenAIResponse(data, model) {
      // Convert our response format to OpenAI format
      return {
        id: data.id || `chatcmpl-${this.generateRequestId()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: model,
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: data.content || data.choices?.[0]?.message?.content || ''
          },
          finish_reason: data.finish_reason || 'stop'
        }],
        usage: data.usage || {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        }
      };
    }
    
    _formatAsOpenAIError(error) {
      return {
        error: {
          message: error.message || 'Unknown error',
          type: 'local_llm_error',
          code: error.code || 'unknown_error'
        }
      };
    }
    
    _formatAsOpenAIChunk(data, model) {
      // Convert any response data to OpenAI streaming chunk format
      return {
        id: data.id || `chatcmpl-${this.generateRequestId()}`,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: model || 'localLLM-default',
        choices: [{
          index: 0,
          delta: {
            content: data.content || data.choices?.[0]?.delta?.content || data.choices?.[0]?.message?.content || ''
          },
          finish_reason: data.finish_reason || null
        }]
      };
    }

    async checkAvailability() {
      try {
        const response = await this.sendMessage('checkAvailability');        
        // Handle different response formats between Chrome and Safari
        if (response.payload) {
          // Chrome format: {type: 'availabilityResponse', payload: {...}}
          const result = response.payload;
          this._isAvailable = result.available;
          return result;
        } else if (response.data) {
          // Safari format: {type: 'response', data: {...}}
          const result = response.data;
          this._isAvailable = result.available;
          return result;
        } else {
          // Fallback
          this._isAvailable = response.available;
          return response;
        }
      } catch (error) {
        console.error('[LocalLLM] Availability check failed:', error);
        this._isAvailable = false;
        // Show download dialog on error
        if (window.nfmDownloadDialog) {
          window.nfmDownloadDialog.show();
        }
        throw {
          error: {
            message: error.message,
            type: 'availability_error',
            code: 'availability_check_failed'
          }
        };
      }
    }

    async createSession(options = {}) {
      const result = await this.sendMessage('startPlaygroundSession', options);
      
      // Handle different response formats between Chrome and Safari
      const responseData = result.payload || result.data || result;
      const sessionId = responseData.sessionId;
      
      const session = new Session(sessionId, this);
      this.sessions.set(sessionId, session);
      
      return session;
    }

    async getCompletion(prompt, options = {}) {
      try {
        const response = await this.sendMessage('getCompletion', { prompt, ...options });
        
        // Handle different response formats between Chrome and Safari
        if (response.payload) {
          // Chrome format: {type: 'completionResponse', payload: {...}}
          return response.payload;
        } else if (response.data) {
          // Safari format: {type: 'response', data: {...}}
          return response.data;
        } else {
          // Fallback
          return response;
        }
      } catch (error) {
        throw {
          error: {
            message: error.message,
            type: 'completion_error',
            code: 'completion_failed'
          }
        };
      }
    }

    async* _streamCompletion(prompt, options = {}) {
      
      // This function is designed to handle two scenarios:
      // 1. True streaming: The native connection supports sending multiple "chunks" over time (e.g., Chrome).
      // 2. Simulated streaming: The native connection is one-shot and returns a single, complete response (e.g., Safari).
      // The generator will yield the single response as if it were a one-chunk stream in the second case.
      
      const requestId = this.generateRequestId();
      
      const chunks = [];
      let streamComplete = false;
      let streamError = null;
      let chunkWaiters = [];
      
      const messageHandler = (event) => {
        if (event.data && event.data.type === this.config.messaging.responseType && event.data.requestId === requestId) {
          const { success, data, error } = event.data;
          
          if (!success) {
            if (event.data.errorType === 'NATIVE_APP_NOT_FOUND' && window.nfmDownloadDialog) {
              window.nfmDownloadDialog.show();
            } else if (error && error.toLowerCase().includes('not available') && window.nfmDownloadDialog) {
              window.nfmDownloadDialog.show();
            }
            streamError = { error: { message: error, type: 'stream_error', code: 'stream_failed' } };
            streamComplete = true;
            chunkWaiters.forEach(resolve => resolve());
            chunkWaiters = [];
            return;
          }
          
          const responseData = data.payload || data.data || data;
          
          // Convert to OpenAI format chunks
          if (responseData.object === 'chat.completion.chunk') {
            // This is already a standard streaming chunk
            chunks.push(responseData);
          } else if (responseData.object === 'chat.completion') {
            // This is a single, complete response (Safari behavior).
            // Convert to OpenAI streaming format
            const openAIChunk = this._formatAsOpenAIChunk(responseData, options.model);
            chunks.push(openAIChunk);
            streamComplete = true;
          } else if (responseData.object === 'chat.completion.stream' && responseData.chunks) {
            // This is Safari's bundled streaming response
            // Add artificial delay between chunks for Safari to simulate streaming
            const addChunksWithDelay = async () => {
              for (const chunk of responseData.chunks) {
                const openAIChunk = this._formatAsOpenAIChunk(chunk, options.model);
                chunks.push(openAIChunk);
                // Wake up the generator to yield this chunk
                chunkWaiters.forEach(resolve => resolve());
                chunkWaiters = [];
                // Add small delay to simulate streaming (adjust as needed)
                await new Promise(resolve => setTimeout(resolve, 20));
              }
              streamComplete = true;
              chunkWaiters.forEach(resolve => resolve());
              chunkWaiters = [];
            };
            addChunksWithDelay();
          } else {
            // Convert any other format to OpenAI chunk
            const openAIChunk = this._formatAsOpenAIChunk(responseData, options.model);
            chunks.push(openAIChunk);
          }
          
          // Handle stream end signal
          if (data.type === 'streamEnd') {
            streamComplete = true;
          }
          
          // Wake up the generator loop
          chunkWaiters.forEach(resolve => resolve());
          chunkWaiters = [];
        }
      };
      
      window.addEventListener('message', messageHandler);
      
      try {
        // Send unified message format
        const requestMessage = {
          type: this.config.messaging.requestType,
          requestId,
          command: 'getCompletionStream',
          payload: { prompt, ...options }
        };
        window.postMessage(requestMessage, '*');
        
        // Yield chunks as they arrive
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
        window.removeEventListener('message', messageHandler);
      }
    }

    async sendMessage(command, payload = {}) {
      const requestId = this.generateRequestId();
      
      return new Promise((resolve, reject) => {
        const messageHandler = (event) => {
          if (event.data.type === this.config.messaging.responseType && event.data.requestId === requestId) {
            window.removeEventListener('message', messageHandler);
            
            const { success, data, error } = event.data;
            if (success) {
              resolve(data);
            } else {
              if (event.data.errorType === 'NATIVE_APP_NOT_FOUND' && window.nfmDownloadDialog) {
                window.nfmDownloadDialog.show();
              } else if (error && error.toLowerCase().includes('not available') && window.nfmDownloadDialog) {
                window.nfmDownloadDialog.show();
              }
              reject(new Error(error, { cause: event.data }));
            }
          }
        };
        
        window.addEventListener('message', messageHandler);
        
        // Send unified message format
        const message = {
          type: this.config.messaging.requestType,
          requestId,
          command,
          payload
        };
        window.postMessage(message, '*');        
        // Timeout after 30 seconds
        setTimeout(() => {
          window.removeEventListener('message', messageHandler);
          reject(new Error('Request timeout'));
        }, 30000);
      });
    }

    generateRequestId() {
      const id = 'req-' + Math.random().toString(36).substr(2, 9);
      return id;
    }

    _removeSession(sessionId) {
      this.sessions.delete(sessionId);
    }
  }

  class Session {
    constructor(sessionId, api) {
      this.id = sessionId;
      this.api = api;
      this.isEnded = false;
    }

    async sendMessage(prompt, options = {}) {
      if (this.isEnded) {
        throw new Error('Cannot send message to an ended session');
      }

      try {
        const result = await this.api.sendMessage('sendPlaygroundMessage', {
          sessionId: this.id,
          prompt,
          ...options
        });
        
        // Handle different response formats between Chrome and Safari
        const responseData = result.payload || result.data || result;
        const { sessionId, ...openAIResponse } = responseData;
        return openAIResponse;
      } catch (error) {
        throw {
          error: {
            message: error.message,
            type: 'session_completion_error',
            code: 'session_completion_failed'
          }
        };
      }
    }

    async* sendMessageStream(prompt, options = {}) {
      if (this.isEnded) {
        throw new Error('Cannot send message to an ended session');
      }

      const requestId = this.api.generateRequestId();
      
      const chunks = [];
      let streamComplete = false;
      let streamError = null;
      let chunkWaiters = [];
      
      const messageHandler = (event) => {
        if (event.data.type === this.api.config.messaging.responseType && event.data.requestId === requestId) {
          const { success, data, error } = event.data;
          
          if (!success) {
            streamError = {
              error: {
                message: error,
                type: 'session_stream_error',
                code: 'session_stream_failed'
              }
            };
            streamComplete = true;
            chunkWaiters.forEach(resolve => resolve());
            chunkWaiters = [];
            return;
          }
          
          // Handle different response formats between Chrome and Safari
          const sessionData = data.payload || data.data || data;
          
          if ((data.type === 'streamChunk' || data.data?.type === 'streamChunk') && sessionData.sessionId === this.id) {
            const { sessionId, ...openAIChunk } = sessionData;
            chunks.push(openAIChunk);
            chunkWaiters.forEach(resolve => resolve());
            chunkWaiters = [];
          } else if ((data.type === 'streamEnd' || data.data?.type === 'streamEnd') && sessionData.sessionId === this.id) {
            const { sessionId, ...openAIChunk } = sessionData;
            chunks.push(openAIChunk);
            streamComplete = true;
            chunkWaiters.forEach(resolve => resolve());
            chunkWaiters = [];
          } else if ((data.type === 'error' || data.data?.type === 'error') && sessionData.sessionId === this.id) {
            streamError = {
              error: {
                message: sessionData.error?.message || sessionData.message || 'Session stream error',
                type: 'session_stream_error',
                code: 'session_stream_failed'
              }
            };
            streamComplete = true;
            chunkWaiters.forEach(resolve => resolve());
            chunkWaiters = [];
          }
        }
      };
      
      window.addEventListener('message', messageHandler);
      
      try {
        window.postMessage({
          type: this.api.config.messaging.requestType,
          requestId,
          command: 'sendPlaygroundMessage',
          payload: { sessionId: this.id, prompt, ...options }
        }, '*');
        
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
        window.removeEventListener('message', messageHandler);
      }
    }

    async end() {
      if (this.isEnded) {
        return;
      }

      await this.api.sendMessage('endPlaygroundSession', {
        sessionId: this.id
      });
      
      this.isEnded = true;
      this.api._removeSession(this.id);
    }
  }

  // Initialize LocalLLM instance and expose globally
  // This function will be called by the extension to configure and expose the API
  window.initializeLocalLLM = function(config) {
    if (window.localLLM) {
      return;
    }
    
    const localLLMInstance = new LocalLLM(config);
    
    // Create the window.localLLM global with the required interface
    window.localLLM = {
      // Async availability check
      available: localLLMInstance.available.bind(localLLMInstance),
      
      // OpenAI-compatible chat interface
      chat: {
        completions: {
          create: localLLMInstance.createChatCompletion.bind(localLLMInstance)
        }
      },
      
      // Legacy compatibility methods (deprecated)
      checkAvailability: localLLMInstance.checkAvailability.bind(localLLMInstance),
      getCompletion: localLLMInstance.getCompletion.bind(localLLMInstance),
      getCompletionStream: localLLMInstance.getCompletionStream.bind(localLLMInstance),
      createSession: localLLMInstance.createSession.bind(localLLMInstance),
      
      // Internal reference
      _instance: localLLMInstance
    };
  };

  // Export for both module and script contexts
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LocalLLM, Session };
  } else if (typeof self !== 'undefined') {
    self.LocalLLMScript = { LocalLLM, Session };
  } else if (typeof window !== 'undefined') {
    window.LocalLLMScript = { LocalLLM, Session };
  }
  
  // Backward compatibility - also maintain old export
  if (typeof window !== 'undefined') {
    window.UnifiedInjectedScript = {  LocalLLM, Session };
    
    // Legacy global initialization
    window.localLLM = window.localLLM;
  }
})();