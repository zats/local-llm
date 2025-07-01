# Native Foundation Models - Core Native Application

The native messaging host that bridges web applications with Apple's FoundationModels framework.

## Overview

This Swift application serves as the native messaging host, enabling secure communication between Chrome extensions and Apple's on-device language models. It implements the Chrome Native Messaging protocol to provide AI capabilities to web applications.

## Features

- 🤖 **Apple FoundationModels Integration** - Direct access to on-device AI models
- 📡 **Native Messaging Protocol** - Implements Chrome's native messaging specification
- 🔄 **Streaming Support** - Real-time token-by-token response streaming
- 🔒 **Secure Communication** - Sandboxed execution with limited permissions
- ⚡ **High Performance** - Optimized for low latency responses

## Architecture

```
NativeFoundationModels/
├── Sources/
│   └── main.swift                 # Main application entry point
├── Package.swift                  # Swift package manifest
└── com.nativeFoundationModels.native.json  # Native messaging host manifest
```

## Native Messaging Protocol

The application implements Chrome's native messaging protocol:

### Message Format
- 4-byte message length (little-endian)
- JSON message body

### Request Structure
```json
{
  "action": "getCompletion",
  "prompt": "Your prompt here",
  "options": {
    "temperature": 0.7,
    "maxTokens": 500
  }
}
```

### Response Structure
```json
{
  "response": "Generated text...",
  "error": null,
  "timestamp": 1234567890
}
```

## API Methods

### `checkAvailability`
Verifies the native host is running and models are available.

### `getCompletion`
Generates a complete response for the given prompt.

### `getCompletionStream`
Streams response tokens as they're generated.

## Building from Source

### Requirements
- macOS 15.0+
- Swift 5.9+
- Xcode Command Line Tools

### Build Steps

1. Build the executable:
   ```bash
   swift build -c release
   ```

2. The binary will be at:
   ```
   .build/release/nativefoundationmodels-native
   ```

### Installation

1. Copy the binary to `~/bin/`:
   ```bash
   cp .build/release/nativefoundationmodels-native ~/bin/
   chmod +x ~/bin/nativefoundationmodels-native
   ```

2. Install the native messaging host manifest:
   ```bash
   mkdir -p ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/
   cp com.nativeFoundationModels.native.json ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/
   ```

## Development

### Testing Locally

Test the native messaging protocol:
```bash
echo -e '\x0e\x00\x00\x00{"action":"checkAvailability"}' | ./nativefoundationmodels-native
```

### Debugging

Enable logging by setting environment variable:
```bash
export NFM_DEBUG=1
```

View logs in Console.app or:
```bash
log stream --predicate 'subsystem == "com.nativeFoundationModels"'
```

## Security Considerations

- Runs with minimal permissions
- Only accepts messages from allowed Chrome extension IDs
- Input validation on all received messages
- No network access required
- No file system access beyond stdio

## Error Handling

Common error codes:
- `NFM001` - FoundationModels framework not available
- `NFM002` - Invalid message format
- `NFM003` - Model initialization failed
- `NFM004` - Generation error

## Performance Optimization

- Model loaded once and cached
- Efficient message parsing
- Minimal memory allocations
- Stream processing for large responses

## License

MIT License - see [LICENSE](../LICENSE) for details.