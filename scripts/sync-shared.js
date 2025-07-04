#!/usr/bin/env node

/**
 * Sync shared files to both Chrome and Safari extension directories
 * This script copies shared components and creates platform-specific implementations
 */

const fs = require('fs-extra');
const path = require('path');
const { getGeneratedFilesPaths, getGeneratedFiles, PROJECT_ROOT, CHROME_DIR, SAFARI_DIR } = require('./shared-files-util');

const SHARED_DIR = path.join(PROJECT_ROOT, 'shared');
const GITIGNORE_PATH = path.join(PROJECT_ROOT, '.gitignore');

// Files that should NOT be removed from extension directories (platform-specific)
const PLATFORM_SPECIFIC_FILES = {
  chrome: [
    'manifest.json',
    'popup.html',
    'popup.js',
    'popup-api.js',
    'README.md'
  ],
  safari: [
    'manifest.json',
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
    
    // Update .gitignore with current generated files
    await updateGitignore();
    
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

async function generateInjectedScripts() {
  console.log('🔧 Generating platform-specific injected scripts...');
  
  // Read shared files
  const injectedBaseCode = await fs.readFile(path.join(SHARED_DIR, 'core', 'injected-base.js'), 'utf8');
  const chromeConfigCode = await fs.readFile(path.join(SHARED_DIR, 'config', 'chrome-config.js'), 'utf8');
  const safariConfigCode = await fs.readFile(path.join(SHARED_DIR, 'config', 'safari-config.js'), 'utf8');

  // Chrome injected script wrapper
  const chromeInjected = `// Auto-generated Chrome injected script
// This file integrates shared components - do not edit directly
// Edit the original files in the shared/ directory

// Load Chrome configuration
${chromeConfigCode}

// Load shared injected script logic
${injectedBaseCode}

// Initialize with Chrome configuration and expose API
window.nativeFoundationModels = new UnifiedInjectedScript.NativeFoundationModels(ChromeConfig);
`;

  // Safari injected script wrapper
  const safariInjected = `// Auto-generated Safari injected script
// This file integrates shared components - do not edit directly
// Edit the original files in the shared/ directory

// Load Safari configuration
${safariConfigCode}

// Load shared injected script logic
${injectedBaseCode}

// Initialize with Safari configuration and expose API
window.nativeFoundationModels = new UnifiedInjectedScript.NativeFoundationModels(SafariConfig);
`;

  // Write generated files
  await fs.writeFile(path.join(CHROME_DIR, 'injected.js'), chromeInjected);
  await fs.writeFile(path.join(SAFARI_DIR, 'inject.js'), safariInjected);
  
  console.log('  ✅ Generated Chrome injected.js');
  console.log('  ✅ Generated Safari inject.js');
}

async function updateGitignore() {
  console.log('📝 Updating .gitignore with generated files...');
  
  let gitignoreContent = '';
  
  // Read existing .gitignore if it exists
  if (await fs.pathExists(GITIGNORE_PATH)) {
    gitignoreContent = await fs.readFile(GITIGNORE_PATH, 'utf8');
  }
  
  // Remove existing generated files section if it exists
  const lines = gitignoreContent.split('\n');
  const startIndex = lines.findIndex(line => line.includes('# Generated files from shared sources'));
  
  if (startIndex !== -1) {
    // Find the end of the generated files section (next comment or end of file)
    let endIndex = lines.length;
    for (let i = startIndex + 1; i < lines.length; i++) {
      if (lines[i].startsWith('#') && !lines[i].includes('Generated files from shared sources')) {
        endIndex = i;
        break;
      }
    }
    
    // Remove the old section
    lines.splice(startIndex, endIndex - startIndex);
    gitignoreContent = lines.join('\n');
  }
  
  // Add current generated files section
  const generatedFilesPaths = getGeneratedFilesPaths();
  
  if (!gitignoreContent.endsWith('\n') && gitignoreContent.length > 0) {
    gitignoreContent += '\n';
  }
  
  gitignoreContent += '\n' + generatedFilesPaths.join('\n') + '\n';
  
  await fs.writeFile(GITIGNORE_PATH, gitignoreContent);
  console.log('  ✅ Updated .gitignore with current generated files');
}

// Run the sync
if (require.main === module) {
  syncSharedFiles();
}

module.exports = { syncSharedFiles };