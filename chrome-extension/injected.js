// Injected script that provides the website-facing API
(function() {
  'use strict';

  class ChromeNativeLLM {
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
      
      return new Promise((resolve, reject) => {
        const messageHandler = (event) => {
          if (event.data.type === 'chromellm-response' && event.data.requestId === requestId) {
            const { success, data, error } = event.data;
            
            if (!success) {
              window.removeEventListener('message', messageHandler);
              reject(new Error(error));
              return;
            }
            
            if (data.type === 'streamChunk') {
              // Create async iterator
              const iterator = {
                async *[Symbol.asyncIterator]() {
                  yield data.payload.token;
                }
              };
              resolve(iterator);
            } else if (data.type === 'streamEnd') {
              window.removeEventListener('message', messageHandler);
            } else if (data.type === 'error') {
              window.removeEventListener('message', messageHandler);
              reject(new Error(data.payload.message));
            }
          }
        };
        
        window.addEventListener('message', messageHandler);
        
        window.postMessage({
          type: 'chromellm-request',
          requestId,
          command: 'getCompletionStream',
          payload: { prompt, ...options }
        }, '*');
      });
    }

    async sendMessage(command, payload = {}) {
      const requestId = this.generateRequestId();
      
      return new Promise((resolve, reject) => {
        const messageHandler = (event) => {
          if (event.data.type === 'chromellm-response' && event.data.requestId === requestId) {
            window.removeEventListener('message', messageHandler);
            
            const { success, data, error } = event.data;
            if (success) {
              resolve(data);
            } else {
              reject(new Error(error));
            }
          }
        };
        
        window.addEventListener('message', messageHandler);
        
        window.postMessage({
          type: 'chromellm-request',
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
  window.chromeNativeLLM = new ChromeNativeLLM();
})();