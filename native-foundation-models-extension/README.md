# LocalLLM Chrome Extension

Browser extension that provides the `window.localLLM` API for web applications.

## Overview

This Chrome extension bridges web applications with the native Foundation Models host, enabling websites to leverage on-device AI capabilities through a simple JavaScript API.

## Features

- 🌐 **Global API** - Exposes `window.localLLM` on all web pages
- 🔄 **Automatic Connection** - Manages native host connection lifecycle
- 🔁 **Retry Logic** - Automatic reconnection on connection loss
- 📝 **TypeScript Support** - Full type definitions included
- 🛡️ **Error Handling** - Graceful error handling with detailed messages
- 🎯 **Promise-based API** - Modern async/await support

## Installation

### From Chrome Web Store
1. Visit the [Chrome Web Store page](https://chromewebstore.google.com/detail/native-foundation-models/jjmocainopehgedhgjpanckkalhiodmj)
2. Click "Add to Chrome"
3. Confirm the installation

### From Source (Development)
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `native-foundation-models-extension` directory

## API Reference

### `window.localLLM.checkAvailability()`
Checks if the native host is available and responding.

```javascript
if (await window.localLLM.available()) {
  console.log('Ready to use!');
}
```

### `window.localLLM.getCompletion(prompt, options?)`
Generates a completion for the given prompt.

```javascript
const result = await window.localLLM.getCompletion(
  'Explain quantum computing',
  {
    temperature: 0.7,
    maxTokens: 500
  }
);
console.log(result.response);
```

### `window.localLLM.getCompletionStream(prompt, options?)`
Streams a completion token by token.

```javascript
const stream = await window.localLLM.getCompletionStream('Write a poem');
for await (const token of stream) {
  process.stdout.write(token);
}
```

## Architecture

```
native-foundation-models-extension/
├── manifest.json          # Extension manifest (v3)
├── background.js          # Service worker for native messaging
├── content.js            # Content script injected into pages
├── popup.html            # Extension popup UI
├── popup.js             # Popup logic
└── inject.js            # Injected API implementation
```

## How It Works

1. **Content Script** (`content.js`)
   - Injected into every web page
   - Creates a script element to inject the API

2. **Injected Script** (`inject.js`)
   - Defines `window.localLLM`
   - Communicates with content script via custom events

3. **Background Service Worker** (`background.js`)
   - Maintains connection to native host
   - Routes messages between content scripts and native host
   - Handles connection lifecycle

4. **Message Flow**
   ```
   Web Page → Injected API → Content Script → Background → Native Host
   ```

## Development

### Building
No build step required - the extension uses vanilla JavaScript.

### Testing
1. Make changes to the extension files
2. Go to `chrome://extensions/`
3. Click the refresh button on the extension card
4. Test on any web page

### Debugging

#### Console Logs
- **Web page context**: Open DevTools on the web page
- **Background script**: Go to `chrome://extensions/` → "Inspect views: service worker"
- **Popup**: Right-click the extension icon → "Inspect popup"

#### Common Issues

**"Native host not found"**
- Ensure the native binary is installed at `~/bin/nativefoundationmodels-native`
- Check the native messaging host JSON is in the correct location
- Verify the extension ID matches in the host configuration

**"Connection lost"**
- The native host may have crashed
- Check system logs for error messages
- Try reloading the extension

## Permissions

The extension requires minimal permissions:
- `nativeMessaging` - To communicate with the native host
- No host permissions - Works on all websites automatically

## Browser Support

- ✅ Google Chrome
- ✅ Microsoft Edge
- ✅ Brave
- ✅ Arc
- ✅ Vivaldi
- ❌ Firefox (uses different native messaging API)
- ❌ Safari (requires Safari App Extension)

## Security

- Only communicates with the specific native host ID
- No external network requests
- No access to user data beyond what's explicitly passed to the API
- Messages are validated before processing

## License

MIT License - see [LICENSE](../LICENSE) for details.