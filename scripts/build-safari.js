#!/usr/bin/env node

/**
 * Build Safari extension with shared components
 */

const fs = require('fs-extra');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SAFARI_DIR = path.join(PROJECT_ROOT, 'macOS-container-app', 'SafariExtension', 'Resources');
const BUILD_DIR = path.join(PROJECT_ROOT, 'build', 'safari');

async function buildSafari() {
  console.log('🔧 Building Safari extension...');
  
  try {
    // Clean and create build directory
    await fs.remove(BUILD_DIR);
    await fs.ensureDir(BUILD_DIR);
    
    // Copy all files from Safari extension directory
    await fs.copy(SAFARI_DIR, BUILD_DIR);
    
    // Generate final background script
    await generateSafariBackground();
    
    console.log('✅ Safari extension built successfully!');
    console.log('📁 Build output:', path.relative(PROJECT_ROOT, BUILD_DIR));
    console.log('💡 The actual Safari extension is built through Xcode');
    
  } catch (error) {
    console.error('❌ Safari build failed:', error.message);
    process.exit(1);
  }
}

async function generateSafariBackground() {
  const backgroundPath = path.join(BUILD_DIR, 'background.js');
  
  // Read the generated background script if it exists
  const generatedPath = path.join(BUILD_DIR, 'background-generated.js');
  
  if (await fs.pathExists(generatedPath)) {
    await fs.copy(generatedPath, backgroundPath);
    await fs.remove(generatedPath); // Clean up generated file
  } else {
    console.log('⚠️  No generated background script found. Run "pnpm sync" first.');
  }
}

if (require.main === module) {
  buildSafari();
}

module.exports = { buildSafari };