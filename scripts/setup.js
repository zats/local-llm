#!/usr/bin/env node

/**
 * One-time setup script for the shared extension architecture
 * This handles cleanup, gitignore updates, and initial sync
 */

const fs = require('fs-extra');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const CHROME_DIR = path.join(PROJECT_ROOT, 'native-foundation-models-extension');
const SAFARI_DIR = path.join(PROJECT_ROOT, 'macOS-container-app', 'SafariExtension', 'Resources');
const GITIGNORE_PATH = path.join(PROJECT_ROOT, '.gitignore');

// Files that should be removed as they're now generated/copied from shared
const DUPLICATE_FILES = [
  'browser-compat.js',
  'download-dialog.js',
  'brain.png',
  'prism.js'
];

// Generated files to add to .gitignore
const GENERATED_FILES_PATTERNS = [
  '# Generated files from shared sources - DO NOT EDIT',
  'native-foundation-models-extension/background.js',
  'native-foundation-models-extension/content.js',
  'native-foundation-models-extension/browser-compat.js',
  'native-foundation-models-extension/download-dialog.js',
  'native-foundation-models-extension/brain.png',
  'native-foundation-models-extension/prism.js/',
  'macOS-container-app/SafariExtension/Resources/background.js',
  'macOS-container-app/SafariExtension/Resources/content.js',
  'macOS-container-app/SafariExtension/Resources/browser-compat.js',
  'macOS-container-app/SafariExtension/Resources/download-dialog.js',
  'macOS-container-app/SafariExtension/Resources/brain.png',
  'macOS-container-app/SafariExtension/Resources/prism.js/'
];

async function setup() {
  console.log('🚀 Setting up shared extension architecture...\n');
  
  try {
    // Step 1: Clean up duplicate files
    await cleanupDuplicates();
    
    // Step 2: Update .gitignore
    await updateGitignore();
    
    // Step 3: Run initial sync
    await runInitialSync();
    
    console.log('\n✅ Setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   • Run "pnpm dev" to start development with file watching');
    console.log('   • Edit shared code in the shared/ directory');
    console.log('   • Platform-specific code remains in extension directories');
    console.log('\n💡 Key commands:');
    console.log('   • pnpm dev     - Start development with auto-sync');
    console.log('   • pnpm sync    - Manual sync of shared files');
    console.log('   • pnpm build   - Build both extensions');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

async function cleanupDuplicates() {
  console.log('🧹 Cleaning up duplicate files...');
  
  // Clean Chrome extension
  console.log('   📁 Chrome extension:');
  for (const file of DUPLICATE_FILES) {
    const filePath = path.join(CHROME_DIR, file);
    if (await fs.pathExists(filePath)) {
      await fs.remove(filePath);
      console.log(`     ✖ Removed ${file}`);
    } else {
      console.log(`     ⏭ ${file} (already removed)`);
    }
  }
  
  // Clean Safari extension
  console.log('   📁 Safari extension:');
  for (const file of DUPLICATE_FILES) {
    const filePath = path.join(SAFARI_DIR, file);
    if (await fs.pathExists(filePath)) {
      await fs.remove(filePath);
      console.log(`     ✖ Removed ${file}`);
    } else {
      console.log(`     ⏭ ${file} (already removed)`);
    }
  }
}

async function updateGitignore() {
  console.log('\n📝 Updating .gitignore...');
  
  let gitignoreContent = '';
  
  // Read existing .gitignore if it exists
  if (await fs.pathExists(GITIGNORE_PATH)) {
    gitignoreContent = await fs.readFile(GITIGNORE_PATH, 'utf8');
  }
  
  // Check if generated files section already exists
  const hasGeneratedSection = gitignoreContent.includes('# Generated files from shared sources');
  
  if (!hasGeneratedSection) {
    // Add generated files section
    if (!gitignoreContent.endsWith('\n') && gitignoreContent.length > 0) {
      gitignoreContent += '\n';
    }
    
    gitignoreContent += '\n' + GENERATED_FILES_PATTERNS.join('\n') + '\n';
    
    await fs.writeFile(GITIGNORE_PATH, gitignoreContent);
    console.log('   ✅ Added generated files to .gitignore');
  } else {
    console.log('   ⏭ .gitignore already updated');
  }
}

async function runInitialSync() {
  console.log('\n🔄 Running initial sync...');
  
  // Import and run the sync function
  const { syncSharedFiles } = require('./sync-shared.js');
  await syncSharedFiles();
}

// Run setup
if (require.main === module) {
  setup();
}

module.exports = { setup };