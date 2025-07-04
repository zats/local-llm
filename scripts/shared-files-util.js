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
  // Common files shared between both extensions
  const commonFiles = [
    'background.js',
    'content.js',
    'browser-compat.js',
    'download-dialog.js',
    'brain.png',
    'prism.js/'
  ];

  // Browser-specific files
  const chromeSpecificFiles = ['injected.js'];
  const safariSpecificFiles = ['inject.js'];

  // Combine files for each platform
  const chromeFiles = [...commonFiles, ...chromeSpecificFiles];
  const safariFiles = [...commonFiles, ...safariSpecificFiles];

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
  // Common files shared between both extensions
  const commonFiles = [
    'background.js',
    'content.js',
    'browser-compat.js',
    'download-dialog.js',
    'brain.png',
    'prism.js'
  ];

  // Browser-specific files
  const browserSpecificFiles = [
    'injected.js',  // Chrome
    'inject.js'     // Safari
  ];

  return [...commonFiles, ...browserSpecificFiles];
}

module.exports = {
  getGeneratedFilesPaths,
  getGeneratedFiles,
  PROJECT_ROOT,
  CHROME_DIR,
  SAFARI_DIR
};