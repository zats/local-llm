// Popup playground functionality
class NativeFoundationModelsPlayground {
  constructor() {
    this.currentSession = null; // Now stores Session object instead of ID
    this.isGenerating = false;
    this.streamingContent = '';
    this.temperature = 0.8;
    this.maxTokens = 1024;
    this.samplingMode = 'top-p'; // Maps to .topP() with default parameters
    this.systemPrompt = 'You are a helpful, knowledgeable, and concise AI assistant. Provide clear, accurate responses while being friendly and professional.';
    
    // Temporary settings for the settings dialog
    this.tempSettings = {};
    
    // Get reference to the unified API
    this.api = window.nativeFoundationModels;
    
    this.initializeElements();
    this.setupEventListeners();
    this.loadSettings();
    
    // Delay the availability check slightly to allow background script to initialize
    setTimeout(() => this.checkAvailability(), 100);
  }

  initializeElements() {
    this.statusEl = document.getElementById('status');
    this.chatContainer = document.getElementById('chatContainer');
    this.emptyState = document.getElementById('emptyState');
    this.promptInput = document.getElementById('promptInput');
    this.sendBtn = document.getElementById('sendBtn');
    this.newChatBtn = document.getElementById('newChatBtn');
    this.settingsBtn = document.getElementById('settingsBtn');
    this.cancelBtn = document.getElementById('cancelBtn');
    this.saveBtn = document.getElementById('saveBtn');
    this.settingsView = document.getElementById('settingsView');
    this.settingsBackdrop = document.getElementById('settingsBackdrop');
    this.systemPromptInput = document.getElementById('systemPrompt');
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
    this.cancelBtn.addEventListener('click', () => this.cancelSettings());
    this.saveBtn.addEventListener('click', () => this.saveSettings());
    this.settingsBackdrop.addEventListener('click', () => this.cancelSettings());
    
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
    
    // System prompt input - store temporarily
    this.systemPromptInput.addEventListener('input', () => {
      this.tempSettings.systemPrompt = this.systemPromptInput.value;
    });
    
    // Select all text when system prompt is focused
    this.systemPromptInput.addEventListener('focus', () => {
      this.systemPromptInput.select();
    });
    
    // Sampling mode dropdown - store temporarily
    this.samplingModeSelect.addEventListener('change', () => {
      this.tempSettings.samplingMode = this.samplingModeSelect.value;
    });

    // Streaming is now handled directly by the unified API
  }

  async checkAvailability() {
    try {
      console.log('Checking LLM availability...');
      const response = await this.api.checkAvailability();
      console.log('Availability response:', response);
      
      if (response && response.payload && response.payload.available) {
        this.statusEl.textContent = 'Ready';
        this.statusEl.className = 'status ready';
      } else {
        // If checkAvailability fails, try a different approach
        console.log('Initial availability check failed, trying fallback...');
        this.tryFallbackAvailabilityCheck();
      }
    } catch (error) {
      console.log('Availability check error:', error);
      // If the availability check fails, try a fallback
      this.tryFallbackAvailabilityCheck();
    }
  }
  
  async tryFallbackAvailabilityCheck() {
    try {
      // Try to start a session as a way to test availability
      const session = await this.api.createSession();
      if (session && session.id) {
        // If we can start a session, LLM is available
        this.statusEl.textContent = 'Ready';
        this.statusEl.className = 'status ready';
        
        // Clean up the test session
        await session.end();
      } else {
        // One more retry after a short delay
        setTimeout(() => this.finalAvailabilityRetry(), 500);
      }
    } catch (error) {
      // One more retry after a short delay
      setTimeout(() => this.finalAvailabilityRetry(), 500);
    }
  }
  
  async finalAvailabilityRetry() {
    try {
      const session = await this.api.createSession();
      if (session && session.id) {
        this.statusEl.textContent = 'Ready';
        this.statusEl.className = 'status ready';
        
        await session.end();
      } else {
        this.statusEl.textContent = 'LLM not available';
        this.statusEl.className = 'status error';
      }
    } catch (error) {
      this.statusEl.textContent = 'LLM not available';
      this.statusEl.className = 'status error';
    }
  }

