#!/usr/bin/env node

/**
 * Sync shared files to both Chrome and Safari extension directories
 * This script copies shared components and creates platform-specific implementations
 */

const fs = require('fs-extra');
const path = require('path');
const chokidar = require('chokidar');
const { getGeneratedFilesPaths, getGeneratedFiles, updateGitignore, PROJECT_ROOT, CHROME_DIR, SAFARI_DIR } = require('./shared-files-util');

const SHARED_DIR = path.join(PROJECT_ROOT, 'shared');

// Files that should NOT be removed from extension directories (platform-specific)
const PLATFORM_SPECIFIC_FILES = {
  chrome: [
    'manifest.json',
    'README.md'
  ],
  safari: [
    'manifest.json',
    '_locales',
    'images',
    'utils'
  ]
};

// Files that are generated from shared sources (now centralized)
const GENERATED_FILES = getGeneratedFiles();

async function syncSharedFiles() {
  console.log('🔄 Syncing shared files to browser extensions...');
  
  try {
    // Ensure directories exist
    await fs.ensureDir(CHROME_DIR);
    await fs.ensureDir(SAFARI_DIR);
    
    // Copy shared assets
    await copySharedAssets();
    
    // Copy shared core modules
    await copySharedModules();
    
    // Generate platform-specific background scripts
    await generateBackgroundScripts();
    
    // Generate platform-specific content scripts
    await generateContentScripts();
    
    // Generate platform-specific injected scripts
    await generateInjectedScripts();
    
    // Generate platform-specific popup files
    await generatePopupFiles();
    
    // Update .gitignore with current generated files
    await updateGitignore();
    
    console.log('  Sync completed successfully!');
    console.log('📁 Chrome extension: native-foundation-models-extension/');
    console.log('📁 Safari extension: macOS-container-app/SafariExtension/Resources/');
    console.log('💡 Run "pnpm watch" to start development with file watching');
    
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    process.exit(1);
  }
}

async function copySharedAssets() {
  console.log('📦 Copying shared assets...');
  
  // Copy prism.js directory
  const sharedPrism = path.join(SHARED_DIR, 'assets', 'prism.js');
  if (await fs.pathExists(sharedPrism)) {
    await fs.copy(sharedPrism, path.join(CHROME_DIR, 'prism.js'), { overwrite: true });
    await fs.copy(sharedPrism, path.join(SAFARI_DIR, 'prism.js'), { overwrite: true });
    console.log('    Copied prism.js');
  }
  
  // Copy brain.png
  const sharedBrain = path.join(SHARED_DIR, 'assets', 'images', 'brain.png');
  if (await fs.pathExists(sharedBrain)) {
    await fs.copy(sharedBrain, path.join(CHROME_DIR, 'brain.png'));
    await fs.copy(sharedBrain, path.join(SAFARI_DIR, 'brain.png'));
    console.log('    Copied brain.png');
  }
}

async function copySharedModules() {
  console.log('📚 Copying shared modules...');
  
  // Copy browser-compat.js
  const browserCompat = path.join(SHARED_DIR, 'core', 'browser-compat.js');
  if (await fs.pathExists(browserCompat)) {
    await fs.copy(browserCompat, path.join(CHROME_DIR, 'browser-compat.js'));
    await fs.copy(browserCompat, path.join(SAFARI_DIR, 'browser-compat.js'));
    console.log('    Copied browser-compat.js');
  }
  
  // Copy download-dialog.js
  const downloadDialog = path.join(SHARED_DIR, 'core', 'download-dialog.js');
  if (await fs.pathExists(downloadDialog)) {
    await fs.copy(downloadDialog, path.join(CHROME_DIR, 'download-dialog.js'));
    await fs.copy(downloadDialog, path.join(SAFARI_DIR, 'download-dialog.js'));
    console.log('    Copied download-dialog.js');
  }
}

