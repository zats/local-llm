// API bridge for popup to use the same API as websites
(function() {
  'use strict';

  class NativeFoundationModels {
    constructor() {
      this.sessions = new Map(); // Track active sessions
    }

    async checkAvailability() {
      return this.sendMessage('checkAvailability');
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
      
      const messageHandler = (message) => {
        if (message.requestId === requestId) {
          if (message.type === 'streamChunk') {
            tokens.push(message.payload.token);
            tokenWaiters.forEach(resolve => resolve());
            tokenWaiters = [];
          } else if (message.type === 'streamEnd') {
            streamComplete = true;
            tokenWaiters.forEach(resolve => resolve());
            tokenWaiters = [];
          } else if (message.type === 'error') {
            streamError = new Error(message.payload.message);
            streamComplete = true;
            tokenWaiters.forEach(resolve => resolve());
            tokenWaiters = [];
          }
        }
      };
      
      chrome.runtime.onMessage.addListener(messageHandler);
      
      try {
        // Send the streaming request
        await this.sendToBackground('getCompletionStream', { prompt, ...options }, requestId);
        
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
        chrome.runtime.onMessage.removeListener(messageHandler);
      }
    }

    async sendMessage(command, payload = {}) {
      const requestId = this.generateRequestId();
      return this.sendToBackground(command, payload, requestId);
    }

    async sendToBackground(command, payload = {}, requestId = null) {
      if (!requestId) {
        requestId = this.generateRequestId();
      }
      
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ requestId, command, payload }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        });
      });
    }

    generateRequestId() {
      return 'popup-' + Math.random().toString(36).substr(2, 9);
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
      
      const messageHandler = (message) => {
        if (message.requestId === requestId) {
          if (message.type === 'streamChunk' && message.payload.sessionId === this.id) {
            const newToken = message.payload.token;
            const currentContent = tokens.join('');
            
            // Check if this is cumulative or incremental
            if (tokens.length === 0) {
              // First token
              tokens.push(newToken);
            } else {
              // Check if it's cumulative (contains previous content)
              if (newToken.startsWith(currentContent)) {
                // It's cumulative - extract only the new part
                const newPart = newToken.slice(currentContent.length);
                if (newPart) {
                  tokens.push(newPart);
                }
              } else {
                // It's incremental
                tokens.push(newToken);
              }
            }
            tokenWaiters.forEach(resolve => resolve());
            tokenWaiters = [];
          } else if (message.type === 'streamEnd' && message.payload.sessionId === this.id) {
            streamComplete = true;
            tokenWaiters.forEach(resolve => resolve());
            tokenWaiters = [];
          } else if (message.type === 'error' && message.payload.sessionId === this.id) {
            streamError = new Error(message.payload.message);
            streamComplete = true;
            tokenWaiters.forEach(resolve => resolve());
            tokenWaiters = [];
          }
        }
      };
      
      chrome.runtime.onMessage.addListener(messageHandler);
      
      try {
        // Send the streaming request  
        await this.api.sendToBackground('sendPlaygroundMessage', {
          sessionId: this.id, 
          prompt, 
          ...options
        }, requestId);
        
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
        chrome.runtime.onMessage.removeListener(messageHandler);
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

  // Expose API to popup
  window.nativeFoundationModels = new NativeFoundationModels();
})();