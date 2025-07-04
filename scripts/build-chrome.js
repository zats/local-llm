#!/usr/bin/env node

/**
 * Build Chrome extension with shared components
 */

const fs = require('fs-extra');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const CHROME_DIR = path.join(PROJECT_ROOT, 'native-foundation-models-extension');
const BUILD_DIR = path.join(PROJECT_ROOT, 'build', 'chrome');

async function buildChrome() {
  console.log('🔧 Building Chrome extension...');
  
  try {
    // Clean and create build directory
    await fs.remove(BUILD_DIR);
    await fs.ensureDir(BUILD_DIR);
    
    // Copy all files from Chrome extension directory
    await fs.copy(CHROME_DIR, BUILD_DIR);
    
    // Generate final background script
    await generateChromeBackground();
    
    console.log('✅ Chrome extension built successfully!');
    console.log('📁 Build output:', path.relative(PROJECT_ROOT, BUILD_DIR));
    
  } catch (error) {
    console.error('❌ Chrome build failed:', error.message);
    process.exit(1);
  }
}

async function generateChromeBackground() {
  const backgroundPath = path.join(BUILD_DIR, 'background.js');
  
  // Read the generated background script if it exists, otherwise create from template
  const generatedPath = path.join(BUILD_DIR, 'background-generated.js');
  
  if (await fs.pathExists(generatedPath)) {
    await fs.copy(generatedPath, backgroundPath);
    await fs.remove(generatedPath); // Clean up generated file
  } else {
    console.log('⚠️  No generated background script found. Run "pnpm sync" first.');
  }
}

if (require.main === module) {
  buildChrome();
}

module.exports = { buildChrome };