async function generateBackgroundScripts() {
  console.log('🔧 Generating platform-specific background scripts...');
  
  // Read shared files
  const browserCompatCode = await fs.readFile(path.join(SHARED_DIR, 'core', 'browser-compat.js'), 'utf8');
  const backgroundBaseCode = await fs.readFile(path.join(SHARED_DIR, 'core', 'background-base.js'), 'utf8');
  const chromeConfigCode = await fs.readFile(path.join(SHARED_DIR, 'config', 'chrome-config.js'), 'utf8');
  const safariConfigCode = await fs.readFile(path.join(SHARED_DIR, 'config', 'safari-config.js'), 'utf8');

  // Chrome background script wrapper
  const chromeBackground = `// Auto-generated from shared/core/background-base.js
// This file integrates shared components - do not edit directly

// Load browser compatibility layer
${browserCompatCode}

// Load Chrome configuration
${chromeConfigCode}

// Load shared background logic
${backgroundBaseCode}

// Initialize with Chrome configuration
const background = new UnifiedBackground(ChromeConfig);
`;

  // Safari background script wrapper
  const safariBackground = `// Auto-generated from shared/core/background-base.js
// This file integrates shared components - do not edit directly

// Load browser compatibility layer
${browserCompatCode}

// Load Safari configuration
${safariConfigCode}

// Load shared background logic
${backgroundBaseCode}

// Initialize with Safari configuration
const background = new UnifiedBackground(SafariConfig);
`;

  // Write generated files, overwriting the existing background.js files
  await fs.writeFile(path.join(CHROME_DIR, 'background.js'), chromeBackground);
  await fs.writeFile(path.join(SAFARI_DIR, 'background.js'), safariBackground);
  
  console.log('    Generated Chrome background.js');
  console.log('    Generated Safari background.js');
}

async function generateContentScripts() {
  console.log('🔧 Generating platform-specific content scripts...');
  
  // Read shared files
  const browserCompatCode = await fs.readFile(path.join(SHARED_DIR, 'core', 'browser-compat.js'), 'utf8');
  const contentBaseCode = await fs.readFile(path.join(SHARED_DIR, 'core', 'content-base.js'), 'utf8');
  const chromeConfigCode = await fs.readFile(path.join(SHARED_DIR, 'config', 'chrome-config.js'), 'utf8');
  const safariConfigCode = await fs.readFile(path.join(SHARED_DIR, 'config', 'safari-config.js'), 'utf8');

  // Chrome content script wrapper
  const chromeContent = `// Auto-generated from shared/core/content-base.js
// This file integrates shared components - do not edit directly

// Load browser compatibility layer
${browserCompatCode}

// Load Chrome configuration
${chromeConfigCode}

// Load shared content script logic
${contentBaseCode}

// Initialize with Chrome configuration
const contentScript = new UnifiedContentScript(ChromeConfig);
`;

  // Safari content script wrapper
  const safariContent = `// Auto-generated from shared/core/content-base.js
// This file integrates shared components - do not edit directly

// Load browser compatibility layer
${browserCompatCode}

// Load Safari configuration
${safariConfigCode}

// Load shared content script logic
${contentBaseCode}

// Initialize with Safari configuration
const contentScript = new UnifiedContentScript(SafariConfig);
`;

  // Write generated files, overwriting the existing content.js files
  await fs.writeFile(path.join(CHROME_DIR, 'content.js'), chromeContent);
  await fs.writeFile(path.join(SAFARI_DIR, 'content.js'), safariContent);
  
  console.log('    Generated Chrome content.js');
  console.log('    Generated Safari content.js');
}

