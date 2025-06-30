// Injected script that provides the website-facing API
(function() {
  'use strict';

  class NativeFoundationModels {
    constructor() {
      // Extension ID not needed in injected script
    }

    async checkAvailability() {
      return this.sendMessage('checkAvailability');
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
  }

  // Message forwarding is now handled by content script

  // Expose API to websites
  window.nativeFoundationModels = new NativeFoundationModels();
})();