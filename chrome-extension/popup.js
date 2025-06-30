// Popup playground functionality
class ChromeLLMPlayground {
  constructor() {
    this.currentSessionId = null;
    this.isGenerating = false;
    this.streamingContent = '';
    this.temperature = 0.8;
    this.maxTokens = 1024;
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
    this.settingsBtn = document.getElementById('settingsBtn');
    this.backBtn = document.getElementById('backBtn');
    this.settingsView = document.getElementById('settingsView');
    this.tempValueSpan = document.getElementById('tempValue');
    this.tempUpBtn = document.getElementById('tempUp');
    this.tempDownBtn = document.getElementById('tempDown');
    this.tokensValueSpan = document.getElementById('tokensValue');
    this.tokensUpBtn = document.getElementById('tokensUp');
    this.tokensDownBtn = document.getElementById('tokensDown');
    this.samplingModeSelect = document.getElementById('samplingMode');
  }

  setupEventListeners() {
    this.sendBtn.addEventListener('click', () => this.sendMessage());
    this.newChatBtn.addEventListener('click', () => this.startNewChat());
    this.settingsBtn.addEventListener('click', () => this.showSettings());
    this.backBtn.addEventListener('click', () => this.hideSettings());
    
    this.promptInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    
    // Temperature stepper controls
    this.tempUpBtn.addEventListener('click', () => this.adjustTemperature(0.1));
    this.tempDownBtn.addEventListener('click', () => this.adjustTemperature(-0.1));
    
    // Max tokens stepper controls
    this.tokensUpBtn.addEventListener('click', () => this.adjustMaxTokens(50));
    this.tokensDownBtn.addEventListener('click', () => this.adjustMaxTokens(-50));

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
        this.statusEl.className = 'status ready';
      } else {
        this.statusEl.textContent = 'LLM not available';
        this.statusEl.className = 'status error';
      }
    } catch (error) {
      this.statusEl.textContent = 'Connection error: ' + error.message;
      this.statusEl.className = 'status error';
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
      this.statusEl.className = 'status ready';
    } catch (error) {
      this.statusEl.textContent = 'Failed to start new chat';
      this.statusEl.className = 'status error';
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
        temperature: this.temperature,
        maximumResponseTokens: this.maxTokens
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
    this.statusEl.className = 'status ready';
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

  showSettings() {
    this.settingsView.classList.add('active');
  }
  
  hideSettings() {
    this.settingsView.classList.remove('active');
  }
  
  adjustTemperature(delta) {
    this.temperature = Math.max(0, Math.min(2, this.temperature + delta));
    this.temperature = Math.round(this.temperature * 10) / 10; // Round to 1 decimal
    this.tempValueSpan.textContent = this.temperature.toFixed(1);
    
    // Update button states
    this.tempDownBtn.disabled = this.temperature <= 0;
    this.tempUpBtn.disabled = this.temperature >= 2;
  }
  
  adjustMaxTokens(delta) {
    this.maxTokens = Math.max(1, Math.min(2048, this.maxTokens + delta));
    this.tokensValueSpan.textContent = this.maxTokens;
    
    // Update button states
    this.tokensDownBtn.disabled = this.maxTokens <= 1;
    this.tokensUpBtn.disabled = this.maxTokens >= 2048;
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