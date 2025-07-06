/**
 * Chrome-specific configuration for LocalLLM extension
 */

var ChromeConfig = {
  browser: 'chrome',
  
  init() {
    console.log('[NFM-ChromeConfig] Initializing Chrome configuration');
    console.log('[NFM-ChromeConfig] Native messaging app ID:', this.nativeMessaging.appId);
    console.log('[NFM-ChromeConfig] Supports persistent connection:', this.nativeMessaging.supportsPersistentConnection);
  },
  
  // Native messaging configuration
  nativeMessaging: {
    type: 'persistent',
    appId: 'com.nativefoundationmodels.native',
    supportsPersistentConnection: true
  },
  
  // Extension scripts and resources
  resources: {
    injectedScript: 'injected.js',
    downloadDialog: 'download-dialog.js',
    webAccessibleResources: [
      'injected.js', 
      'download-dialog.js', 
      'brain.png', 
      'prism.js/prism.js', 
      'prism.js/prism.css'
    ]
  },
  
  // Message types and protocols
  messaging: {
    requestType: 'nativefoundationmodels-request',
    responseType: 'nativefoundationmodels-response',
    // Native response types from Swift implementation
    nativeResponseTypes: {
      availability: 'availabilityResponse',
      completion: 'completionResponse',
      streamChunk: 'streamChunk',
      streamEnd: 'streamEnd',
      error: 'error',
      sessionStarted: 'playgroundSessionStarted',
      sessionEnded: 'sessionEnded'
    }
  },
  
  // UI configuration
  ui: {
    hasPlaygroundTab: false,
    hasPopupWindow: false,
    hasToolbarIcon: true,
    openInNewTab: true,
    playgroundUrl: 'popup.html',
    downloadUrl: 'https://github.com/zats/local-llm/releases/latest/download/NativeFoundationModels.app.zip'
  },
  
  // Manifest configuration
  manifest: {
    version: 3,
    backgroundType: 'service_worker',
    backgroundScript: 'background.js',
    permissions: [
      'nativeMessaging',
      'storage'
    ],
    hostPermissions: ['<all_urls>']
  }
};

// Make available globally for both Chrome and Safari
if (typeof self !== 'undefined') {
  self.ChromeConfig = ChromeConfig;
} else if (typeof window !== 'undefined') {
  window.ChromeConfig = ChromeConfig;
} else if (typeof global !== 'undefined') {
  global.ChromeConfig = ChromeConfig;
}