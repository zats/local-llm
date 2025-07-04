#!/usr/bin/env node

/**
 * Shared utility for managing generated files list
 * Used by sync-shared.js to maintain consistent file tracking
 */

const path = require('path');
const fs = require('fs-extra');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const CHROME_DIR = path.join(PROJECT_ROOT, 'native-foundation-models-extension');
const SAFARI_DIR = path.join(PROJECT_ROOT, 'macOS-container-app', 'SafariExtension', 'Resources');
const GITIGNORE_PATH = path.join(PROJECT_ROOT, '.gitignore');

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
    'prism.js/',
    'popup.html',
    'popup.css',
    'popup.js',
    'popup-api.js'
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
    'prism.js',
    'popup.html',
    'popup.css',
    'popup.js',
    'popup-api.js'
  ];

  // Browser-specific files
  const browserSpecificFiles = [
    'injected.js',  // Chrome
    'inject.js'     // Safari
  ];

  return [...commonFiles, ...browserSpecificFiles];
}

/**
 * Update .gitignore with generated files
 */
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
  console.log('    Updated .gitignore with current generated files');
}

module.exports = {
  getGeneratedFilesPaths,
  getGeneratedFiles,
  updateGitignore,
  PROJECT_ROOT,
  CHROME_DIR,
  SAFARI_DIR
};