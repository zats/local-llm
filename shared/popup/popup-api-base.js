// Under Construction - This API class is being redesigned
// Original functionality temporarily disabled

/*
class UnifiedPopupAPI {
  constructor(config) {
    this.config = config;
    this.platform = config.platform;
    this.sessions = new Map();
    this.sessionCounter = 0;
  }

  async checkAvailability() {
    try {
      if (this.platform === 'chrome') {
        // Chrome implementation - check with background script
        return new Promise((resolve) => {
          chrome.runtime.sendMessage({ action: 'checkAvailability' }, (response) => {
            resolve(response && response.available);
          });
        });
      } else if (this.platform === 'safari') {
        // Safari implementation - direct check
        return new Promise((resolve) => {
          browser.runtime.sendMessage({ action: 'checkAvailability' }, (response) => {
            resolve(response && response.available);
          });
        });
      }
      return false;
    } catch (error) {
      console.error('Error checking availability:', error);
      return false;
    }
  }

  async createSession(options = {}) {
    const sessionId = `session-${++this.sessionCounter}`;
    
    const session = {
      id: sessionId,
      systemPrompt: options.systemPrompt || 'You are a helpful AI assistant.',
      temperature: options.temperature || 0.8,
      maxTokens: options.maxTokens || 1024,
      samplingMode: options.samplingMode || 'top-p',
      messages: [],
      streaming: options.streaming !== false
    };
    
    this.sessions.set(sessionId, session);
    
    if (this.platform === 'chrome') {
      // Chrome uses real sessions with background script
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'createSession',
          sessionId,
          options
        }, (response) => {
          if (response && response.success) {
            resolve(session);
          } else {
            reject(new Error(response?.error || 'Failed to create session'));
          }
        });
      });
    } else if (this.platform === 'safari') {
      // Safari uses mock sessions
      return Promise.resolve(session);
    }
    
    return session;
  }

  async sendMessage(session, message) {
    if (!session || !this.sessions.has(session.id)) {
      throw new Error('Invalid session');
    }
    
    const sessionData = this.sessions.get(session.id);
    sessionData.messages.push({ role: 'user', content: message });
    
    if (this.platform === 'chrome') {
      // Chrome implementation with background script
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'sendMessage',
          sessionId: session.id,
          message
        }, (response) => {
          if (response && response.success) {
            sessionData.messages.push({ role: 'assistant', content: response.content });
            resolve(response.content);
          } else {
            reject(new Error(response?.error || 'Failed to send message'));
          }
        });
      });
    } else if (this.platform === 'safari') {
      // Safari implementation with direct API calls
      return this.getCompletionSafari(sessionData, message);
    }
    
    throw new Error('Unsupported platform');
  }

  async getCompletionSafari(session, message) {
    try {
      // Build the conversation context
      const messages = [
        { role: 'system', content: session.systemPrompt },
        ...session.messages
      ];
      
      if (session.streaming) {
        return this.getCompletionStreamSafari(messages, session);
      } else {
        return this.getCompletionDirectSafari(messages, session);
      }
    } catch (error) {
      console.error('Error getting completion:', error);
      throw error;
    }
  }

  async getCompletionDirectSafari(messages, session) {
    // Safari direct completion (non-streaming)
    return new Promise((resolve, reject) => {
      browser.runtime.sendMessage({
        action: 'getCompletion',
        messages,
        options: {
          temperature: session.temperature,
          maxTokens: session.maxTokens,
          samplingMode: session.samplingMode
        }
      }, (response) => {
        if (response && response.success) {
          resolve(response.content);
        } else {
          reject(new Error(response?.error || 'Failed to get completion'));
        }
      });
    });
  }

  async getCompletionStreamSafari(messages, session) {
    // Safari streaming completion with simulated streaming
    return new Promise((resolve, reject) => {
      browser.runtime.sendMessage({
        action: 'getCompletionStream',
        messages,
        options: {
          temperature: session.temperature,
          maxTokens: session.maxTokens,
          samplingMode: session.samplingMode
        }
      }, async (response) => {
        if (response && response.success) {
          // Simulate streaming by adding delays between chunks
          const content = response.content;
          const words = content.split(' ');
          let streamedContent = '';
          
          for (let i = 0; i < words.length; i++) {
            streamedContent += (i > 0 ? ' ' : '') + words[i];
            
            // Simulate streaming delay
            if (i < words.length - 1) {
              await this.delay(30);
            }
          }
          
          resolve(content);
        } else {
          reject(new Error(response?.error || 'Failed to get completion'));
        }
      });
    });
  }

  async destroySession(session) {
    if (session && this.sessions.has(session.id)) {
      this.sessions.delete(session.id);
      
      if (this.platform === 'chrome') {
        // Notify background script
        chrome.runtime.sendMessage({
          action: 'destroySession',
          sessionId: session.id
        });
      }
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export for use in generated platform-specific files
window.UnifiedPopupAPI = UnifiedPopupAPI;
*/