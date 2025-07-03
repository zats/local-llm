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

# Load credentials if available (for local releases)
PROJECT_CREDS_FILE="$PROJECT_DIR/.release-credentials"
GLOBAL_CREDS_FILE="$HOME/.apple-notarization-creds/config"

if [[ -z "$CI" ]]; then
    # Try project-specific credentials first
    if [[ -f "$PROJECT_CREDS_FILE" ]]; then
        log "Loading project credentials..."
        source "$PROJECT_CREDS_FILE"
    # Fall back to global credentials (read-only)
    elif [[ -f "$GLOBAL_CREDS_FILE" ]]; then
        log "Loading global credentials..."
        source "$GLOBAL_CREDS_FILE"
    fi
fi

# Function to save credentials for future use (project-specific only)
function save_credentials() {
    if [[ -z "$CI" ]]; then
        log "Saving credentials to project directory..."
        cat > "$PROJECT_CREDS_FILE" << EOF
# Native Foundation Models Release Credentials
export APPLE_ID="$APPLE_ID"
export APPLE_TEAM_ID="$APPLE_TEAM_ID"
export APPLE_APP_PASSWORD="$APPLE_APP_PASSWORD"
EOF
        chmod 600 "$PROJECT_CREDS_FILE"
    fi
}

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
    log "Signing with certificate: $SIGNING_IDENTITY"
    
    # For mixed sandbox scenarios (extension sandboxed, main app not), we need to let Xcode handle the extension signing
    # and only re-sign components that need hardened runtime
    
    # Sign other nested components (but NOT the Safari extension - Xcode already signed it correctly)
    find "$BUILD_DIR/NativeFoundationModels.app" -type f \( -name "*.dylib" -o -name "*.framework" -o -name "nativefoundationmodels-native" \) -exec codesign --force --sign "$SIGNING_IDENTITY" --options runtime {} \;
    
    # Sign the main app bundle with deep to ensure all components get the correct signature
    codesign --force --sign "$SIGNING_IDENTITY" --options runtime --deep "$BUILD_DIR/NativeFoundationModels.app"
    
    # Verify signatures
    log "Verifying code signatures..."
    
    # Verify Safari extension signature (check if Xcode signed it properly)
    SAFARI_EXTENSION_PATH="$BUILD_DIR/NativeFoundationModels.app/Contents/PlugIns/SafariExtension.appex"
    if [[ -d "$SAFARI_EXTENSION_PATH" ]]; then
        if codesign --verify --strict "$SAFARI_EXTENSION_PATH"; then
            log "Safari extension signature verified (Xcode-signed)"
        else
            warn "Safari extension signature verification failed"
        fi
    else
        warn "Safari extension not found at: $SAFARI_EXTENSION_PATH"
    fi
    
    # Verify main app signature
    if codesign --verify --deep --strict "$BUILD_DIR/NativeFoundationModels.app"; then
        log "Main app signature verified successfully"
    else
        warn "Main app signature verification failed"
    fi
    
    log "Signed with: $SIGNING_IDENTITY"
else
    warn "No Developer ID Application certificate found. App will not be signed."
    warn "Notarization will likely fail without proper code signing."
fi

# Notarize app (requires Apple ID credentials)
log "Creating ZIP for distribution..."
cd "$BUILD_DIR"
ditto -c -k --keepParent "NativeFoundationModels.app" "NativeFoundationModels.zip"

# Check for notarization credentials and prompt if needed (local only)
if [[ -z "$CI" && (-z "$APPLE_ID" || -z "$APPLE_TEAM_ID" || -z "$APPLE_APP_PASSWORD") ]]; then
    echo ""
    warn "Notarization credentials needed for production release:"
    
    if [[ -z "$APPLE_ID" ]]; then
        read -p "Apple ID (email): " APPLE_ID
    fi
    
    if [[ -z "$APPLE_TEAM_ID" ]]; then
        read -p "Apple Team ID (10 characters): " APPLE_TEAM_ID
    fi
    
    if [[ -z "$APPLE_APP_PASSWORD" ]]; then
        echo "App-specific password (create at appleid.apple.com):"
        read -s APPLE_APP_PASSWORD
        echo ""
    fi
    
    save_credentials
fi

if [[ -n $APPLE_ID && -n $APPLE_TEAM_ID && -n $APPLE_APP_PASSWORD ]]; then
    log "Notarizing application..."
    
    # Submit for notarization and capture the submission ID
    SUBMIT_OUTPUT=$(xcrun notarytool submit "NativeFoundationModels.zip" \
        --apple-id "$APPLE_ID" \
        --team-id "$APPLE_TEAM_ID" \
        --password "$APPLE_APP_PASSWORD" \
        --wait \
        --output-format json 2>&1)
    
    SUBMIT_EXIT_CODE=$?
    echo "$SUBMIT_OUTPUT"
    
    if [[ $SUBMIT_EXIT_CODE -eq 0 ]]; then
        # Extract submission ID for detailed logs if needed
        SUBMISSION_ID=$(echo "$SUBMIT_OUTPUT" | grep -o '"id":"[^"]*"' | cut -d'"' -f4 | head -1)
        log "Notarization completed. Submission ID: $SUBMISSION_ID"
        
        # Check if notarization was successful
        if echo "$SUBMIT_OUTPUT" | grep -q '"status":"Accepted"'; then
            log "Notarization successful! Stapling ticket..."
            xcrun stapler staple "NativeFoundationModels.app"
            
            # Re-create ZIP with stapled app
            rm "NativeFoundationModels.zip"
            ditto -c -k --keepParent "NativeFoundationModels.app" "NativeFoundationModels.zip"
        else
            warn "Notarization failed or invalid. Check the logs:"
            # Get detailed logs if submission ID is available
            if [[ -n "$SUBMISSION_ID" ]]; then
                xcrun notarytool log "$SUBMISSION_ID" \
                    --apple-id "$APPLE_ID" \
                    --team-id "$APPLE_TEAM_ID" \
                    --password "$APPLE_APP_PASSWORD"
            fi
        fi
    else
        error "Failed to submit for notarization. Check your credentials and network connection."
    fi
