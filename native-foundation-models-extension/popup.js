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
    
    // Track conversation for code export
    this.conversationHistory = [];
    
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
    this.exportCodeBtn = document.getElementById('exportCodeBtn');
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
    this.exportCodeBtn.addEventListener('click', () => this.exportCode());
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

    // Troubleshooting button
    this.troubleshootingBtn = document.getElementById('troubleshootingBtn');
    this.troubleshootingBtn.addEventListener('click', () => {
      if (window.nfmDownloadDialog) {
        window.nfmDownloadDialog.show();
      }
    });

    // Streaming is now handled directly by the unified API
  }

  async checkAvailability() {
    try {
      const response = await this.api.checkAvailability();
      
      if (response && response.payload && response.payload.available) {
        this.statusEl.textContent = 'Ready';
        this.statusEl.className = 'status ready';
      } else {
        // If checkAvailability fails, try a different approach
        this.tryFallbackAvailabilityCheck();
      }
    } catch (error) {
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
  
  showDownloadPrompt() {
    this.statusEl.innerHTML = `
      <span style="color: #e74c3c;">Native app not found</span>
      <button onclick="window.nfmDownloadDialog.show()" 
         style="color: #3498db; background: none; border: none; margin-left: 8px; font-weight: 600; cursor: pointer; text-decoration: underline;">
        Download →
      </button>
    `;
    this.statusEl.className = 'status error';
    
    // Show the unified download dialog
    if (window.nfmDownloadDialog) {
      window.nfmDownloadDialog.show();
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
        this.showDownloadPrompt();
      }
    } catch (error) {
      console.error('Availability check failed:', error);
      this.showDownloadPrompt();
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
      
      // Clear conversation history
      this.conversationHistory = [];
      
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

    // Add user message to chat and conversation history
    this.addMessage(prompt, 'user');
    this.conversationHistory.push({ role: 'user', content: prompt });
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
      
      // Add assistant response to conversation history
      this.conversationHistory.push({ role: 'assistant', content: this.streamingContent });
      
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

  async exportCode() {
    // Always show modal with default streaming mode
    this.showCodeModal();
  }

  generateJavaScriptCode(useStreaming = true) {
    const config = {
      systemPrompt: this.systemPrompt,
      temperature: this.temperature,
      maxTokens: this.maxTokens,
      samplingMode: this.samplingMode
    };

    const standardPrompt = "Write a short creative story about a robot discovering nature for the first time.";

    let code = `if (!window.nativeFoundationModels) {
  console.error('Native Foundation Models extension not found');
  return;
}

try {
  const session = await window.nativeFoundationModels.createSession({`;

    if (config.systemPrompt && config.systemPrompt.trim()) {
      code += `
    systemPrompt: ${JSON.stringify(config.systemPrompt)}`;
    }

    code += `
  });

  const options = {
    temperature: ${config.temperature},
    maximumResponseTokens: ${config.maxTokens},
    samplingMode: '${config.samplingMode}'
  };

`;

    if (useStreaming) {
      code += `  let response = '';
  for await (const token of session.sendMessageStream(${JSON.stringify(standardPrompt)}, options)) {
    response += token;
  }`;
    } else {
      code += `  const response = await session.sendMessage(${JSON.stringify(standardPrompt)}, options);`;
    }

    code += `

  await session.end();
} catch (error) {
  console.error('Error:', error);
}`;

    return code;
  }

  showCodeModal() {
    // Load Prism.js CSS and JS
    this.loadPrismAssets();
    
    // Create backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'settings-backdrop active';
    
    // Create modal
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 90vw;
      max-width: 800px;
      max-height: 80vh;
      background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
      border-radius: 20px;
      z-index: 10001;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.1);
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    `;

    const title = document.createElement('h3');
    title.textContent = '💻 JavaScript Code Export';
    title.style.cssText = `
      margin: 0;
      color: #e2e8f0;
      font-size: 18px;
      font-weight: 600;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
      background: rgba(255, 255, 255, 0.1);
      color: #e2e8f0;
      border: none;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      cursor: pointer;
      font-size: 16px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    `;
    closeBtn.onmouseover = () => closeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
    closeBtn.onmouseout = () => closeBtn.style.background = 'rgba(255, 255, 255, 0.1)';

    // Content area
    const content = document.createElement('div');
    content.style.cssText = `
      padding: 20px 24px;
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      gap: 16px;
    `;

    // Create code container with Prism.js highlighting
    const codeContainer = document.createElement('div');
    codeContainer.style.cssText = `
      flex: 1;
      min-height: 350px;
      background: #1a202c;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      overflow: auto;
      position: relative;
    `;

    const pre = document.createElement('pre');
    pre.style.cssText = `
      margin: 0;
      padding: 16px;
      background: transparent;
      font-family: 'SF Mono', 'Monaco', 'Consolas', 'Liberation Mono', monospace;
      font-size: 13px;
      line-height: 1.5;
      overflow: visible;
    `;

    const codeElement = document.createElement('code');
    codeElement.className = 'language-javascript';
    
    pre.appendChild(codeElement);
    codeContainer.appendChild(pre);

    // Hidden textarea for copying
    const textarea = document.createElement('textarea');
    textarea.style.cssText = `
      position: absolute;
      left: -9999px;
      opacity: 0;
    `;
    textarea.readonly = true;

    // Streaming mode checkbox
    const streamingCheckbox = document.createElement('input');
    streamingCheckbox.type = 'checkbox';
    streamingCheckbox.id = 'streamingMode';
    streamingCheckbox.checked = true;

    // Function to update code based on checkbox state
    const updateCode = () => {
      const useStreaming = streamingCheckbox.checked;
      const code = this.generateJavaScriptCode(useStreaming);
      codeElement.textContent = code;
      textarea.value = code;
      
      // Re-highlight with Prism.js
      if (window.Prism) {
        window.Prism.highlightElement(codeElement);
      }
    };

    // Generate initial code
    updateCode();

    // Update code when checkbox changes
    streamingCheckbox.addEventListener('change', updateCode);

    // Bottom container with checkbox and buttons
    const bottomContainer = document.createElement('div');
    bottomContainer.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      margin-top: 16px;
      gap: 12px;
    `;

    // Mode selection checkbox
    const modeContainer = document.createElement('div');
    modeContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
    `;

    streamingCheckbox.style.cssText = `
      margin: 0;
      cursor: pointer;
    `;

    const checkboxLabel = document.createElement('label');
    checkboxLabel.htmlFor = 'streamingMode';
    checkboxLabel.textContent = 'Streaming';
    checkboxLabel.style.cssText = `
      color: #e2e8f0;
      font-size: 13px;
      cursor: pointer;
      user-select: none;
    `;

    modeContainer.appendChild(streamingCheckbox);
    modeContainer.appendChild(checkboxLabel);

    // Buttons container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      gap: 12px;
    `;

    const copyBtn = document.createElement('button');
    copyBtn.textContent = '📋 Copy to Clipboard';
    copyBtn.style.cssText = `
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      padding: 10px 20px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    `;
    copyBtn.onmouseover = () => copyBtn.style.transform = 'translateY(-1px)';
    copyBtn.onmouseout = () => copyBtn.style.transform = 'translateY(0)';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Close';
    cancelBtn.style.cssText = `
      background: rgba(255, 255, 255, 0.1);
      color: #e2e8f0;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      padding: 10px 20px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    `;
    cancelBtn.onmouseover = () => cancelBtn.style.background = 'rgba(255, 255, 255, 0.2)';
    cancelBtn.onmouseout = () => cancelBtn.style.background = 'rgba(255, 255, 255, 0.1)';

    // Event handlers
    const closeModal = () => {
      document.body.removeChild(backdrop);
      document.body.removeChild(modal);
    };

    closeBtn.onclick = closeModal;
    cancelBtn.onclick = closeModal;
    backdrop.onclick = closeModal;

    copyBtn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(textarea.value);
        copyBtn.textContent = '✅ Copied!';
        copyBtn.style.background = 'linear-gradient(135deg, #46b946 0%, #2d8f2d 100%)';
        setTimeout(() => {
          copyBtn.textContent = '📋 Copy to Clipboard';
          copyBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        }, 2000);
      } catch (error) {
        // Fallback - select all text
        textarea.select();
        textarea.setSelectionRange(0, 99999);
        copyBtn.textContent = '📝 Text Selected';
        setTimeout(() => {
          copyBtn.textContent = '📋 Copy to Clipboard';
        }, 2000);
      }
    };

    // Assemble modal
    header.appendChild(title);
    header.appendChild(closeBtn);
    buttonContainer.appendChild(cancelBtn);
    buttonContainer.appendChild(copyBtn);
    bottomContainer.appendChild(modeContainer);
    bottomContainer.appendChild(buttonContainer);
    content.appendChild(codeContainer);
    content.appendChild(textarea);
    content.appendChild(bottomContainer);
    modal.appendChild(header);
    modal.appendChild(content);

    // Add to page
    document.body.appendChild(backdrop);
    document.body.appendChild(modal);

    // Auto-select text after modal is added to DOM
    setTimeout(() => {
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
    }, 100);
  }

  loadPrismAssets() {
    // Load Prism.js CSS if not already loaded
    if (!document.querySelector('link[href*="prism.css"]')) {
      const cssLink = document.createElement('link');
      cssLink.rel = 'stylesheet';
      cssLink.href = chrome.runtime.getURL('prism.js/prism.css');
      document.head.appendChild(cssLink);
    }

    // Load Prism.js JavaScript if not already loaded
    if (!window.Prism) {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('prism.js/prism.js');
      script.onload = () => {
        // Prism.js is now loaded
        console.log('Prism.js loaded successfully');
      };
      document.head.appendChild(script);
    }
  }

}

// Initialize playground when popup loads
document.addEventListener('DOMContentLoaded', () => {
  new NativeFoundationModelsPlayground();
});