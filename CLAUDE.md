# Cross-Browser Extension Architecture - Development Guide

This repository contains a cross-browser extension (Chrome and Safari) with a shared codebase architecture. Files in the `shared/` directory are the sources of truth and are automatically synchronized to both browser extension directories during development.

## Critical Architecture Rules


### ONLY EDIT THESE SOURCE FILES:
- `shared/` directory - ALL shared logic and components
- Platform-specific files:
  - `native-foundation-models-extension/manifest.json` (Chrome manifest)
  - `macOS-container-app/SafariExtension/Resources/manifest.json` (Safari manifest)
  - `macOS-container-app/SafariExtension/Resources/_locales/` (Safari localization)
  - `macOS-container-app/SafariExtension/Resources/images/` (Safari icons)
  - `macOS-container-app/SafariExtension/Resources/utils/` (Safari utilities)
  - `macOS-container-app/NativeChromeHost/` (Chrome native messaging host sources)

## Shared Directory Structure

```
shared/
├── assets/
│   ├── images/brain.png           # Extension icon
│   └── prism.js/                  # Syntax highlighting
├── config/
│   ├── chrome-config.js           # Chrome-specific configuration
│   └── safari-config.js           # Safari-specific configuration
├── core/
│   ├── background-base.js         # Shared background script logic
│   ├── browser-compat.js          # Cross-browser compatibility layer
│   ├── content-base.js            # Shared content script logic
│   ├── download-dialog.js         # Download functionality
│   ├── injected-base.js           # Shared injected script logic
│   └── utils/                     # Shared utilities
└── popup/
    ├── popup-api-base.js          # Shared popup API logic
    ├── popup-base.js              # Shared popup UI logic
    ├── popup-template.html        # HTML template with platform placeholders
    └── popup.css                  # Shared popup styles
```

## Generated Files

The sync script (`scripts/sync-shared.js`) generates platform-specific files by:

1. **Copying shared assets** directly (brain.png, prism.js, browser-compat.js, download-dialog.js)
2. **Generating platform-specific scripts** by combining:
   - Browser compatibility layer
   - Platform configuration (Chrome/Safari)
   - Shared base logic
   - Platform-specific initialization

### Generated File Mapping:
- `background.js` → Combines browser-compat + config + background-base
- `content.js` → Combines browser-compat + config + content-base  
- `injected.js` (Chrome) / `inject.js` (Safari) → Combines config + injected-base
- `popup.html` → Template with platform-specific buttons
- `popup-api.js` → Combines config + injected-base + popup-api-base
- `popup.js` → Combines popup-base + platform initialization

## Development Workflow

### Setup
```bash
pnpm install
```

### Development (with file watching)
```bash
pnpm dev
# or
node scripts/sync-shared.js --watch
```

### One-time sync
```bash
node scripts/sync-shared.js
```

## Making Changes

### For Shared Logic
1. Edit files in `shared/` directory
2. The watcher will automatically sync changes to both extensions
3. Test in both Chrome and Safari

### For Platform-Specific Features
1. Add configuration to `shared/config/chrome-config.js` or `shared/config/safari-config.js`
2. Use conditional logic in shared base files based on config
3. For platform-specific buttons, update `popup-template.html` placeholder comments

### For New Shared Components
1. Add to appropriate `shared/` subdirectory
2. Update `scripts/shared-files-util.js` if new generated files are created
3. Update sync script (`scripts/sync-shared.js`) to handle new file types

## Native Chrome Host

The Chrome native messaging host is built as part of the Xcode project:

- **Source Location**: `macOS-container-app/NativeChromeHost/`
- **Build Target**: `NativeFoundationModelsNative` (command-line tool)
- **Product**: `NativeFoundationModelsNative` binary
- **Installation**: Binary is bundled into the LocalLLM app and installed to `~/bin/nativefoundationmodels-native`
- **Build Dependencies**: The LocalLLM app depends on this target and automatically includes the binary

### Native Host Build Process

The native host is built automatically when building the LocalLLM app:

1. The `NativeFoundationModelsNative` target compiles Swift sources from `NativeChromeHost/`
2. The "Bundle Native Host binary" build phase copies the binary into the app bundle
3. The app installer copies the binary to `~/bin/` for Chrome extension use

## Important Notes

- Never commit generated files - they're automatically ignored in git
- Always run sync before testing changes
- Platform-specific features should be configured through config files, not by editing generated files
- The sync script ensures both extensions stay in sync with shared logic
- The native messaging host is built as part of the Xcode project, not as a separate Swift package