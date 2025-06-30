# ChromeLLM Native App

macOS native application that provides on-device LLM capabilities to the Chrome extension via native messaging.

## Build Instructions

1. Build the Swift package:
   ```bash
   swift build -c release
   ```

2. Copy the executable to system location:
   ```bash
   sudo cp .build/release/ChromeLLMNative /usr/local/bin/chromellm-native
   ```

3. Install native messaging manifest:
   ```bash
   # Update the extension ID in com.chromellm.native.json first
   cp com.chromellm.native.json ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/
   ```

## Configuration

1. Get your Chrome extension ID after loading it in developer mode
2. Update `com.chromellm.native.json` with the actual extension ID
3. Replace the mock `LanguageModelSession` with actual LLM framework integration

## Architecture

- `main.swift`: Entry point
- `NativeMessagingApp.swift`: Handles Chrome extension communication
- `LanguageModelSession.swift`: LLM session management (currently mock)

## Protocol

The app communicates with the Chrome extension using JSON messages over stdin/stdout following Chrome's native messaging protocol.