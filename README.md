# LocalLLM

<p align="center">
  <img src="docs/nfm.png" alt="LocalLLM Logo" width="200"/>
</p>

<p align="center">
  <strong>Private AI for Web Applications</strong>
</p>

<p align="center">
  Run powerful language models locally in your web apps with zero latency, complete privacy, and native macOS performance.
</p>

<p align="center">
  <a href="https://github.com/zats/local-llm/releases/latest/download/NativeFoundationModels.zip">
    <img src="https://img.shields.io/badge/Download-macOS%20App-blue?style=for-the-badge" alt="Download for macOS">
  </a>
</p>

<p align="center">
  <sub>Requires macOS 15+ with Apple Intelligence</sub>
</p>

## What is LocalLLM?

LocalLLM brings Apple's on-device AI models directly to web applications through a simple JavaScript API. It bridges the gap between powerful local language models and modern web development, enabling developers to build AI-powered experiences without compromising user privacy or dealing with API costs and latency.

## Why LocalLLM?

**For Users:**
- 🔒 **Complete Privacy** - Your data never leaves your device
- 🚀 **Zero Latency** - Instant responses with no network delays
- 💰 **No API Costs** - Use powerful AI models without subscription fees
- ⚡ **Native Performance** - Optimized for Apple Silicon

**For Developers:**
- 🌐 **Simple Integration** - OpenAI-compatible JavaScript API
- 📡 **Real-time Streaming** - Token-by-token response streaming
- 🔧 **Framework Agnostic** - Works with React, Vue, vanilla JS, etc.
- 🛠️ **TypeScript Support** - Full type definitions included

## Quick Start

### 1. Install LocalLLM
Download and run the [macOS installer](https://github.com/zats/local-llm/releases/latest/download/NativeFoundationModels.zip). It will:
- Install the native binary and Chrome extension
- Set up Safari extension (if needed)
- Verify system requirements

### 2. Use in Your Web App
```javascript
// Check availability
if (await window.localLLM.available()) {
  console.log('LocalLLM is ready!');
}

// Generate text (OpenAI-compatible)
const response = await window.localLLM.chat.completions.create({
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Explain quantum computing' }
  ]
});
console.log(response.choices[0].message.content);

// Stream responses
const stream = await window.localLLM.chat.completions.create({
  messages: [
    { role: 'user', content: 'Write a story' }
  ],
  stream: true
});

for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content;
  if (content) process(content);
}
```

### 3. Test Your Integration
Open any website with LocalLLM installed and use the browser's developer console to test the API immediately.

## Development

This project uses a shared codebase architecture for Chrome and Safari extensions with native macOS integration.

### Setup
```bash
# Install dependencies
pnpm install

# Start development with file watching
pnpm dev
```

### Architecture
- **`shared/`** - Common extension logic (edit these files)
- **`macOS-container-app/`** - Native macOS app with Safari extension
- **`native-foundation-models-extension/`** - Chrome extension (generated files)
- **`scripts/`** - Build automation and sync tools

The sync script automatically generates platform-specific files from shared sources. See [CLAUDE.md](CLAUDE.md) for detailed development guidelines.

## Links

- [🌐 Website & Demos](https://zats.github.io/native-foundation-models/)
- [🔗 Chrome Extension](https://chromewebstore.google.com/detail/native-foundation-models/jjmocainopehgedhgjpanckkalhiodmj)
- [📚 Full Documentation](https://zats.github.io/native-foundation-models/docs/)

## Contributing

Contributions are welcome! Please:

1. **Read [CLAUDE.md](CLAUDE.md)** for project architecture and development guidelines
2. **Check existing [issues](https://github.com/zats/local-llm/issues)** or create new ones
3. **Fork and create a pull request** with your changes
4. **Test on both Chrome and Safari** before submitting

### Development Guidelines
- Edit shared code in `shared/` directory only
- Use `pnpm dev` for development with file watching
- Follow the existing code style and patterns
- Ensure changes work on both Chrome and Safari

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

<p align="center">
  Created by <a href="https://x.com/zats">@zats</a> • Built with 🖤 for the developer community
</p>