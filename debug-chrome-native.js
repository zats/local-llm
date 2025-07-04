// Debug script to test Chrome native messaging
// Run this in Chrome DevTools console on the extension's background page

console.log('Starting Chrome native messaging debug...');

// Test 1: Check if extension can connect
try {
  const port = chrome.runtime.connectNative('com.nativefoundationmodels.native');
  console.log('✅ Successfully connected to native app:', port);
  
  port.onMessage.addListener((msg) => {
    console.log('📨 Received from native app:', msg);
  });
  
  port.onDisconnect.addListener(() => {
    console.log('🔌 Native app disconnected');
    if (chrome.runtime.lastError) {
      console.error('❌ Disconnect error:', chrome.runtime.lastError);
    }
  });
  
  // Test message
  const testMsg = { action: 'test', requestId: 'debug-test-001' };
  console.log('📤 Sending test message:', testMsg);
  port.postMessage(testMsg);
  
} catch (error) {
  console.error('❌ Failed to connect to native app:', error);
}

// Test 2: Check manifest
console.log('📋 Extension manifest:', chrome.runtime.getManifest());

// Test 3: Check extension ID
console.log('🆔 Extension ID:', chrome.runtime.id);