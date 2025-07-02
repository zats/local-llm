#!/bin/bash

set -e

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="$PROJECT_DIR/build"
UPDATES_DIR="$PROJECT_DIR/docs/updates"
APPCAST_PATH="$PROJECT_DIR/docs/appcast.xml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

function log() {
    echo -e "${GREEN}[RELEASE]${NC} $1"
}

function warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

function error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Check if we're on a clean git state
if [[ -n $(git status --porcelain) ]]; then
    error "Git working directory is not clean. Commit or stash changes first."
fi

# Get version from command line or prompt
if [[ -z $1 ]]; then
    echo "Current version: $(git describe --tags --abbrev=0 2>/dev/null || echo 'No tags yet')"
    read -p "Enter new version (e.g., 1.1.0): " VERSION
else
    VERSION=$1
fi

# Validate version format
if [[ ! $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    error "Version must be in format X.Y.Z (e.g., 1.1.0)"
fi

log "Starting release process for version $VERSION"

# Update version in Xcode project
log "Updating version numbers..."
cd "$PROJECT_DIR/macOS-container-app"
agvtool new-marketing-version $VERSION
agvtool next-version -all

# Create build directory
log "Preparing build directory..."
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
mkdir -p "$UPDATES_DIR"

# Build application directly (simpler approach for Xcode 26)
log "Building application..."
xcodebuild -project NativeFoundationModels.xcodeproj \
    -scheme NativeFoundationModels \
    -configuration Release \
    -derivedDataPath "$BUILD_DIR/DerivedData" \
    build

# Copy app from build products
log "Copying application..."
BUILT_APP_PATH="$BUILD_DIR/DerivedData/Build/Products/Release/NativeFoundationModels.app"
if [[ -d "$BUILT_APP_PATH" ]]; then
    cp -R "$BUILT_APP_PATH" "$BUILD_DIR/"
else
    error "App build failed. Expected app at: $BUILT_APP_PATH"
fi

# Check if app was copied successfully
if [[ ! -d "$BUILD_DIR/NativeFoundationModels.app" ]]; then
    error "App copy failed."
fi

# Sign the app manually since we bypassed the export process
log "Code signing application..."
# Find the Developer ID Application certificate
SIGNING_IDENTITY=$(security find-identity -v -p codesigning | grep "Developer ID Application" | head -1 | awk -F'"' '{print $2}')
if [[ -n "$SIGNING_IDENTITY" ]]; then
    codesign --force --sign "$SIGNING_IDENTITY" --options runtime "$BUILD_DIR/NativeFoundationModels.app"
    log "Signed with: $SIGNING_IDENTITY"
else
    warn "No Developer ID Application certificate found. App will not be signed."
fi

# Notarize app (requires Apple ID credentials)
log "Creating ZIP for distribution..."
cd "$BUILD_DIR"
ditto -c -k --keepParent "NativeFoundationModels.app" "NativeFoundationModels.zip"

if [[ -n $APPLE_ID && -n $APPLE_TEAM_ID && -n $APPLE_APP_PASSWORD ]]; then
    log "Notarizing application..."
    xcrun notarytool submit "NativeFoundationModels.zip" \
        --apple-id "$APPLE_ID" \
        --team-id "$APPLE_TEAM_ID" \
        --password "$APPLE_APP_PASSWORD" \
        --wait
    
    log "Stapling notarization ticket..."
    xcrun stapler staple "NativeFoundationModels.app"
    
    # Re-create ZIP with stapled app
    rm "NativeFoundationModels.zip"
    ditto -c -k --keepParent "NativeFoundationModels.app" "NativeFoundationModels.zip"
else
    warn "Notarization credentials not provided. App will not be notarized."
    warn "Set APPLE_ID, APPLE_TEAM_ID, and APPLE_APP_PASSWORD environment variables."
fi

# Copy release to updates directory
log "Preparing update files..."
cp "$BUILD_DIR/NativeFoundationModels.zip" "$UPDATES_DIR/"

# Generate appcast using Sparkle tools
log "Generating appcast..."
if command -v generate_appcast &> /dev/null; then
    generate_appcast "$UPDATES_DIR" -o "$APPCAST_PATH"
else
    warn "generate_appcast not found. You'll need to install Sparkle tools:"
    warn "Download from: https://github.com/sparkle-project/Sparkle/releases"
    warn "Or install via: brew install --cask sparkle"
fi

# Create release notes
log "Creating release notes..."
RELEASE_NOTES_DIR="$PROJECT_DIR/docs/release-notes"
mkdir -p "$RELEASE_NOTES_DIR"

cat > "$RELEASE_NOTES_DIR/$VERSION.md" << EOF
# What's New in v$VERSION

$(git log --pretty=format:"- %s" $(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo "HEAD~10")..HEAD | grep -E "^- (feat|fix|perf):" || echo "- General improvements and bug fixes")

## Full Changelog
$(git log --pretty=format:"- %s (%h)" $(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo "HEAD~10")..HEAD)

---
Download: [NativeFoundationModels.zip](https://github.com/zats/native-foundation-models/releases/download/v$VERSION/NativeFoundationModels.zip)
EOF

# Commit version changes
log "Committing version changes..."
cd "$PROJECT_DIR"
git add -A
git commit -m "Release version $VERSION

- Update version numbers to $VERSION
- Add release notes for $VERSION
- Update appcast for automatic updates"

# Create and push git tag
log "Creating git tag..."
git tag -a "v$VERSION" -m "Release version $VERSION"

echo ""
log "Release preparation complete! 🎉"
echo ""
echo "Next steps:"
echo "1. Push changes and tag: git push origin main && git push origin v$VERSION"
echo "2. Create GitHub release with the ZIP file: $BUILD_DIR/NativeFoundationModels.zip"
echo "3. Verify appcast is accessible: https://zats.github.io/native-foundation-models/appcast.xml"
echo ""
echo "Files created:"
echo "- Release ZIP: $BUILD_DIR/NativeFoundationModels.zip"
echo "- Appcast: $APPCAST_PATH"
echo "- Release notes: $RELEASE_NOTES_DIR/$VERSION.md"
echo ""

# Ask if user wants to push automatically
read -p "Push changes and tag to GitHub now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log "Pushing to GitHub..."
    git push origin main
    git push origin "v$VERSION"
    
    log "Creating GitHub release..."
    if command -v gh &> /dev/null; then
        gh release create "v$VERSION" \
            "$BUILD_DIR/NativeFoundationModels.zip" \
            --title "Release v$VERSION" \
            --notes-file "$RELEASE_NOTES_DIR/$VERSION.md"
        log "GitHub release created successfully!"
    else
        warn "GitHub CLI not found. Create release manually at:"
        warn "https://github.com/zats/native-foundation-models/releases/new?tag=v$VERSION"
    fi
fi

log "Release process completed! ✨"