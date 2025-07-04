# Extension Refactoring Strategy

## Overview

This document outlines the analysis and proposed refactoring strategy for unifying the Chrome and Safari browser extensions while minimizing code duplication.

## Current State Analysis

### File Structure Comparison

**Chrome Extension** (`native-foundation-models-extension/`):
- manifest.json
- background.js
- content.js
- popup.html, popup.js
- popup-api.js
- download-dialog.js
- injected.js
- brain.png
- prism.js/ (syntax highlighting)

**Safari Extension** (`macOS-container-app/SafariExtension/Resources/`):
- manifest.json
- background.js
- content.js
- popup.html, popup.js
- popup-api.js
- download-dialog.js
- inject.js
- playground.html
- brain.png
- prism.js/ (syntax highlighting)
- _locales/ (internationalization)
- images/ (icon set)

### Key Similarities (~90% code overlap)

1. **Core Functionality**: Both extensions provide identical LLM playground features
2. **File Structure**: Nearly identical file organization
3. **Logic Components**:
   - Same streaming chat interface
   - Identical settings management (temperature, max tokens, sampling mode)
   - Same code export functionality with Prism.js syntax highlighting
   - Shared `NativeFoundationModelsPlayground` class structure
   - Common error handling and message display systems

### Key Differences

#### Browser API Usage
- **Chrome**: Uses `chrome.*` namespace
- **Safari**: Uses `browser.*` namespace with compatibility fallbacks

#### Native Communication Patterns
- **Chrome**: Persistent connections via `chrome.runtime.connectNative()`
- **Safari**: Message-based communication via `browser.runtime.sendNativeMessage()`

#### Session Management
- **Chrome**: Real session IDs with background script communication
- **Safari**: Mock sessions with `safari-` prefix that delegate to direct API calls

#### Streaming Implementation
- **Chrome**: Real-time streaming with message listeners and chunk waiters
- **Safari**: Simulated streaming with pre-fetched chunks and artificial delays (30ms)

#### UI Features
- **Safari**: Additional navigation options (open in new tab, separate popup window)
- **Chrome**: Simpler UI focused on core functionality

#### Manifest Differences
- **Safari**: Internationalization support, comprehensive icon set, additional permissions
- **Chrome**: Streamlined configuration with hardcoded strings

## Proposed Unification Strategy

### Directory Structure

```
shared/
├── core/
│   ├── playground.js           # Unified NativeFoundationModelsPlayground class
│   ├── content-base.js         # Shared content script logic
│   ├── background-base.js      # Shared background logic  
│   ├── popup-api-base.js       # Unified API with browser detection
│   ├── browser-compat.js       # Cross-browser compatibility layer
│   └── utils/
│       ├── streaming.js        # Unified streaming handlers
│       ├── messaging.js        # Message protocol abstraction
│       └── storage.js          # Storage API abstraction
├── assets/
│   ├── brain.png              # Shared icon
│   ├── prism.js/              # Shared syntax highlighting
│   ├── styles/                # Shared CSS
│   └── templates/             # HTML templates
└── config/
    ├── chrome-config.js        # Chrome-specific settings
    └── safari-config.js        # Safari-specific settings

extensions/
├── chrome/
│   ├── manifest.json           # Chrome-specific manifest
│   ├── background.js           # Imports shared + chrome config
│   ├── content.js              # Imports shared + chrome config
│   ├── popup.js                # Imports shared + chrome config
│   └── popup.html              # Chrome-specific template
└── safari/
    ├── manifest.json           # Safari-specific manifest
    ├── background.js           # Imports shared + safari config
    ├── content.js              # Imports shared + safari config
    ├── popup.js                # Imports shared + safari config
    ├── popup.html              # Safari-specific template
    ├── playground.html         # Safari-specific playground
    └── _locales/               # Safari internationalization
```

### Implementation Approach

#### 1. Browser Compatibility Layer

```javascript
// shared/core/browser-compat.js
const BrowserCompat = {
  runtime: typeof browser !== 'undefined' ? browser.runtime : chrome.runtime,
  storage: typeof browser !== 'undefined' ? browser.storage : chrome.storage,
  isChrome: typeof chrome !== 'undefined' && chrome.runtime,
  isSafari: typeof browser !== 'undefined' && browser.runtime,
  
  // Unified messaging
  sendMessage: function(message) {
    return this.runtime.sendMessage(message);
  },
  
  // Unified resource URLs
  getURL: function(path) {
    return this.runtime.getURL(path);
  }
};
```

#### 2. Configuration-Driven Browser Differences

```javascript
// shared/config/chrome-config.js
export const ChromeConfig = {
  scripts: ['download-dialog.js', 'injected.js'],
  messageTypes: {
    request: 'nativefoundationmodels-request',
    response: 'nativefoundationmodels-response'
  },
  nativeMessaging: {
    type: 'persistent',
    appId: 'com.nativefoundationmodels.native'
  },
  ui: {
    hasPlaygroundTab: false,
    hasPopupWindow: false,
    troubleshooting: 'download-dialog'
  }
};

// shared/config/safari-config.js
export const SafariConfig = {
  scripts: ['inject.js'],
  messageTypes: {
    request: 'nativeRequest',
    response: 'nativeResponse'
  },
  nativeMessaging: {
    type: 'message-based'
  },
  ui: {
    hasPlaygroundTab: true,
    hasPopupWindow: true,
    troubleshooting: 'safari-permissions'
  }
};
```

#### 3. Conditional Logic Instead of Duplication

```javascript
// shared/core/background-base.js
import { BrowserCompat } from './browser-compat.js';
import { ChromeConfig } from '../config/chrome-config.js';
import { SafariConfig } from '../config/safari-config.js';

class UnifiedBackground {
  constructor() {
    this.config = BrowserCompat.isChrome ? ChromeConfig : SafariConfig;
    this.setupNativeMessaging();
  }
  
  setupNativeMessaging() {
    if (this.config.nativeMessaging.type === 'persistent') {
      // Chrome persistent connection logic
      this.setupPersistentConnection();
    } else {
      // Safari message-based logic
      this.setupMessageBasedConnection();
    }
  }
  
  // Shared message handling with platform-specific routing
  handleMessage(message, sender, sendResponse) {
    // Common validation and routing logic
    if (BrowserCompat.isChrome) {
      // Chrome-specific handling
    } else if (BrowserCompat.isSafari) {
      // Safari-specific handling
    }
  }
}
```

#### 4. Symlink Strategy for Identical Files

Create symlinks for files that are 100% identical:
- `brain.png` → shared asset
- `prism.js/` → shared syntax highlighting
- Common CSS files
- Shared utility scripts

### Migration Steps

1. **Phase 1: Extract Shared Logic**
   - Create `shared/` directory structure
   - Extract common classes and utilities
   - Implement browser compatibility layer

2. **Phase 2: Create Unified Base Files**
   - Refactor background.js into shared base + config
   - Refactor content.js into shared base + config
   - Refactor popup files into shared base + config

3. **Phase 3: Implement Configuration System**
   - Create browser-specific config files
   - Implement conditional logic based on browser detection
   - Test unified functionality across both platforms

4. **Phase 4: Create Build System**
   - Set up symlinks for identical files
   - Create build scripts to generate platform-specific extensions
   - Implement manifest generation from templates
