/**
 * Safari-specific configuration for LocalLLM extension
 */

var SafariConfig = {
  browser: 'safari',
  
  init() {
    console.log('[NFM-SafariConfig] Initializing Safari configuration');
    console.log('[NFM-SafariConfig] Native messaging app ID:', this.nativeMessaging.appId);
    console.log('[NFM-SafariConfig] Supports persistent connection:', this.nativeMessaging.supportsPersistentConnection);
  },
  
  // Native messaging configuration
  nativeMessaging: {
    type: 'message-based',
    appId: 'com.nativefoundationmodels.safari',
    supportsPersistentConnection: false
  },
  
  // Extension scripts and resources
  resources: {
    injectedScript: 'inject.js',
    downloadDialog: 'download-dialog.js',
    webAccessibleResources: [
      'inject.js',
      'popup.html',
      'download-dialog.js',
      'popup-api.js',
      'popup.js',
      'construction-effects.js',
      'brain.png',
      'prism.js/prism.js',
      'prism.js/prism.css'
    ]
  },
  
  // Message types and protocols
  messaging: {
    requestType: 'nativeRequest',
    responseType: 'nativeResponse',
    // Safari expects 'action' field instead of 'command'
    actionField: 'action',
    // Native response types from Swift implementation
    nativeResponseTypes: {
      availability: 'response',
      completion: 'response',
      streamChunk: 'response',
      streamEnd: 'response',
      error: 'error'
    }
  },
  
  // UI configuration
  ui: {
    hasPlaygroundTab: true,
    hasPopupWindow: true,
    hasToolbarIcon: true,
    openInNewTab: true,
    playgroundUrl: 'popup.html',
    downloadUrl: 'https://github.com/zats/local-llm/releases/latest/download/NativeFoundationModels.app.zip'
  },
  
  // Manifest configuration
  manifest: {
    version: 3,
    backgroundType: 'scripts',
    backgroundScript: 'background.js',
    defaultLocale: 'en',
    permissions: [
      'scripting',
      'tabs',
      'activeTab',
      'nativeMessaging',
      'storage'
    ],
    hostPermissions: ['<all_urls>'],
    icons: {
      '48': 'images/icon-48.png',
      '96': 'images/icon-96.png',
      '128': 'images/icon-128.png',
      '256': 'images/icon-256.png',
      '512': 'images/icon-512.png'
    }
  }
};

// Make available globally for both Chrome and Safari
if (typeof self !== 'undefined') {
  self.SafariConfig = SafariConfig;
} else if (typeof window !== 'undefined') {
  window.SafariConfig = SafariConfig;
} else if (typeof global !== 'undefined') {
  global.SafariConfig = SafariConfig;
}