  async startNewChat() {
    try {
      if (this.currentSession) {
        await this.currentSession.end();
      }

      // Prepare session options with system prompt if provided
      const sessionOptions = {};
      if (this.systemPrompt.trim()) {
        sessionOptions.systemPrompt = this.systemPrompt.trim();
      }

      this.currentSession = await this.api.createSession(sessionOptions);
      
      // Clear chat and show empty state
      this.chatContainer.innerHTML = `
        <div class="empty-state" id="emptyState">
          Your conversation with the AI will appear here
        </div>
      `;
      this.emptyState = document.getElementById('emptyState');
      
      this.statusEl.textContent = 'Ready';
      this.statusEl.className = 'status ready';
    } catch (error) {
      this.statusEl.textContent = 'Failed to start new chat';
      this.statusEl.className = 'status error';
      this.currentSession = null; // Make sure it's null on failure
    }
  }

  async sendMessage() {
    const prompt = this.promptInput.value.trim();
    if (!prompt || this.isGenerating) return;

    // Start session if needed
    if (!this.currentSession) {
      await this.startNewChat();
    }

    // Check if session creation was successful
    if (!this.currentSession) {
      this.displayError({ message: 'Failed to create session', code: 'session_creation_failed' });
      return;
    }

    // Add user message to chat
    this.addMessage(prompt, 'user');
    this.promptInput.value = '';
    
    // Disable input
    this.isGenerating = true;
    this.sendBtn.disabled = true;
    this.statusEl.textContent = 'Generating...';

    try {
      // Prepare message options
      const options = {
        temperature: this.temperature,
        maximumResponseTokens: this.maxTokens,
        samplingMode: this.samplingMode
      };

      // Add empty assistant message for streaming
      this.currentAssistantMessage = this.addMessage('', 'assistant');
      this.streamingContent = '';
      
      // Stream the response using the unified API
      for await (const token of this.currentSession.sendMessageStream(prompt, options)) {
        this.currentAssistantMessage.textContent += token;
        this.streamingContent += token;
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
      }
      
      this.resetGenerating();
      
    } catch (error) {
      this.displayError({ message: error.message, code: 'request_failed' });
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
    // Hide empty state if it exists
    if (this.emptyState && this.emptyState.parentNode) {
      this.emptyState.remove();
      this.emptyState = null;
    }
    
    const messageEl = document.createElement('div');
    messageEl.className = `message ${role}`;
    messageEl.textContent = content;
    this.chatContainer.appendChild(messageEl);
    this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    return messageEl;
  }
  
  displayError(errorPayload) {
    // Hide empty state if it exists
    if (this.emptyState && this.emptyState.parentNode) {
      this.emptyState.remove();
      this.emptyState = null;
    }
    
    const messageEl = document.createElement('div');
    messageEl.className = 'message error-message';
    
    // Use user-friendly message if available, otherwise fall back to technical message
    const message = errorPayload.message || 'An unknown error occurred.';
    const code = errorPayload.code || 'unknown_error';
    
    // Add appropriate emoji and styling based on error type
    let emoji = '❌';
    let actionHint = '';
    
    switch (code) {
      case 'assets_unavailable':
        emoji = '⏳';
        actionHint = ' Please try again in a few moments.';
        break;
      case 'context_window_exceeded':
        emoji = '📝';
        actionHint = ' Use "New Chat" to start fresh.';
        break;
      case 'guardrail_violation':
        emoji = '🛡️';
        actionHint = ' Please try rephrasing your request.';
        break;
      case 'session_not_available':
        emoji = '🔧';
        actionHint = ' Please check your Apple Intelligence settings.';
        break;
      default:
        actionHint = ' Please try again.';
    }
    
    messageEl.textContent = `${emoji} ${message}${actionHint}`;
    this.chatContainer.appendChild(messageEl);
    this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    
    return messageEl;
  }

  showSettings() {
    // Initialize temp settings with current values
    this.tempSettings = {
      systemPrompt: this.systemPrompt,
      temperature: this.temperature,
      maxTokens: this.maxTokens,
      samplingMode: this.samplingMode
    };
    
    // Update UI to show current values
    this.systemPromptInput.value = this.systemPrompt;
    this.tempValueSpan.textContent = this.temperature.toFixed(1);
    this.tokensValueSpan.textContent = this.maxTokens;
    this.samplingModeSelect.value = this.samplingMode;
    
    // Update button states
    this.tempDownBtn.disabled = this.temperature <= 0;
    this.tempUpBtn.disabled = this.temperature >= 2;
    this.tokensDownBtn.disabled = this.maxTokens <= 1;
    this.tokensUpBtn.disabled = this.maxTokens >= 2048;
    
    this.settingsView.classList.add('active');
    this.settingsBackdrop.classList.add('active');
  }
  
  cancelSettings() {
    // Discard temp settings and close
    this.tempSettings = {};
    this.settingsView.classList.remove('active');
    this.settingsBackdrop.classList.remove('active');
  }
  
  async saveSettings() {
    // Check if system prompt changed
    const systemPromptChanged = this.tempSettings.systemPrompt !== undefined && 
                                 this.tempSettings.systemPrompt !== this.systemPrompt;
    
    // Apply temp settings to actual settings
    if (this.tempSettings.systemPrompt !== undefined) {
      this.systemPrompt = this.tempSettings.systemPrompt;
    }
    if (this.tempSettings.temperature !== undefined) {
      this.temperature = this.tempSettings.temperature;
    }
    if (this.tempSettings.maxTokens !== undefined) {
      this.maxTokens = this.tempSettings.maxTokens;
    }
    if (this.tempSettings.samplingMode !== undefined) {
      this.samplingMode = this.tempSettings.samplingMode;
    }
    
    // Save to storage
    const settings = {
      systemPrompt: this.systemPrompt,
      temperature: this.temperature,
      maxTokens: this.maxTokens,
      samplingMode: this.samplingMode
    };
    chrome.storage.local.set({ playgroundSettings: settings });
    
    // If system prompt changed, reset chat and notify user
    if (systemPromptChanged) {
      await this.startNewChat();
      this.addMessage('Settings updated! Chat has been reset to apply the new system prompt.', 'assistant');
    }
    
    // Close settings
    this.tempSettings = {};
    this.settingsView.classList.remove('active');
    this.settingsBackdrop.classList.remove('active');
  }
  
  adjustTemperature(delta) {
    const newTemp = Math.max(0, Math.min(2, (this.tempSettings.temperature || this.temperature) + delta));
    const roundedTemp = Math.round(newTemp * 10) / 10; // Round to 1 decimal
    this.tempSettings.temperature = roundedTemp;
    this.tempValueSpan.textContent = roundedTemp.toFixed(1);
    
    // Update button states
    this.tempDownBtn.disabled = roundedTemp <= 0;
    this.tempUpBtn.disabled = roundedTemp >= 2;
  }
  
  adjustMaxTokens(delta) {
    const newTokens = Math.max(1, Math.min(2048, (this.tempSettings.maxTokens || this.maxTokens) + delta));
    this.tempSettings.maxTokens = newTokens;
    this.tokensValueSpan.textContent = newTokens;
    
    // Update button states
    this.tokensDownBtn.disabled = newTokens <= 1;
    this.tokensUpBtn.disabled = newTokens >= 2048;
  }

  loadSettings() {
    chrome.storage.local.get(['playgroundSettings'], (result) => {
      if (result.playgroundSettings) {
        const settings = result.playgroundSettings;
        
        // Load system prompt
        if (settings.systemPrompt !== undefined) {
          this.systemPrompt = settings.systemPrompt;
        }
        
        // Load temperature
        if (settings.temperature !== undefined) {
          this.temperature = settings.temperature;
          this.tempValueSpan.textContent = this.temperature.toFixed(1);
          this.tempDownBtn.disabled = this.temperature <= 0;
          this.tempUpBtn.disabled = this.temperature >= 2;
        }
        
        // Load max tokens
        if (settings.maxTokens !== undefined) {
          this.maxTokens = settings.maxTokens;
          this.tokensValueSpan.textContent = this.maxTokens;
          this.tokensDownBtn.disabled = this.maxTokens <= 1;
          this.tokensUpBtn.disabled = this.maxTokens >= 2048;
        }
        
        // Load sampling mode
        if (settings.samplingMode !== undefined) {
          this.samplingMode = settings.samplingMode;
          this.samplingModeSelect.value = this.samplingMode;
        }
      }
      
      // Always set the system prompt input value (either loaded or default)
      this.systemPromptInput.value = this.systemPrompt;
    });
  }

}

// Initialize playground when popup loads
document.addEventListener('DOMContentLoaded', () => {
  new NativeFoundationModelsPlayground();
});