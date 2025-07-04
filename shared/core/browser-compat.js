/**
 * Cross-browser compatibility layer for Chrome and Safari extensions
 * Provides unified APIs for common browser extension functionality
 */

const BrowserCompat = {
  // Browser detection
  isChrome: typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id,
  isSafari: typeof browser !== 'undefined' && browser.runtime,

  init() {
    console.log('[NFM-BrowserCompat] Initializing - Chrome:', this.isChrome, 'Safari:', this.isSafari);
    console.log('[NFM-BrowserCompat] Chrome object available:', typeof chrome !== 'undefined');
    console.log('[NFM-BrowserCompat] Browser object available:', typeof browser !== 'undefined');
  },
  
  // Unified API references
  get runtime() {
    return this.isChrome ? chrome.runtime : browser.runtime;
  },
  
  get storage() {
    return this.isChrome ? chrome.storage : browser.storage;
  },
  
  get tabs() {
    return this.isChrome ? chrome.tabs : browser.tabs;
  },
  
  get action() {
    return this.isChrome ? chrome.action : browser.action;
  },
  
  // Unified messaging
  sendMessage(message) {
    console.log('[NFM-BrowserCompat] Sending message:', message);
    return this.runtime.sendMessage(message);
  },
  
  // Unified resource URLs
  getURL(path) {
    return this.runtime.getURL(path);
  },
  
  // Platform-specific native messaging
  connectNative(appId) {
    console.log('[NFM-BrowserCompat] Connecting to native app:', appId);
    if (this.isChrome) {
      console.log('[NFM-BrowserCompat] Using Chrome connectNative');
      return chrome.runtime.connectNative(appId);
    } else {
      console.error('[NFM-BrowserCompat] Safari does not support connectNative');
      throw new Error('Safari uses message-based native communication');
    }
  },
  
  sendNativeMessage(appId, message) {
    console.log('[NFM-BrowserCompat] Sending native message to:', appId, 'message:', message);
    if (this.isSafari) {
      console.log('[NFM-BrowserCompat] Using Safari sendNativeMessage');
      return browser.runtime.sendNativeMessage(appId, message);
    } else {
      console.error('[NFM-BrowserCompat] Chrome does not support one-shot native messaging');
      throw new Error('Chrome uses persistent connection for native communication');
    }
  }
};

// Export for both module and script contexts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BrowserCompat;
} else if (typeof self !== 'undefined') {
  self.BrowserCompat = BrowserCompat;
} else if (typeof window !== 'undefined') {
  window.BrowserCompat = BrowserCompat;
}