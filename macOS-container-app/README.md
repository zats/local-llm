# macOS Container App

The Native Foundation Models installer application for macOS.

## Overview

This SwiftUI application provides a user-friendly installer that sets up Native Foundation Models on your Mac. It handles the complete installation process including binary deployment, native messaging host configuration, and Chrome extension setup.

## Features

- 🎯 **Step-by-step installation** - Guided process with real-time status monitoring
- 🔄 **Automatic detection** - Checks if components are already installed
- 📦 **Binary installation** - Deploys the native binary to `~/bin/nativefoundationmodels-native`
- 🔧 **Native messaging setup** - Configures Chrome native messaging host JSON
- 🌐 **Extension guidance** - Opens Chrome Web Store for extension installation
- 🖥️ **Native macOS UI** - Beautiful SwiftUI interface with animations

## Architecture

```
macOS-container-app/
├── NativeFoundationModels/
│   ├── NativeFoundationModelsApp.swift    # Main app entry point
│   ├── ContentView.swift                  # UI implementation
│   ├── AppMover/                          # App relocation utility
│   └── Assets.xcassets/                   # App icons and images
└── NativeFoundationModels.xcodeproj/      # Xcode project
```

## Installation Steps

The app performs two main installation steps:

### Step 1: Native Components
- Creates `~/bin` directory if it doesn't exist
- Copies the native binary with executable permissions
- Creates native messaging host configuration at:
  ```
  ~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.nativeFoundationModels.native.json
  ```

### Step 2: Chrome Extension
- Opens the Chrome Web Store page
- Monitors for successful extension installation across multiple browsers:
  - Google Chrome
  - Microsoft Edge
  - Brave
  - Arc
  - Vivaldi

## Building from Source

### Requirements
- macOS 15.0+
- Xcode 15.0+
- Swift 5.9+

### Build Steps

1. Open the project in Xcode:
   ```bash
   open NativeFoundationModels.xcodeproj
   ```

2. Select your development team in project settings

3. Build and run (⌘R)

### Distribution

To create a distributable app:

1. Archive the project (Product → Archive)
2. Export with "Developer ID" signing
3. Notarize the app for distribution
4. Create a ZIP for download

## Code Structure

### `InstallationStepManager`
Manages the installation process and monitors completion status:
- Binary installation status
- Extension detection across browsers
- Real-time monitoring with Timer

### `InstallationStepView`
SwiftUI view component for each installation step:
- Visual status indicators
- Progress animations
- Action buttons

## Troubleshooting

### Binary not installing
- Ensure `~/bin` directory permissions
- Check for existing binary conflicts

### Extension not detected
- Refresh the monitoring by restarting the app
- Manually check extension installation in browser

### Native messaging not working
- Verify JSON file exists at the correct location
- Check JSON syntax is valid
- Ensure binary path in JSON is correct

## License

MIT License - see [LICENSE](../LICENSE) for details.