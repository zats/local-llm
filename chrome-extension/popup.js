// Popup playground functionality
class ChromeLLMPlayground {
  constructor() {
    this.currentSessionId = null;
    this.isGenerating = false;
    this.streamingContent = '';
    this.initializeElements();
    this.setupEventListeners();
    this.checkAvailability();
  }

  initializeElements() {
    this.statusEl = document.getElementById('status');
    this.chatContainer = document.getElementById('chatContainer');
    this.promptInput = document.getElementById('promptInput');
    this.sendBtn = document.getElementById('sendBtn');
    this.newChatBtn = document.getElementById('newChatBtn');
    this.temperatureSlider = document.getElementById('temperature');
    this.tempValueSpan = document.getElementById('tempValue');
    this.maxTokensInput = document.getElementById('maxTokens');
    this.samplingModeSelect = document.getElementById('samplingMode');
  }

  setupEventListeners() {
    this.sendBtn.addEventListener('click', () => this.sendMessage());
    this.newChatBtn.addEventListener('click', () => this.startNewChat());
    this.promptInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    
    this.temperatureSlider.addEventListener('input', (e) => {
      this.tempValueSpan.textContent = e.target.value;
    });

    // Listen for streaming messages from background
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'streamChunk') {
        this.handleStreamChunk(message.payload);
      } else if (message.type === 'streamEnd') {
        this.handleStreamEnd(message.payload);
      } else if (message.type === 'error') {
        this.handleStreamError(message.payload);
      }
    });
  }

  async checkAvailability() {
    try {
      const response = await this.sendToBackground('checkAvailability');
      if (response.available) {
        this.statusEl.textContent = 'Ready';
        this.statusEl.style.color = '#28a745';
      } else {
        this.statusEl.textContent = 'LLM not available';
        this.statusEl.style.color = '#dc3545';
      }
    } catch (error) {
      this.statusEl.textContent = 'Connection error' + error.message;
      this.statusEl.style.color = '#dc3545';
    }
  }

  async startNewChat() {
    try {
      if (this.currentSessionId) {
        await this.sendToBackground('endPlaygroundSession', { 
          sessionId: this.currentSessionId 
        });
      }

      const response = await this.sendToBackground('startPlaygroundSession');
      this.currentSessionId = response.payload.sessionId;
      
      // Clear chat
      this.chatContainer.innerHTML = `
        <div class="message assistant">
          Hello! I'm your on-device LLM assistant. Ask me anything!
        </div>
      `;
      
      this.statusEl.textContent = 'New chat started';
      this.statusEl.style.color = '#28a745';
    } catch (error) {
      this.statusEl.textContent = 'Failed to start new chat';
      this.statusEl.style.color = '#dc3545';
    }
  }

  async sendMessage() {
    const prompt = this.promptInput.value.trim();
    if (!prompt || this.isGenerating) return;

    // Start session if needed
    if (!this.currentSessionId) {
      await this.startNewChat();
    }

    // Add user message to chat
    this.addMessage(prompt, 'user');
    this.promptInput.value = '';
    
    // Disable input
    this.isGenerating = true;
    this.sendBtn.disabled = true;
    this.statusEl.textContent = 'Generating...';

    try {
      // Prepare message payload
      const payload = {
        sessionId: this.currentSessionId,
        prompt: prompt,
        temperature: parseFloat(this.temperatureSlider.value),
        maximumResponseTokens: parseInt(this.maxTokensInput.value)
      };

      // Send to background (streaming will be handled by message listener)
      await this.sendToBackground('sendPlaygroundMessage', payload);
      
      // Add empty assistant message for streaming
      this.currentAssistantMessage = this.addMessage('', 'assistant');
      this.streamingContent = '';
      
    } catch (error) {
      this.addMessage('Error: ' + error.message, 'assistant');
      this.resetGenerating();
    }
  }

  handleStreamChunk(payload) {
    if (payload.sessionId === this.currentSessionId && this.currentAssistantMessage) {
      console.log('Received token:', JSON.stringify(payload.token));
      
      // Check if this is a cumulative response or individual token
      if (payload.token.startsWith(this.streamingContent)) {
        // It's cumulative - extract only the new part
        const newContent = payload.token.slice(this.streamingContent.length);
        this.currentAssistantMessage.textContent += newContent;
        this.streamingContent = payload.token;
      } else {
        // It's an individual token
        this.currentAssistantMessage.textContent += payload.token;
        this.streamingContent += payload.token;
      }
      
      this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }
  }

  handleStreamEnd(payload) {
    if (payload.sessionId === this.currentSessionId) {
      this.resetGenerating();
    }
  }

  handleStreamError(payload) {
    if (payload.sessionId === this.currentSessionId) {
      this.addMessage('Error: ' + payload.message, 'assistant');
      this.resetGenerating();
    }
  }

  resetGenerating() {
    this.isGenerating = false;
    this.sendBtn.disabled = false;
    this.statusEl.textContent = 'Ready';
    this.statusEl.style.color = '#28a745';
    this.currentAssistantMessage = null;
  }

  addMessage(content, role) {
    const messageEl = document.createElement('div');
    messageEl.className = `message ${role}`;
    messageEl.textContent = content;
    this.chatContainer.appendChild(messageEl);
    this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    return messageEl;
  }

  sendToBackground(command, payload = {}) {
    return new Promise((resolve, reject) => {
      const requestId = 'popup-' + Math.random().toString(36).substr(2, 9);
      
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
}

// Initialize playground when popup loads
document.addEventListener('DOMContentLoaded', () => {
  new ChromeLLMPlayground();
});