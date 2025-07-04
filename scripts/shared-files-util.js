#!/usr/bin/env node

/**
 * Shared utility for managing generated files list
 * Used by sync-shared.js to maintain consistent file tracking
 */

const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const CHROME_DIR = path.join(PROJECT_ROOT, 'native-foundation-models-extension');
const SAFARI_DIR = path.join(PROJECT_ROOT, 'macOS-container-app', 'SafariExtension', 'Resources');

/**
 * Get all generated file paths that should be ignored in git
 */
function getGeneratedFilesPaths() {
  const chromeFiles = [
    'background.js',
    'content.js',
    'browser-compat.js',
    'download-dialog.js',
    'injected.js',
    'brain.png',
    'prism.js/'
  ];

  const safariFiles = [
    'background.js',
    'content.js',
    'browser-compat.js',
    'download-dialog.js',
    'inject.js',
    'brain.png',
    'prism.js/'
  ];

  const chromePaths = chromeFiles.map(file => `native-foundation-models-extension/${file}`);
  const safariPaths = safariFiles.map(file => `macOS-container-app/SafariExtension/Resources/${file}`);

  return [
    '# Generated files from shared sources - DO NOT EDIT',
    ...chromePaths,
    ...safariPaths
  ];
}

/**
 * Get list of generated files (without paths, for cleanup operations)
 */
function getGeneratedFiles() {
  return [
    'background.js',
    'content.js',
    'browser-compat.js',
    'download-dialog.js',
    'injected.js',  // Chrome
    'inject.js',    // Safari
    'brain.png',
    'prism.js'
  ];
}

module.exports = {
  getGeneratedFilesPaths,
  getGeneratedFiles,
  PROJECT_ROOT,
  CHROME_DIR,
  SAFARI_DIR
};