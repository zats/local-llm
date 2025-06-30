# ChromeLLM Sample Website

A demonstration website that showcases how to integrate with the ChromeLLM extension API.

## Features

- **API Detection**: Checks if the ChromeLLM extension is installed and available
- **Availability Check**: Verifies if the on-device LLM is ready to use
- **Single Completion**: Demonstrates `getCompletion()` API for one-shot responses
- **Streaming Completion**: Shows `getCompletionStream()` API for real-time streaming
- **Parameter Controls**: Configurable temperature, max tokens, and sampling modes
- **Error Handling**: Proper error display and user feedback

## Usage

1. Install and enable the ChromeLLM extension in Chrome
2. Open `index.html` in Chrome
3. The page will automatically detect the extension and check availability
4. Try the different API methods with custom prompts and parameters

## API Examples

### Basic Detection
```javascript
if (window.chromeNativeLLM) {
  console.log('ChromeLLM extension detected!');
}
```

### Check Availability
```javascript
const status = await window.chromeNativeLLM.checkAvailability();
console.log('Available:', status.available);
```

### Generate Completion
```javascript
const response = await window.chromeNativeLLM.getCompletion(
  'Hello, world!',
  { 
    temperature: 0.8, 
    maximumResponseTokens: 256,
    samplingMode: 'top-p'
  }
);
```

### Stream Response
```javascript
for await (const token of window.chromeNativeLLM.getCompletionStream(prompt, options)) {
  console.log(token);
}
```

## Files

- `index.html`: Main demo page with UI
- `demo.js`: JavaScript implementation of API usage
- `README.md`: This documentation

## Development

To test locally:
1. Serve the files using any HTTP server (e.g., `python -m http.server`)
2. Access via `http://localhost:8000`
3. Ensure the ChromeLLM extension is loaded and configured