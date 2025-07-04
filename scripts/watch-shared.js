#!/usr/bin/env node

/**
 * Watch shared files and automatically sync changes to browser extensions
 */

const chokidar = require('chokidar');
const path = require('path');
const { syncSharedFiles } = require('./sync-shared');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SHARED_DIR = path.join(PROJECT_ROOT, 'shared');

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