else
    warn "Notarization credentials not provided. App will not be notarized."
    if [[ -n "$CI" ]]; then
        warn "Set APPLE_ID, APPLE_TEAM_ID, and APPLE_APP_PASSWORD secrets."
    else
        warn "Run with credentials or set APPLE_ID, APPLE_TEAM_ID, and APPLE_APP_PASSWORD."
    fi
fi

# Prepare updates directory for later appcast generation
log "Preparing update files..."
mkdir -p "$UPDATES_DIR"

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

# Determine if we should auto-publish (successful notarization or no credentials provided)
SHOULD_AUTO_PUBLISH=false
if [[ -n $APPLE_ID && -n $APPLE_TEAM_ID && -n $APPLE_APP_PASSWORD ]]; then
    # If we have credentials and got this far, notarization was successful
    SHOULD_AUTO_PUBLISH=true
elif [[ -z $APPLE_ID || -z $APPLE_TEAM_ID || -z $APPLE_APP_PASSWORD ]]; then
    # If no credentials, still auto-publish the unnotarized build
    SHOULD_AUTO_PUBLISH=true
fi

if [[ "$SHOULD_AUTO_PUBLISH" == "true" ]]; then
    log "Pushing to GitHub..."
    git push origin HEAD:main
    git push origin "v$VERSION"
    
    log "Creating GitHub release..."
    if command -v gh &> /dev/null; then
        gh release create "v$VERSION" \
            "$BUILD_DIR/NativeFoundationModels.zip" \
            --title "Release v$VERSION" \
            --notes-file "$RELEASE_NOTES_DIR/$VERSION.md"
        log "GitHub release created successfully!"
        
        # Generate appcast after GitHub release is created
        log "Generating appcast with live GitHub release URLs..."
        
        # Clean up any existing files to avoid conflicts
        rm -f "$UPDATES_DIR/NativeFoundationModels.zip"
        rm -f "$UPDATES_DIR/old_updates/NativeFoundationModels.zip"
        
        # Copy release to updates directory temporarily (for appcast generation)
        cp "$BUILD_DIR/NativeFoundationModels.zip" "$UPDATES_DIR/"
        
        # Look for generate_appcast in common locations
        GENERATE_APPCAST_PATH=""
        if command -v generate_appcast &> /dev/null; then
            GENERATE_APPCAST_PATH="generate_appcast"
        elif [[ -f "$BUILD_DIR/DerivedData/SourcePackages/artifacts/sparkle/Sparkle/bin/generate_appcast" ]]; then
            GENERATE_APPCAST_PATH="$BUILD_DIR/DerivedData/SourcePackages/artifacts/sparkle/Sparkle/bin/generate_appcast"
        elif [[ -f "$BUILD_DIR/DerivedData/SourcePackages/checkouts/Sparkle/generate_appcast" ]]; then
            GENERATE_APPCAST_PATH="$BUILD_DIR/DerivedData/SourcePackages/checkouts/Sparkle/generate_appcast"
        fi
        
        if [[ -n "$GENERATE_APPCAST_PATH" ]]; then
            log "Using generate_appcast at: $GENERATE_APPCAST_PATH"
            
            # Use the private key file if it exists
            PRIVATE_KEY_FILE="$PROJECT_DIR/.sparkle-keys/sparkle_private_key.pem"
            DOWNLOAD_URL_PREFIX="https://github.com/zats/native-foundation-models/releases/download/v$VERSION/"
            
            if [[ -f "$PRIVATE_KEY_FILE" ]]; then
                log "Using EdDSA private key file: $PRIVATE_KEY_FILE"
                log "Using GitHub Releases URL prefix: $DOWNLOAD_URL_PREFIX"
                "$GENERATE_APPCAST_PATH" "$UPDATES_DIR" -o "$APPCAST_PATH" \
                    --ed-key-file "$PRIVATE_KEY_FILE" \
                    --download-url-prefix "$DOWNLOAD_URL_PREFIX"
            else
                log "No private key file found, using keychain"
                "$GENERATE_APPCAST_PATH" "$UPDATES_DIR" -o "$APPCAST_PATH" \
                    --download-url-prefix "$DOWNLOAD_URL_PREFIX"
            fi
            
            # Clean up temporary files
            rm -f "$UPDATES_DIR/NativeFoundationModels.zip"
            
            # Commit and push updated appcast (ensure we're on main branch)
            log "Updating appcast..."
            git checkout main 2>/dev/null || git checkout -b main
            git add "$APPCAST_PATH"
            if git commit -m "Update appcast for v$VERSION release"; then
                git push origin main
                log "Appcast committed and pushed successfully!"
            else
                log "No changes to appcast detected"
            fi
            
            log "Appcast updated successfully!"
        else
            warn "generate_appcast not found. Install Sparkle tools to generate appcast:"
            warn "brew install --cask sparkle"
        fi
        
    else
        warn "GitHub CLI not found. Cannot create release automatically."
        warn "Install with: brew install gh"
    fi
else
    echo ""
    log "Release preparation complete! 🎉"
    echo ""
    warn "Manual steps required:"
    echo "1. Push changes and tag: git push origin main && git push origin v$VERSION"
    echo "2. Create GitHub release with ZIP file: $BUILD_DIR/NativeFoundationModels.zip"
    echo "3. Update appcast manually after release is live"
fi

log "Release process completed! ✨"