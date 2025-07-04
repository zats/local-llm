# Native Foundation Models - Project Context

## Project Overview
This is a cross-browser extension system for Native Foundation Models that provides local AI integration for web applications on macOS. The project consists of:

- **Chrome Extension**: Located in `native-foundation-models-extension/`
- **Safari Extension**: Located in `macOS-container-app/SafariExtension/`
- **Shared Codebase**: Located in `shared/` directory
- **macOS Container App**: SwiftUI app that installs the native binary and Safari extension

## Architecture: Unified Extension System

### Shared Codebase

NEVER modify files that live in shared/ in there derived locations (native-foundation-models-extension/ and macOS-container-app/SafariExtension/).
When modifying double check that both Safar and Chrome extension can still function.

The project uses a **single source of truth** architecture to eliminate code duplication:

- **70% of code is shared** between Chrome and Safari extensions
- **Shared files** are in `shared/` directory and automatically synced to both extensions. 
- **Platform-specific configs** handle browser differences
- **Auto-generated files** (marked in .gitignore) are created from shared sources

### File Structure
```
shared/
├── core/
│   ├── background-base.js    # Core background script logic
│   ├── content-base.js       # Core content script logic
│   ├── browser-compat.js     # Cross-browser compatibility layer
│   └── download-dialog.js    # Download functionality
├── config/
│   ├── chrome-config.js      # Chrome-specific settings
│   └── safari-config.js      # Safari-specific settings
└── assets/
    ├── images/brain.png      # Extension icon
    └── prism.js/            # Syntax highlighting
```

## Build System Commands

### Essential Commands (use pnpm)
```bash
# One-time setup: clean duplicates, update .gitignore, initial sync
pnpm setup

# Development: watch shared files and auto-sync changes
pnpm dev

# Manual sync: copy shared files to both extensions
pnpm sync

# Build: create production builds for both extensions
pnpm build

# Individual builds
pnpm build:chrome  # Chrome extension only
pnpm build:safari  # Safari extension only
```

### Generated Files (Never Edit Directly)
These files are auto-generated from shared sources:
- `*/background.js` - Platform-specific background scripts
- `*/content.js` - Platform-specific content scripts
- `*/browser-compat.js` - Cross-browser compatibility
- `*/download-dialog.js` - Download functionality
- `*/brain.png` - Extension icon
- `*/prism.js/` - Syntax highlighting

## Development Workflow

### Making Changes
1. **Shared code**: Edit files in `shared/` directory
2. **Platform-specific**: Edit files directly in extension directories
3. **Auto-sync**: Run `pnpm dev` to watch and sync changes
4. **Manual sync**: Run `pnpm sync` when needed

### File Synchronization
- `scripts/sync-shared.js` combines shared modules with platform configs
- `scripts/watch-shared.js` monitors shared files for changes
- Generated files overwrite existing background.js/content.js files

### Build Process
- `scripts/build-chrome.js` creates Chrome extension build
- `scripts/build-safari.js` creates Safari extension build  
- Safari extension is ultimately built through Xcode

## Important Notes
- **Never edit generated files** - they are overwritten on sync
- **Platform-specific files** remain in their respective directories
- **Use pnpm** for package management (user preference)
- **Git tracking**: Generated files are ignored via .gitignore
- **Source control**: Use sapling (sl) - check before assuming git commands