async function generateInjectedScripts() {
  console.log('🔧 Generating platform-specific injected scripts...');
  
  // Read shared files
  const injectedBaseCode = await fs.readFile(path.join(SHARED_DIR, 'core', 'injected-base.js'), 'utf8');
  const chromeConfigCode = await fs.readFile(path.join(SHARED_DIR, 'config', 'chrome-config.js'), 'utf8');
  const safariConfigCode = await fs.readFile(path.join(SHARED_DIR, 'config', 'safari-config.js'), 'utf8');

  // Chrome injected script wrapper
  const chromeInjected = `// Auto-generated from shared/core/injected-base.js
// This file integrates shared components - do not edit directly

// Load Chrome configuration
${chromeConfigCode}

// Load shared injected script logic
${injectedBaseCode}

// Initialize with Chrome configuration and expose API
window.localLLM = new UnifiedInjectedScript.LocalLLM(ChromeConfig);
`;

  // Safari injected script wrapper
  const safariInjected = `// Auto-generated from shared/core/injected-base.js
// This file integrates shared components - do not edit directly

// Load Safari configuration
${safariConfigCode}

// Load shared injected script logic
${injectedBaseCode}

// Initialize with Safari configuration and expose API
window.localLLM = new UnifiedInjectedScript.LocalLLM(SafariConfig);
`;

  // Write generated files
  await fs.writeFile(path.join(CHROME_DIR, 'injected.js'), chromeInjected);
  await fs.writeFile(path.join(SAFARI_DIR, 'inject.js'), safariInjected);
  
  console.log('    Generated Chrome injected.js');
  console.log('    Generated Safari inject.js');
}

async function generatePopupFiles() {
  console.log('🔧 Generating platform-specific popup files...');
  
  // Read shared popup files
  const popupCss = await fs.readFile(path.join(SHARED_DIR, 'popup', 'popup.css'), 'utf8');
  const popupTemplate = await fs.readFile(path.join(SHARED_DIR, 'popup', 'popup-template.html'), 'utf8');
  const popupBaseJs = await fs.readFile(path.join(SHARED_DIR, 'popup', 'popup-base.js'), 'utf8');
  const popupApiBaseJs = await fs.readFile(path.join(SHARED_DIR, 'popup', 'popup-api-base.js'), 'utf8');
  const injectedBaseJs = await fs.readFile(path.join(SHARED_DIR, 'core', 'injected-base.js'), 'utf8');
  const chromeConfigCode = await fs.readFile(path.join(SHARED_DIR, 'config', 'chrome-config.js'), 'utf8');
  const safariConfigCode = await fs.readFile(path.join(SHARED_DIR, 'config', 'safari-config.js'), 'utf8');

  // Generate Chrome popup files
  const chromePopupHtml = popupTemplate.replace(
    '<!-- PLATFORM_SPECIFIC_BUTTONS -->', 
    '<button class="settings-btn" id="exportCodeBtn" title="Export as Code">💻</button>\n        <button class="settings-btn" id="newChatBtn" title="New Chat">📄</button>'
  );
  
  // Extract content from IIFE in injected-base.js to avoid race condition
  const extractedInjectedCode = injectedBaseJs
    .replace(/^[\s\S]*?\(function\(\) \{\s*'use strict';\s*/, '') // Remove everything before and including IIFE start
    .replace(/\}\)\(\);?\s*$/, '') // Remove closing IIFE
    .replace(/^\s*\/\/ Prevent duplicate loading[\s\S]*?return;\s*\}\s*/, '') // Remove duplicate loading check
    .trim();

  const chromePopupApiJs = `// Auto-generated from shared/popup/popup-api-base.js
// This file integrates shared components - do not edit directly

// Load Chrome configuration (only if not already defined)
if (typeof ChromeConfig === 'undefined') {
${chromeConfigCode}
}

// Load shared injected-base.js (LocalLLM class) - extracted from IIFE to avoid race condition
${extractedInjectedCode}

// Load shared popup API logic after base classes are available
${popupApiBaseJs}

// Initialize with Chrome configuration
const popupAPI = new UnifiedPopupAPI(ChromeConfig);
window.localLLM = popupAPI;
`;

  const chromePopupJs = `// Auto-generated from shared/popup/popup-base.js
// This file integrates shared components - do not edit directly

// Load shared popup logic
${popupBaseJs}

// Initialize with Chrome configuration (ChromeConfig already loaded in popup-api.js)
document.addEventListener('DOMContentLoaded', () => {
  const popup = new UnifiedPopup(ChromeConfig);
});
`;

  // Generate Safari popup files
  const safariPopupHtml = popupTemplate.replace(
    '<!-- PLATFORM_SPECIFIC_BUTTONS -->', 
    '<button class="settings-btn" id="exportCodeBtn" title="Export as Code">💻</button>\n        <button class="settings-btn" id="newChatBtn" title="New Chat">📄</button>'
  );
  
  const safariPopupApiJs = `// Auto-generated from shared/popup/popup-api-base.js
// This file integrates shared components - do not edit directly

// Load Safari configuration (only if not already defined)
if (typeof SafariConfig === 'undefined') {
${safariConfigCode}
}

// Load shared injected-base.js (LocalLLM class) - extracted from IIFE to avoid race condition
${extractedInjectedCode}

// Load shared popup API logic after base classes are available
${popupApiBaseJs}

// Initialize with Safari configuration
const popupAPI = new UnifiedPopupAPI(SafariConfig);
window.localLLM = popupAPI;
`;

  const safariPopupJs = `// Auto-generated from shared/popup/popup-base.js
// This file integrates shared components - do not edit directly

// Load shared popup logic
${popupBaseJs}

// Initialize with Safari configuration (SafariConfig already loaded in popup-api.js)
document.addEventListener('DOMContentLoaded', () => {
  const popup = new UnifiedPopup(SafariConfig);
});
`;

  // Write Chrome popup files
  await fs.writeFile(path.join(CHROME_DIR, 'popup.html'), chromePopupHtml);
  await fs.writeFile(path.join(CHROME_DIR, 'popup.css'), popupCss);
  await fs.writeFile(path.join(CHROME_DIR, 'popup-api.js'), chromePopupApiJs);
  await fs.writeFile(path.join(CHROME_DIR, 'popup.js'), chromePopupJs);
  
  // Write Safari popup files
  await fs.writeFile(path.join(SAFARI_DIR, 'popup.html'), safariPopupHtml);
  await fs.writeFile(path.join(SAFARI_DIR, 'popup.css'), popupCss);
  await fs.writeFile(path.join(SAFARI_DIR, 'popup-api.js'), safariPopupApiJs);
  await fs.writeFile(path.join(SAFARI_DIR, 'popup.js'), safariPopupJs);
  
  console.log('    Generated Chrome popup files');
  console.log('    Generated Safari popup files');
}


