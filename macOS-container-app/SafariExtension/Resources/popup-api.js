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
      // Safari extension doesn't use sessions - create a mock session
      // that just uses the direct getCompletion/getCompletionStream methods
      const sessionId = 'safari-' + this.generateRequestId();
      
      const session = new Session(sessionId, this, options);
      this.sessions.set(sessionId, session);
      
      return session;
    }

    async getCompletion(prompt, options = {}) {
      console.log("DEBUG: getCompletion called with:", { prompt, options });
      const response = await this.sendMessage('getCompletion', { prompt, options });
      console.log("DEBUG: getCompletion received response:", response);
      
      // Handle Safari extension response format
      if (response.type === 'response' && response.data) {
        return response.data;
      } else if (response.type === 'streamResponse' && response.data && response.data.fullResponse) {
        // Sometimes Safari might return streaming format even for regular completion
        return response.data.fullResponse;
      } else {
        // Direct response format
        return response;
      }
    }

    async* getCompletionStream(prompt, options = {}) {
      console.log("DEBUG: getCompletionStream called with:", { prompt, options });
      
      try {
        // Safari extension returns all chunks at once in a streamResponse
        const response = await this.sendMessage('getCompletionStream', { prompt, options });
        console.log("DEBUG: getCompletionStream received response:", response);
        
        if (response.type === 'streamResponse' && response.data && response.data.chunks) {
          // Safari extension format: yield all chunks with a small delay to simulate streaming
          console.log("DEBUG: Processing", response.data.chunks.length, "chunks");
          
          for (const chunk of response.data.chunks) {
            console.log("DEBUG: Yielding chunk:", chunk);
            yield chunk;
            
            // Small delay to simulate streaming effect
            await new Promise(resolve => setTimeout(resolve, 30));
          }
        } else if (response.choices && response.choices[0] && response.choices[0].message) {
          // Fallback: convert regular response to a single chunk
          console.log("DEBUG: Converting regular response to stream chunk");
          
          const chunk = {
            id: response.id || 'fallback-' + Date.now(),
            object: 'chat.completion.chunk',
            created: response.created || Math.floor(Date.now() / 1000),
            choices: [{
              index: 0,
              delta: {
                role: 'assistant',
                content: response.choices[0].message.content
              },
              finish_reason: 'stop'
            }]
          };
          
          yield chunk;
        } else {
          console.error("DEBUG: Unexpected response format:", response);
          throw new Error('Unexpected response format from Safari extension');
        }
        
      } catch (error) {
        console.error("DEBUG: getCompletionStream error:", error);
        throw error;
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
        // Safari uses browser instead of chrome
        const runtime = typeof browser !== 'undefined' ? browser : chrome;
        runtime.runtime.sendMessage({ requestId, command, payload }, (response) => {
          if (runtime.runtime.lastError) {
            reject(new Error(runtime.runtime.lastError.message));
          } else if (response && response.error) {
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
    constructor(sessionId, api, options = {}) {
      this.id = sessionId;
      this.api = api;
      this.isEnded = false;
      this.options = options; // Store session options for Safari extension
    }

    async sendMessage(prompt, options = {}) {
      if (this.isEnded) {
        throw new Error('Cannot send message to an ended session');
      }

      // Safari extension doesn't use sessions - call getCompletion directly
      const combinedOptions = { ...this.options, ...options };
      const result = await this.api.sendMessage('getCompletion', {
        prompt,
        options: combinedOptions
      });
      
      return result;
    }

    async* sendMessageStream(prompt, options = {}) {
      if (this.isEnded) {
        throw new Error('Cannot send message to an ended session');
      }

      // Safari extension doesn't use sessions - call getCompletionStream directly
      const combinedOptions = { ...this.options, ...options };
      
      // Use the API's streaming method directly
      for await (const chunk of this.api.getCompletionStream(prompt, combinedOptions)) {
        yield chunk;
      }
    }

    async end() {
      if (this.isEnded) {
        return;
      }

      // Safari extension doesn't use sessions - just mark as ended
      this.isEnded = true;
      this.api._removeSession(this.id);
    }
  }

  // Expose API to popup
  window.nativeFoundationModels = new NativeFoundationModels();
})();