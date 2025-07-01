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
        return await this.sendMessage('checkAvailability');
      } catch (error) {
        // For checkAvailability, we always want to show the dialog on error
        if (window.nfmDownloadDialog) {
          window.nfmDownloadDialog.show();
        }
        throw error;
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
      return this.sendMessage('getCompletion', { prompt, ...options });
    }

    async* getCompletionStream(prompt, options = {}) {
      const requestId = this.generateRequestId();
      
      const tokens = [];
      let streamComplete = false;
      let streamError = null;
      let tokenWaiters = [];
      
      const messageHandler = (event) => {
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
            streamError = new Error(error);
            streamComplete = true;
            // Wake up any waiting promises
            tokenWaiters.forEach(resolve => resolve());
            tokenWaiters = [];
            return;
          }
          
          if (data.type === 'streamChunk') {
            tokens.push(data.payload.token);
            // Wake up any waiting promises
            tokenWaiters.forEach(resolve => resolve());
            tokenWaiters = [];
          } else if (data.type === 'streamEnd') {
            streamComplete = true;
            // Wake up any waiting promises
            tokenWaiters.forEach(resolve => resolve());
            tokenWaiters = [];
          } else if (data.type === 'error') {
            streamError = new Error(data.payload.message);
            streamComplete = true;
            // Wake up any waiting promises
            tokenWaiters.forEach(resolve => resolve());
            tokenWaiters = [];
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
        
        // Yield tokens as they arrive
        let tokenIndex = 0;
        while (true) {
          if (streamError) {
            throw streamError;
          }
          
          // Yield any new tokens that have arrived
          while (tokenIndex < tokens.length) {
            yield tokens[tokenIndex];
            tokenIndex++;
          }
          
          // If we've yielded all tokens and stream is complete, we're done
          if (streamComplete && tokenIndex >= tokens.length) {
            break;
          }
          
          // Wait for more tokens to arrive
          await new Promise(resolve => {
            tokenWaiters.push(resolve);
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
              // For getCompletion, extract the response text from payload
              if (command === 'getCompletion' && data.payload && data.payload.response) {
                resolve({ response: data.payload.response });
              } else {
                resolve(data);
              }
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

      const result = await this.api.sendMessage('sendPlaygroundMessage', {
        sessionId: this.id,
        prompt,
        ...options
      });
      
      return result.payload?.response || result;
    }

    async* sendMessageStream(prompt, options = {}) {
      if (this.isEnded) {
        throw new Error('Cannot send message to an ended session');
      }

      const requestId = this.api.generateRequestId();
      
      const tokens = [];
      let streamComplete = false;
      let streamError = null;
      let tokenWaiters = [];
      
      const messageHandler = (event) => {
        if (event.data.type === 'nativefoundationmodels-response' && event.data.requestId === requestId) {
          const { success, data, error } = event.data;
          
          if (!success) {
            streamError = new Error(error);
            streamComplete = true;
            tokenWaiters.forEach(resolve => resolve());
            tokenWaiters = [];
            return;
          }
          
          if (data.type === 'streamChunk' && data.payload.sessionId === this.id) {
            tokens.push(data.payload.token);
            tokenWaiters.forEach(resolve => resolve());
            tokenWaiters = [];
          } else if (data.type === 'streamEnd' && data.payload.sessionId === this.id) {
            streamComplete = true;
            tokenWaiters.forEach(resolve => resolve());
            tokenWaiters = [];
          } else if (data.type === 'error' && data.payload.sessionId === this.id) {
            streamError = new Error(data.payload.message);
            streamComplete = true;
            tokenWaiters.forEach(resolve => resolve());
            tokenWaiters = [];
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
        
        // Yield tokens as they arrive
        let tokenIndex = 0;
        while (true) {
          if (streamError) {
            throw streamError;
          }
          
          while (tokenIndex < tokens.length) {
            yield tokens[tokenIndex];
            tokenIndex++;
          }
          
          if (streamComplete && tokenIndex >= tokens.length) {
            break;
          }
          
          await new Promise(resolve => {
            tokenWaiters.push(resolve);
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