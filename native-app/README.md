# Native Foundation Models Native App

macOS native application that provides on-device LLM capabilities to the Chrome extension via native messaging.
No more downloading 3GB+ models, no more long latency and LLM service bills! 

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
cp .build/release/NativeFoundationModelsNative ~/bin/nativefoundationmodels-native
chmod +x ~/bin/nativefoundationmodels-native
```

### 3. Load Chrome Extension
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked" and select the `native-foundation-models-extension` directory
4. Copy the Extension ID from the extension card

### 4. Install and Update Native Messaging Manifest
After loading the extension in Chrome and getting its ID, run:
```bash
./update_manifest_with_id.sh <YOUR_EXTENSION_ID>
```

## Configuration

1. Get your Chrome extension ID after loading it in developer mode
2. Run `./update_manifest_with_id.sh <YOUR_EXTENSION_ID>` with the actual extension ID
3. Replace the mock `LanguageModelSession` with actual LLM framework integration

## Testing

### Test Native Messaging Directly
```bash
python3 test_complete.py
```

### Test Chrome Extension
1. Open `test_extension.html` in Chrome
2. Click the test buttons to verify functionality
3. Check browser console for any errors

### Test Website Integration  
1. Open the test page in Chrome
2. Use the demo interface to test the API

## Architecture

- `EntryPoint.swift`: Entry point
- `NativeMessagingApp.swift`: Handles Chrome extension communication
- `LanguageModelSession.swift`: LLM session management (currently mock)

## Protocol

The app communicates with the Chrome extension using JSON messages over stdin/stdout following Chrome's native messaging protocol.

## API Reference

The extension exposes `window.nativeFoundationModels` with methods:
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
NativeFoundationModels/
├── native-foundation-models-extension/ # Chrome extension files
├── native-app/                         # Swift native messaging app
├── test_extension.html                 # Extension test page
├── test_complete.py                    # Complete test suite
├── test_consistency.py                 # Consistency tests
├── test_production.py                  # Production tests
└── setup_chrome_extension.sh           # Automated setup
```