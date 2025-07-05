class ChatManager {
  constructor() {
    this.messages = [];
    this.systemPrompt = 'You are a helpful assistant.';
    this.isStreaming = false;
    this.initializeElements();
    this.loadPersistedSystemPrompt();
    this.attachEventListeners();
  }

  initializeElements() {
    this.systemPromptInput = document.getElementById('systemPrompt');
    this.chatMessages = document.getElementById('chatMessages');
    this.messageInput = document.getElementById('messageInput');
    this.sendButton = document.getElementById('sendButton');
  }

  attachEventListeners() {
    this.sendButton.addEventListener('click', () => this.sendMessage());
    this.messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    
    this.systemPromptInput.addEventListener('change', () => {
      this.systemPrompt = this.systemPromptInput.value;
      this.persistSystemPrompt();
      this.resetChat();
    });
  }

  loadPersistedSystemPrompt() {
    try {
      const savedPrompt = localStorage.getItem('nfm-system-prompt');
      if (savedPrompt) {
        this.systemPrompt = savedPrompt;
        if (this.systemPromptInput) {
          this.systemPromptInput.value = savedPrompt;
        }
      }
    } catch (error) {
      console.warn('Could not load persisted system prompt:', error);
    }
  }

  persistSystemPrompt() {
    try {
      localStorage.setItem('nfm-system-prompt', this.systemPrompt);
    } catch (error) {
      console.warn('Could not persist system prompt:', error);
    }
  }

  resetChat() {
    this.messages = [];
    this.chatMessages.innerHTML = '';
  }

  addMessage(content, role) {
    const messageEl = document.createElement('div');
    messageEl.className = `message ${role}`;
    messageEl.textContent = content;
    this.chatMessages.appendChild(messageEl);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    return messageEl;
  }

  async sendMessage() {
    const message = this.messageInput.value.trim();
    if (!message || this.isStreaming) return;

    this.addMessage(message, 'user');
    this.messages.push({ role: 'user', content: message });
    
    this.messageInput.value = '';
    this.messageInput.disabled = true;
    this.sendButton.disabled = true;
    this.isStreaming = true;

    const assistantMessageEl = this.addMessage('...', 'assistant');
    assistantMessageEl.classList.add('streaming', 'typing-indicator');

    try {
      const response = await this.streamCompletion(assistantMessageEl);
      this.messages.push({ role: 'assistant', content: response });
    } catch (error) {
      assistantMessageEl.textContent = 'Error: ' + error.message;
      assistantMessageEl.classList.add('error');
    } finally {
      assistantMessageEl.classList.remove('streaming', 'typing-indicator');
      this.messageInput.disabled = false;
      this.sendButton.disabled = false;
      this.isStreaming = false;
      this.messageInput.focus();
    }
  }

  async streamCompletion(messageElement) {
    if (!window.localLLM || !window.localLLM.chat) {
      throw new Error('LocalLLM API not available');
    }

    const messages = [
      { role: 'system', content: this.systemPrompt },
      ...this.messages
    ];

    let fullResponse = '';
    let firstChunkReceived = false;
    
    try {
      const stream = await window.localLLM.chat.completions.create({
        messages,
        stream: true,
        model: 'gpt-4'
      });

      for await (const chunk of stream) {
        const content = chunk.choices?.[0]?.delta?.content || '';
        if (content) {
          if (!firstChunkReceived) {
            messageElement.classList.remove('typing-indicator');
            messageElement.textContent = '';
            firstChunkReceived = true;
          }
          fullResponse += content;
          messageElement.textContent = fullResponse;
          this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }
      }
    } catch (error) {
      console.error('Streaming error:', error);
      throw error;
    }

    return fullResponse;
  }
}

class UnifiedPopup {
  constructor(config) {
    this.config = config;
    this.chatManager = new ChatManager();
    this.attachPlatformButtons();
  }

  attachPlatformButtons() {
    // Handle new chat button
    const newChatBtn = document.getElementById('newChatBtn');
    if (newChatBtn) {
      newChatBtn.addEventListener('click', () => {
        this.chatManager.resetChat();
      });
    }

    // Handle export code button
    const exportCodeBtn = document.getElementById('exportCodeBtn');
    if (exportCodeBtn) {
      exportCodeBtn.addEventListener('click', () => {
        this.exportAsCode();
      });
    }

    // Handle open playground button (Safari only)
    const openPlaygroundBtn = document.getElementById('openPlaygroundBtn');
    if (openPlaygroundBtn) {
      openPlaygroundBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('playground.html') });
      });
    }
  }

  exportAsCode() {
    const messages = this.chatManager.messages;
    const systemPrompt = this.chatManager.systemPrompt;
    
    const code = `// Chat export from Native Foundation Models extension
const messages = ${JSON.stringify([
      { role: 'system', content: systemPrompt },
      ...messages
    ], null, 2)};

// Example usage with localLLM API
async function runChat() {
  if (window.localLLM && await window.localLLM.available()) {
    const response = await window.localLLM.chat.completions.create({
      messages: messages,
      stream: true
    });
    
    for await (const chunk of response) {
      process.stdout.write(chunk.choices[0]?.delta?.content || '');
    }
  }
}`;

    // Copy to clipboard
    navigator.clipboard.writeText(code).then(() => {
      // Show feedback
      const btn = document.getElementById('exportCodeBtn');
      const originalText = btn.textContent;
      btn.textContent = '✓';
      setTimeout(() => {
        btn.textContent = originalText;
      }, 2000);
    });
  }
}