// Injected script that provides the website-facing API
(function() {
  'use strict';

  class NativeFoundationModels {
    constructor() {
      // Extension ID not needed in injected script
      this.sessions = new Map(); // Track active sessions
    }

    async checkAvailability() {
      try {
        const response = await this.sendMessage('checkAvailability');
        // Return OpenAI-compatible availability response
        return response.payload;
      } catch (error) {
        // For checkAvailability, we always want to show the dialog on error
        if (window.nfmDownloadDialog) {
          window.nfmDownloadDialog.show();
        }
        // Return OpenAI-compatible error format
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
      const sessionId = result.payload.sessionId;
      
      const session = new Session(sessionId, this);
      this.sessions.set(sessionId, session);
      
      return session;
    }

    async getCompletion(prompt, options = {}) {
      try {
        const response = await this.sendMessage('getCompletion', { prompt, ...options });
        // Return the full OpenAI-compatible response format
        return response.payload;
      } catch (error) {
        // Return OpenAI-compatible error format
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
      const requestId = this.generateRequestId();
      
      const chunks = [];
      let streamComplete = false;
      let streamError = null;
      let chunkWaiters = [];
      
      const messageHandler = (event) => {
          console.log("💬 Message received:", event.data);
        if (event.data.type === 'nativefoundationmodels-response' && event.data.requestId === requestId) {
          const { success, data, error } = event.data;
          if (!success) {
            // Check if it's a native app not found error
            console.log('NativeFoundationModels streaming error:', error, 'errorType:', event.data.errorType);
            if (event.data.errorType === 'NATIVE_APP_NOT_FOUND' && window.nfmDownloadDialog) {
              window.nfmDownloadDialog.show();
            } else if (error && error.toLowerCase().includes('not available') && window.nfmDownloadDialog) {
              // Also show dialog for "LLM not available" errors
              window.nfmDownloadDialog.show();
            }
            streamError = {
              error: {
                message: error,
                type: 'stream_error',
                code: 'stream_failed'
              }
            };
            streamComplete = true;
            // Wake up any waiting promises
            chunkWaiters.forEach(resolve => resolve());
            chunkWaiters = [];
            return;
          }
          
          if (data.type === 'streamChunk') {
            // Yield the full OpenAI-compatible chunk
            chunks.push(data.payload);
            // Wake up any waiting promises
            chunkWaiters.forEach(resolve => resolve());
            chunkWaiters = [];
          } else if (data.type === 'streamEnd') {
            // Yield the final chunk
            chunks.push(data.payload);
            streamComplete = true;
            // Wake up any waiting promises
            chunkWaiters.forEach(resolve => resolve());
            chunkWaiters = [];
          } else if (data.type === 'error') {
            streamError = {
              error: {
                message: data.payload.error?.message || data.payload.message,
                type: 'stream_error',
                code: 'stream_failed'
              }
            };
            streamComplete = true;
            // Wake up any waiting promises
            chunkWaiters.forEach(resolve => resolve());
            chunkWaiters = [];
          }
        }
      };
      
      window.addEventListener('message', messageHandler);
      
      try {
        // Start the streaming request
        window.postMessage({
          type: 'nativefoundationmodels-request',
          requestId,
          command: 'getCompletionStream',
          payload: { prompt, ...options }
        }, '*');
        
        // Yield OpenAI-compatible chunks as they arrive
        let chunkIndex = 0;
        while (true) {
          if (streamError) {
            throw streamError;
          }
          
          // Yield any new chunks that have arrived
          while (chunkIndex < chunks.length) {
            yield chunks[chunkIndex];
            chunkIndex++;
          }
          
          // If we've yielded all chunks and stream is complete, we're done
          if (streamComplete && chunkIndex >= chunks.length) {
            break;
          }
          
          // Wait for more chunks to arrive
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
          if (event.data.type === 'nativefoundationmodels-response' && event.data.requestId === requestId) {
            window.removeEventListener('message', messageHandler);
            
            const { success, data, error } = event.data;
            if (success) {
              resolve(data);
            } else {
              // Check if it's a native app not found error
              console.log('NativeFoundationModels error:', error, 'errorType:', event.data.errorType);
              if (event.data.errorType === 'NATIVE_APP_NOT_FOUND' && window.nfmDownloadDialog) {
                window.nfmDownloadDialog.show();
              } else if (error && error.toLowerCase().includes('not available') && window.nfmDownloadDialog) {
                // Also show dialog for "LLM not available" errors
                window.nfmDownloadDialog.show();
              }
              reject(new Error(error, { cause: event.data }));
            }
          }
        };
        
        window.addEventListener('message', messageHandler);
        
        window.postMessage({
          type: 'nativefoundationmodels-request',
          requestId,
          command,
          payload
        }, '*');
        
        // Timeout after 30 seconds
        setTimeout(() => {
          window.removeEventListener('message', messageHandler);
          reject(new Error('Request timeout'));
        }, 30000);
      });
    }

    generateRequestId() {
      return 'req-' + Math.random().toString(36).substr(2, 9);
    }

    // Internal method to clean up session
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
        
        // Return OpenAI-compatible format (remove sessionId for API compatibility)
        const { sessionId, ...openAIResponse } = result.payload;
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
        if (event.data.type === 'nativefoundationmodels-response' && event.data.requestId === requestId) {
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
          
          if (data.type === 'streamChunk' && data.payload.sessionId === this.id) {
            // Yield the full OpenAI-compatible chunk (excluding sessionId for API compatibility)
            const { sessionId, ...openAIChunk } = data.payload;
            chunks.push(openAIChunk);
            chunkWaiters.forEach(resolve => resolve());
            chunkWaiters = [];
          } else if (data.type === 'streamEnd' && data.payload.sessionId === this.id) {
            // Yield the final chunk (excluding sessionId)
            const { sessionId, ...openAIChunk } = data.payload;
            chunks.push(openAIChunk);
            streamComplete = true;
            chunkWaiters.forEach(resolve => resolve());
            chunkWaiters = [];
          } else if (data.type === 'error' && data.payload.sessionId === this.id) {
            streamError = {
              error: {
                message: data.payload.error?.message || data.payload.message,
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
        // Start the streaming request
        window.postMessage({
          type: 'nativefoundationmodels-request',
          requestId,
          command: 'sendPlaygroundMessage',
          payload: { sessionId: this.id, prompt, ...options }
        }, '*');
        
        // Yield OpenAI-compatible chunks as they arrive
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

  // Message forwarding is now handled by content script

  // Expose API to websites
  window.nativeFoundationModels = new NativeFoundationModels();
})();