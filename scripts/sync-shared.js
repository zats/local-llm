#!/usr/bin/env node

/**
 * Sync shared files to both Chrome and Safari extension directories
 * This script copies shared components and creates platform-specific implementations
 */

const fs = require('fs-extra');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SHARED_DIR = path.join(PROJECT_ROOT, 'shared');
const CHROME_DIR = path.join(PROJECT_ROOT, 'native-foundation-models-extension');
const SAFARI_DIR = path.join(PROJECT_ROOT, 'macOS-container-app', 'SafariExtension', 'Resources');

// Files that should NOT be removed from extension directories (platform-specific)
const PLATFORM_SPECIFIC_FILES = {
  chrome: [
    'manifest.json',
    'injected.js',
    'popup.html',
    'popup.js',
    'popup-api.js',
    'README.md'
  ],
  safari: [
    'manifest.json',
    'inject.js',
    'playground.html',
    'popup.html',
    'popup.js',
    'popup-api.js',
    'popup.css',
    '_locales',
    'images',
    'utils'
  ]
};

// Files that are generated from shared sources
const GENERATED_FILES = [
  'background.js',
  'content.js',
  'browser-compat.js',
  'download-dialog.js',
  'brain.png',
  'prism.js'
];

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
    
    console.log('✅ Sync completed successfully!');
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
    console.log('  ✅ Copied prism.js');
  }
  
  // Copy brain.png
  const sharedBrain = path.join(SHARED_DIR, 'assets', 'images', 'brain.png');
  if (await fs.pathExists(sharedBrain)) {
    await fs.copy(sharedBrain, path.join(CHROME_DIR, 'brain.png'));
    await fs.copy(sharedBrain, path.join(SAFARI_DIR, 'brain.png'));
    console.log('  ✅ Copied brain.png');
  }
}

async function copySharedModules() {
  console.log('📚 Copying shared modules...');
  
  // Copy browser-compat.js
  const browserCompat = path.join(SHARED_DIR, 'core', 'browser-compat.js');
  if (await fs.pathExists(browserCompat)) {
    await fs.copy(browserCompat, path.join(CHROME_DIR, 'browser-compat.js'));
    await fs.copy(browserCompat, path.join(SAFARI_DIR, 'browser-compat.js'));
    console.log('  ✅ Copied browser-compat.js');
  }
  
  // Copy download-dialog.js
  const downloadDialog = path.join(SHARED_DIR, 'core', 'download-dialog.js');
  if (await fs.pathExists(downloadDialog)) {
    await fs.copy(downloadDialog, path.join(CHROME_DIR, 'download-dialog.js'));
    await fs.copy(downloadDialog, path.join(SAFARI_DIR, 'download-dialog.js'));
    console.log('  ✅ Copied download-dialog.js');
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
  const chromeBackground = `// Auto-generated Chrome background script
// This file integrates shared components - do not edit directly
// Edit the original files in the shared/ directory

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
  const safariBackground = `// Auto-generated Safari background script
// This file integrates shared components - do not edit directly
// Edit the original files in the shared/ directory

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
  
  console.log('  ✅ Generated Chrome background.js');
  console.log('  ✅ Generated Safari background.js');
}

async function generateContentScripts() {
  console.log('🔧 Generating platform-specific content scripts...');
  
  // Read shared files
  const browserCompatCode = await fs.readFile(path.join(SHARED_DIR, 'core', 'browser-compat.js'), 'utf8');
  const contentBaseCode = await fs.readFile(path.join(SHARED_DIR, 'core', 'content-base.js'), 'utf8');
  const chromeConfigCode = await fs.readFile(path.join(SHARED_DIR, 'config', 'chrome-config.js'), 'utf8');
  const safariConfigCode = await fs.readFile(path.join(SHARED_DIR, 'config', 'safari-config.js'), 'utf8');

  // Chrome content script wrapper
  const chromeContent = `// Auto-generated Chrome content script
// This file integrates shared components - do not edit directly
// Edit the original files in the shared/ directory

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
  const safariContent = `// Auto-generated Safari content script
// This file integrates shared components - do not edit directly
// Edit the original files in the shared/ directory

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
  
  console.log('  ✅ Generated Chrome content.js');
  console.log('  ✅ Generated Safari content.js');
}

// Run the sync
if (require.main === module) {
  syncSharedFiles();
}

module.exports = { syncSharedFiles };