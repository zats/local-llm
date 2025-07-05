// Under Construction - This class is being redesigned
// Original functionality temporarily disabled

/*
class UnifiedPopup {
  constructor(config) {
    this.config = config;
    this.currentSession = null;
    this.isGenerating = false;
    this.streamingContent = '';
    this.temperature = 0.8;
    this.maxTokens = 1024;
    this.samplingMode = 'top-p';
    this.systemPrompt = 'You are a helpful, knowledgeable, and concise AI assistant. Provide clear, accurate responses while being friendly and professional.';
    
    // Temporary settings for the settings dialog
    this.tempSettings = {};
    
    // Track conversation for code export
    this.conversationHistory = [];
    
    // Get reference to the unified API
    this.api = window.localLLM;
    
    this.initializeElements();
    this.setupEventListeners();
    this.loadSettings();
    
    // Delay the availability check slightly to allow background script to initialize
    setTimeout(() => this.checkAvailability(), 100);
  }

  initializeElements() {
    this.statusEl = document.getElementById('status');
    this.chatMessages = document.getElementById('chatMessages');
    this.userInput = document.getElementById('userInput');
    this.sendBtn = document.getElementById('sendBtn');
    this.settingsBtn = document.getElementById('settingsBtn');
    this.settingsModal = document.getElementById('settingsModal');
    this.settingsBackdrop = document.getElementById('settingsBackdrop');
    this.closeSettingsBtn = document.getElementById('closeSettingsBtn');
    this.saveSettingsBtn = document.getElementById('saveSettingsBtn');
    this.resetSettingsBtn = document.getElementById('resetSettingsBtn');
    this.systemPromptInput = document.getElementById('systemPrompt');
    this.temperatureSlider = document.getElementById('temperatureStepper');
    this.temperatureValue = document.getElementById('temperatureValue');
    this.maxTokensSlider = document.getElementById('maxTokensStepper');
    this.maxTokensValue = document.getElementById('maxTokensValue');
    this.samplingModeSelect = document.getElementById('samplingMode');
    this.streamToggle = document.getElementById('streamToggle');
    this.troubleshootingBtn = document.getElementById('troubleshootingBtn');
    
    // Platform-specific elements
    this.openPlaygroundBtn = document.getElementById('openPlaygroundBtn');
  }

  setupEventListeners() {
    this.sendBtn.addEventListener('click', () => this.sendMessage());
    this.settingsBtn.addEventListener('click', () => this.showSettings());
    this.closeSettingsBtn.addEventListener('click', () => this.hideSettings());
    this.saveSettingsBtn.addEventListener('click', () => this.saveSettings());
    this.resetSettingsBtn.addEventListener('click', () => this.resetSettings());
    this.settingsBackdrop.addEventListener('click', () => this.hideSettings());
    this.troubleshootingBtn.addEventListener('click', () => this.handleTroubleshooting());
    
    // Auto-resize textarea
    this.userInput.addEventListener('input', () => {
      this.userInput.style.height = 'auto';
      this.userInput.style.height = Math.min(this.userInput.scrollHeight, 120) + 'px';
    });
    
    // Send on Enter (but not Shift+Enter)
    this.userInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    
    // Settings controls
    this.temperatureSlider.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      this.temperatureValue.textContent = value.toFixed(1);
      this.tempSettings.temperature = value;
    });
    
    this.maxTokensSlider.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      this.maxTokensValue.textContent = value;
      this.tempSettings.maxTokens = value;
    });
    
    this.samplingModeSelect.addEventListener('change', (e) => {
      this.tempSettings.samplingMode = e.target.value;
    });
    
    this.systemPromptInput.addEventListener('input', (e) => {
      this.tempSettings.systemPrompt = e.target.value;
    });
    
    this.streamToggle.addEventListener('change', (e) => {
      this.tempSettings.streaming = e.target.checked;
    });
    
    // Platform-specific event listeners
    if (this.openPlaygroundBtn) {
      this.openPlaygroundBtn.addEventListener('click', () => this.openPlayground());
    }
  }

  async checkAvailability() {
    try {
      this.updateStatus('Checking availability...');
      
      const isAvailable = await this.api.checkAvailability();
      
      if (isAvailable) {
        this.updateStatus('Ready', 'ready');
      } else {
        this.updateStatus('Foundation models not available', 'error');
      }
    } catch (error) {
      console.error('Error checking availability:', error);
      this.updateStatus('Error checking availability', 'error');
    }
  }

  updateStatus(message, type = '') {
    if (this.statusEl) {
      this.statusEl.textContent = message;
      this.statusEl.className = `status ${type}`;
    }
  }

  async sendMessage() {
    const message = this.userInput.value.trim();
    if (!message || this.isGenerating) return;
    
    this.isGenerating = true;
    this.sendBtn.disabled = true;
    this.userInput.disabled = true;
    
    try {
      // Add user message to UI
      this.addMessage(message, 'user');
      this.userInput.value = '';
      this.userInput.style.height = 'auto';
      
      // Add to conversation history
      this.conversationHistory.push({ role: 'user', content: message });
      
      // Create session if needed
      if (!this.currentSession) {
        this.currentSession = await this.api.createSession({
          systemPrompt: this.systemPrompt,
          temperature: this.temperature,
          maxTokens: this.maxTokens,
          samplingMode: this.samplingMode
        });
      }
      
      // Send message and get response
      const response = await this.api.sendMessage(this.currentSession, message);
      
      // Add assistant response to UI
      this.addMessage(response, 'assistant');
      
      // Add to conversation history
      this.conversationHistory.push({ role: 'assistant', content: response });
      
    } catch (error) {
      console.error('Error sending message:', error);
      this.addMessage('Sorry, there was an error processing your message. Please try again.', 'error');
    } finally {
      this.isGenerating = false;
      this.sendBtn.disabled = false;
      this.userInput.disabled = false;
      this.userInput.focus();
    }
  }

  addMessage(content, role) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    messageDiv.textContent = content;
    
    this.chatMessages.appendChild(messageDiv);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  showSettings() {
    // Initialize temp settings with current values
    this.tempSettings = {
      temperature: this.temperature,
      maxTokens: this.maxTokens,
      samplingMode: this.samplingMode,
      systemPrompt: this.systemPrompt,
      streaming: this.streamToggle.checked
    };
    
    // Update UI with current values
    this.temperatureSlider.value = this.temperature;
    this.temperatureValue.textContent = this.temperature.toFixed(1);
    this.maxTokensSlider.value = this.maxTokens;
    this.maxTokensValue.textContent = this.maxTokens;
    this.samplingModeSelect.value = this.samplingMode;
    this.systemPromptInput.value = this.systemPrompt;
    
    // Show modal
    this.settingsBackdrop.classList.add('active');
    this.settingsModal.classList.add('active');
  }

  hideSettings() {
    this.settingsBackdrop.classList.remove('active');
    this.settingsModal.classList.remove('active');
    this.tempSettings = {};
  }

  saveSettings() {
    // Apply temp settings to actual settings
    if (this.tempSettings.temperature !== undefined) {
      this.temperature = this.tempSettings.temperature;
    }
    if (this.tempSettings.maxTokens !== undefined) {
      this.maxTokens = this.tempSettings.maxTokens;
    }
    if (this.tempSettings.samplingMode !== undefined) {
      this.samplingMode = this.tempSettings.samplingMode;
    }
    if (this.tempSettings.systemPrompt !== undefined) {
      this.systemPrompt = this.tempSettings.systemPrompt;
    }
    
    // Save to storage
    this.saveSettingsToStorage();
    
    // Reset current session to apply new settings
    this.currentSession = null;
    
    // Clear conversation history when settings change
    this.conversationHistory = [];
    this.chatMessages.innerHTML = '';
    
    this.hideSettings();
  }

  resetSettings() {
    this.temperature = 0.8;
    this.maxTokens = 1024;
    this.samplingMode = 'top-p';
    this.systemPrompt = 'You are a helpful, knowledgeable, and concise AI assistant. Provide clear, accurate responses while being friendly and professional.';
    
    // Update UI
    this.temperatureSlider.value = this.temperature;
    this.temperatureValue.textContent = this.temperature.toFixed(1);
    this.maxTokensSlider.value = this.maxTokens;
    this.maxTokensValue.textContent = this.maxTokens;
    this.samplingModeSelect.value = this.samplingMode;
    this.systemPromptInput.value = this.systemPrompt;
    
    // Save to storage
    this.saveSettingsToStorage();
    
    // Reset current session
    this.currentSession = null;
    
    // Clear conversation history
    this.conversationHistory = [];
    this.chatMessages.innerHTML = '';
  }

  async loadSettings() {
    try {
      const settings = await this.getStoredSettings();
      
      if (settings.temperature !== undefined) {
        this.temperature = settings.temperature;
      }
      if (settings.maxTokens !== undefined) {
        this.maxTokens = settings.maxTokens;
      }
      if (settings.samplingMode !== undefined) {
        this.samplingMode = settings.samplingMode;
      }
      if (settings.systemPrompt !== undefined) {
        this.systemPrompt = settings.systemPrompt;
      }
      
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  async saveSettingsToStorage() {
    try {
      const settings = {
        temperature: this.temperature,
        maxTokens: this.maxTokens,
        samplingMode: this.samplingMode,
        systemPrompt: this.systemPrompt
      };
      
      await this.setStoredSettings(settings);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  async getStoredSettings() {
    // Platform-specific implementation
    if (this.config.platform === 'chrome') {
      return new Promise((resolve) => {
        chrome.storage.local.get(['settings'], (result) => {
          resolve(result.settings || {});
        });
      });
    } else if (this.config.platform === 'safari') {
      return new Promise((resolve) => {
        browser.storage.local.get(['settings'], (result) => {
          resolve(result.settings || {});
        });
      });
    }
    return {};
  }

  async setStoredSettings(settings) {
    // Platform-specific implementation
    if (this.config.platform === 'chrome') {
      return new Promise((resolve) => {
        chrome.storage.local.set({ settings }, resolve);
      });
    } else if (this.config.platform === 'safari') {
      return new Promise((resolve) => {
        browser.storage.local.set({ settings }, resolve);
      });
    }
  }

  handleTroubleshooting() {
    // Platform-specific troubleshooting
    if (this.config.platform === 'chrome') {
      if (window.nfmDownloadDialog) {
        window.nfmDownloadDialog.show();
      }
    } else if (this.config.platform === 'safari') {
      alert('If you are having issues with the extension, please try the following:\n\n1. Make sure you have macOS 13.0 or later\n2. Check that the app is properly installed\n3. Verify that the Safari extension is enabled in Safari preferences\n4. Try restarting Safari');
    }
  }

  // Safari-specific method
  openPlayground() {
    if (this.config.platform === 'safari') {
      browser.tabs.create({ url: 'popup.html' });
    }
  }
}

// Export for use in generated platform-specific files
window.UnifiedPopup = UnifiedPopup;
*/