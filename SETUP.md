# ChromeLLM Setup Guide

## Quick Setup

Run the automated setup script:
```bash
./setup_chrome_extension.sh
```

Then follow the steps displayed to complete the Chrome extension setup.

## Manual Setup Steps

### 1. Build Native App
```bash
cd native-app
swift build -c release
```

### 2. Install Native App
```bash
mkdir -p ~/bin
cp .build/release/ChromeLLMNative ~/bin/chromellm-native
chmod +x ~/bin/chromellm-native
```

### 3. Install Native Messaging Manifest
```bash
mkdir -p ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts
cp com.chromellm.native.json ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/
```

### 4. Load Chrome Extension
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked" and select the `chrome-extension` directory
4. Copy the Extension ID from the extension card

### 5. Update Extension ID
```bash
./update_manifest_with_id.sh <EXTENSION_ID>
```

## Testing

### Test Native Messaging Directly
```bash
python3 test_native_messaging.py
```

### Test Chrome Extension
1. Open `test_extension.html` in Chrome
2. Click the test buttons to verify functionality
3. Check browser console for any errors

### Test Website Integration  
1. Open `sample-website/index.html` in Chrome
2. Use the demo interface to test the API

## Architecture

- **Chrome Extension**: Provides website API and playground UI
- **Native App**: Swift app handling LLM operations via native messaging
- **Sample Website**: Demonstrates API usage

## API Reference

The extension exposes `window.chromeNativeLLM` with methods:
- `checkAvailability()`: Check if LLM is available
- `getCompletion(prompt, options)`: Get completion response
- `getCompletionStream(prompt, options)`: Get streaming completion

## Troubleshooting

1. **Extension not loading**: Check Developer mode is enabled
2. **Native app not connecting**: Verify binary path in manifest
3. **API not available**: Check extension ID in manifest
4. **LLM not working**: Ensure macOS LLM framework is available

## File Structure

```
ChromeLLM/
├── chrome-extension/        # Chrome extension files
├── native-app/             # Swift native messaging app
├── sample-website/         # Demo website
├── test_extension.html     # Extension test page
├── test_native_messaging.py # Native messaging test
└── setup_chrome_extension.sh # Automated setup
```