/**
 * Unified injected script for Native Foundation Models extension
 * Provides consistent website-facing API across Chrome and Safari
 */

(function() {
  'use strict';

  // Prevent duplicate loading
  if (typeof window.nativeFoundationModels !== 'undefined') {
    return;
  }

  class NativeFoundationModels {
    constructor(config) {
      this.config = config;
      this.sessions = new Map(); // Track active sessions
      this.requestCounter = 0;
    }

    async checkAvailability() {
      console.log('[NFM-Injected] Checking availability');
      try {
        const response = await this.sendMessage('checkAvailability');        
        console.log('[NFM-Injected] Availability response:', response);
        // Handle different response formats between Chrome and Safari
        if (response.payload) {
          // Chrome format: {type: 'availabilityResponse', payload: {...}}
          console.log('[NFM-Injected] Using Chrome response format');
          return response.payload;
        } else if (response.data) {
          // Safari format: {type: 'response', data: {...}}
          console.log('[NFM-Injected] Using Safari response format');
          return response.data;
        } else {
          // Fallback
          console.log('[NFM-Injected] Using fallback response format');
          return response;
        }
      } catch (error) {
        console.error('[NFM-Injected] Availability check failed:', error);
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

    async* getCompletionStream(prompt, options = {}) {
      console.log('[NFM-Injected] Starting completion stream for prompt:', prompt.substring(0, 50) + '...');
      // This function is designed to handle two scenarios:
      // 1. True streaming: The native connection supports sending multiple "chunks" over time (e.g., Chrome).
      // 2. Simulated streaming: The native connection is one-shot and returns a single, complete response (e.g., Safari).
      // The generator will yield the single response as if it were a one-chunk stream in the second case.
      
      const requestId = this.generateRequestId();
      console.log('[NFM-Injected] Generated request ID:', requestId);
      
      const chunks = [];
      let streamComplete = false;
      let streamError = null;
      let chunkWaiters = [];
      
      const messageHandler = (event) => {
        console.log('[NFM-Injected] Received message event:', event.data);
        if (event.data && event.data.type === this.config.messaging.responseType && event.data.requestId === requestId) {
          console.log('[NFM-Injected] Processing response for requestId:', requestId);
          const { success, data, error } = event.data;
          
          if (!success) {
            console.error('[NFM-Injected] Stream error:', error);
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
          console.log('[NFM-Injected] Response data:', responseData);
          console.log('[NFM-Injected] Response object type:', responseData.object);
          
          // Check if this is a streaming chunk or a single complete response
          if (responseData.object === 'chat.completion.chunk') {
            // This is a standard streaming chunk
            console.log('[NFM-Injected] Processing streaming chunk');
            chunks.push(responseData);
          } else if (responseData.object === 'chat.completion') {
            // This is a single, complete response (Safari behavior).
            // We simulate a stream by treating it as the only chunk.
            console.log('[NFM-Injected] Processing single complete response (Safari mode)');
            chunks.push({
              ...responseData,
              object: 'chat.completion.chunk', // Normalize to a chunk object
            });
            streamComplete = true;
          } else if (responseData.object === 'chat.completion.stream' && responseData.chunks) {
            // This is Safari's bundled streaming response
            console.log('[NFM-Injected] Processing Safari bundled stream with', responseData.chunks.length, 'chunks');
            // Add artificial delay between chunks for Safari to simulate streaming
            const addChunksWithDelay = async () => {
              for (const chunk of responseData.chunks) {
                chunks.push(chunk);
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
          }
          
          // Handle stream end signal
          if (data.type === 'streamEnd') {
            console.log('[NFM-Injected] Stream end signal received');
            streamComplete = true;
          }
          
          console.log('[NFM-Injected] Current chunks count:', chunks.length, 'streamComplete:', streamComplete);
          
          // Wake up the generator loop
          chunkWaiters.forEach(resolve => resolve());
          chunkWaiters = [];
        }
      };
      
      window.addEventListener('message', messageHandler);
      console.log('[NFM-Injected] Added message listener');
      
      try {
        // Send unified message format
        const requestMessage = {
          type: this.config.messaging.requestType,
          requestId,
          command: 'getCompletionStream',
          payload: { prompt, ...options }
        };
        console.log('[NFM-Injected] Sending request message:', requestMessage);
        window.postMessage(requestMessage, '*');
        
        // Yield chunks as they arrive
        let chunkIndex = 0;
        while (true) {
          console.log('[NFM-Injected] Generator loop - chunkIndex:', chunkIndex, 'chunks.length:', chunks.length, 'streamComplete:', streamComplete);
          
          if (streamError) {
            console.error('[NFM-Injected] Throwing stream error:', streamError);
            throw streamError;
          }
          
          while (chunkIndex < chunks.length) {
            console.log('[NFM-Injected] Yielding chunk at index:', chunkIndex);
            yield chunks[chunkIndex];
            chunkIndex++;
          }
          
          if (streamComplete && chunkIndex >= chunks.length) {
            console.log('[NFM-Injected] Stream complete, breaking loop');
            break;
          }
          
          console.log('[NFM-Injected] Waiting for more chunks...');
          await new Promise(resolve => {
            chunkWaiters.push(resolve);
          });
        }
      } finally {
        console.log('[NFM-Injected] Removing message listener');
        window.removeEventListener('message', messageHandler);
      }
    }

    async sendMessage(command, payload = {}) {
      console.log('[NFM-Injected] Sending message - command:', command, 'payload:', payload);
      const requestId = this.generateRequestId();
      console.log('[NFM-Injected] Generated requestId for sendMessage:', requestId);
      
      return new Promise((resolve, reject) => {
        const messageHandler = (event) => {
          console.log('[NFM-Injected] sendMessage received event:', event.data);
          if (event.data.type === this.config.messaging.responseType && event.data.requestId === requestId) {
            console.log('[NFM-Injected] Found matching response for requestId:', requestId);
            window.removeEventListener('message', messageHandler);
            
            const { success, data, error } = event.data;
            if (success) {
              console.log('[NFM-Injected] sendMessage success, resolving with:', data);
              resolve(data);
            } else {
              console.error('[NFM-Injected] sendMessage error:', error);
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
        console.log('[NFM-Injected] Posting message:', message);
        window.postMessage(message, '*');
        
        // Timeout after 30 seconds
        setTimeout(() => {
          console.warn('[NFM-Injected] Request timeout for requestId:', requestId);
          window.removeEventListener('message', messageHandler);
          reject(new Error('Request timeout'));
        }, 30000);
      });
    }

    generateRequestId() {
      const id = 'req-' + Math.random().toString(36).substr(2, 9);
      console.log('[NFM-Injected] Generated new requestId:', id);
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

  // Export for both module and script contexts
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NativeFoundationModels, Session };
  } else if (typeof self !== 'undefined') {
    self.UnifiedInjectedScript = { NativeFoundationModels, Session };
  } else if (typeof window !== 'undefined') {
    window.UnifiedInjectedScript = { NativeFoundationModels, Session };
  }
})();