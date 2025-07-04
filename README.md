# Native Foundation Models

<p align="center">
  <img src="docs/nfm.png" alt="Native Foundation Models Logo" width="200"/>
</p>

<p align="center">
  <strong>Native AI Integration for the Modern Web</strong>
</p>

<p align="center">
  Seamlessly integrate powerful language models directly into web applications with zero latency, complete privacy, and native performance on macOS.
</p>

<p align="center">
  <a href="https://github.com/zats/native-foundation-models/releases/latest/download/NativeFoundationModels.zip">
    <img src="https://img.shields.io/badge/Download-macOS%20App-blue?style=for-the-badge" alt="Download for macOS">
  </a>
</p>

<p align="center">
  <sub>Requires macOS® 26 Tahoe and Apple Intelligence®</sub>
</p>

## Why Native Foundation Models?

### 🚀 Zero Latency
Run language models locally with no network delays. Instant responses for real-time applications and interactive experiences.

### 🔒 Complete Privacy
Your data never leaves your device. Process sensitive information locally without sending it to external APIs or cloud services.

### ⚡ Native Performance
Leverage Apple's FoundationModels framework for optimized performance on macOS with hardware acceleration.

### 🌐 Web Integration
Simple JavaScript API that works with any web framework. Add AI capabilities to existing applications in minutes.

### 📡 Real-time Streaming
Stream responses token by token for responsive user experiences. Perfect for chat interfaces and live content generation.

### 🔧 Developer Friendly
Clean, modern API with TypeScript support, comprehensive documentation, and easy integration patterns.

## 📦 Repository Structure

This repository contains all the components needed to run Native Foundation Models on your Mac:

### [`/macOS-container-app`](./macOS-container-app)
The macOS installer application that sets up Native Foundation Models on your system. This SwiftUI app handles:
- Installation of the native binary to `~/bin`
- Configuration of native messaging host
- Chrome extension installation guidance
- System requirements verification

### [`/native-foundation-models-extension`](./native-foundation-models-extension)
The Chrome extension that bridges web applications with the native host. Features include:
- JavaScript API (`window.nativeFoundationModels`)
- Automatic connection management
- Error handling and retries
- TypeScript type definitions

### [`/docs`](./docs)
The project website and documentation, including:
- Interactive demos
- API documentation
- Integration examples
- Getting started guide

## 🚀 Quick Start

1. **Download the installer**: [Download NativeFoundationModels.zip](https://github.com/zats/native-foundation-models/releases/latest/download/NativeFoundationModels.zip)
2. **Run the macOS app**: Open the downloaded app and follow the installation steps
3. **Install the Chrome extension**: The app will guide you to install the browser extension
4. **Start coding**: Use the simple JavaScript API in your web applications

```javascript
// Check if Native Foundation Models is available (OpenAI-compatible)
const status = await window.nativeFoundationModels.checkAvailability();
if (status.available) {
  console.log('Ready to use!');
}

// Generate content (OpenAI-compatible format)
const result = await window.nativeFoundationModels.getCompletion('Explain quantum computing');
console.log(result.choices[0].message.content);

// Stream responses (yields OpenAI-compatible chunks)
const stream = await window.nativeFoundationModels.getCompletionStream('Write a story');
for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content;
  if (content) {
    updateUI(content); // Extract content from chunk
  }
}
```

## 🛠️ Development

### Shared Extension Architecture

This project uses a **unified codebase** for Chrome and Safari extensions to minimize duplication:

```bash
# One-time setup: installs dependencies, cleans duplicates, updates .gitignore
pnpm setup

# Start development with auto-sync file watching
pnpm dev

# Manual sync of shared files
pnpm sync

# Build both extensions
pnpm build
```

**Key benefits:**
- ✅ **70% less code duplication** between Chrome and Safari
- ✅ **Single source of truth** in `shared/` directory
- ✅ **Automatic synchronization** during development
- ✅ **Platform-specific configurations** for browser differences

See [SHARED_EXTENSION_WORKFLOW.md](SHARED_EXTENSION_WORKFLOW.md) for detailed development guide.

### Component Build Processes

Each component has its own build process and README:

- **macOS Container App**: Xcode project using SwiftUI
- **Native App**: Swift package with native messaging protocol  
- **Chrome/Safari Extensions**: Unified codebase with platform-specific builds
- **Website**: Static HTML with live demos

## 🔗 Links

- [Website](https://zats.github.io/native-foundation-models/)
- [Chrome Extension](https://chromewebstore.google.com/detail/native-foundation-models/jjmocainopehgedhgjpanckkalhiodmj)
- [Issues](https://github.com/zats/native-foundation-models/issues)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 👨‍💻 Author

Created by [@zats](https://x.com/zats)

---

<p align="center">
  Built with 🖤 for the developer community
</p>