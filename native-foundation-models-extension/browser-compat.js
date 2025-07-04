/**
 * Cross-browser compatibility layer for Chrome and Safari extensions
 * Provides unified APIs for common browser extension functionality
 */

const BrowserCompat = {
  // Browser detection
  isChrome: typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id,
  isSafari: typeof browser !== 'undefined' && browser.runtime,
  
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
    return this.runtime.sendMessage(message);
  },
  
  // Unified resource URLs
  getURL(path) {
    return this.runtime.getURL(path);
  },
  
  // Platform-specific native messaging
  connectNative(appId) {
    if (this.isChrome) {
      return chrome.runtime.connectNative(appId);
    } else {
      throw new Error('Safari uses message-based native communication');
    }
  },
  
  sendNativeMessage(appId, message) {
    if (this.isSafari) {
      return browser.runtime.sendNativeMessage(appId, message);
    } else {
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