async function watchSharedFiles() {
  console.log('👀 Watching shared files for changes...');
  console.log('📁 Watching:', SHARED_DIR);

  const watcher = chokidar.watch(SHARED_DIR, {
    ignored: /node_modules/,
    persistent: true,
    ignoreInitial: true
  });

  let syncTimeout;

  function debouncedSync() {
    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(async () => {
      console.log('🔄 Changes detected, syncing...');
      try {
        await syncSharedFiles();
        console.log('✅ Sync completed');
      } catch (error) {
        console.error('❌ Sync failed:', error.message);
      }
    }, 500);
  }

  watcher
    .on('add', (filePath) => {
      console.log('➕ File added:', path.relative(PROJECT_ROOT, filePath));
      debouncedSync();
    })
    .on('change', (filePath) => {
      console.log('📝 File changed:', path.relative(PROJECT_ROOT, filePath));
      debouncedSync();
    })
    .on('unlink', (filePath) => {
      console.log('➖ File removed:', path.relative(PROJECT_ROOT, filePath));
      debouncedSync();
    })
    .on('error', (error) => {
      console.error('👀 Watcher error:', error);
    });

  console.log('✅ File watcher started. Press Ctrl+C to stop.');

  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n👋 Stopping file watcher...');
    watcher.close();
    process.exit(0);
  });
}

// Run the sync or watch based on command line arguments
if (require.main === module) {
  const args = process.argv.slice(2);
  syncSharedFiles();
  if (args.includes('--watch')) {
    watchSharedFiles();
  }
}

module.exports = { syncSharedFiles, watchSharedFiles };