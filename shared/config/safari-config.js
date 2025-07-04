/**
 * Safari-specific configuration for Native Foundation Models extension
 */

const SafariConfig = {
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
      'playground.html',
      'download-dialog.js',
      'popup-api.js',
      'popup.js',
      'brain.png',
      'prism.js/prism.js',
      'prism.js/prism.css'
    ]
  },
  
  // Message types and protocols
  messaging: {
    requestType: 'nativeRequest',
    responseType: 'nativeResponse'
  },
  
  // UI configuration
  ui: {
    hasPlaygroundTab: true,
    hasPopupWindow: true,
    hasToolbarIcon: true,
    openInNewTab: true,
    playgroundUrl: 'playground.html',
    downloadUrl: 'https://github.com/zats/native-foundation-models/releases/latest/download/NativeFoundationModels.app.zip'
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