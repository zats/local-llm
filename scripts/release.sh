#!/bin/bash

set -e

# Usage: ./scripts/release.sh [VERSION] [--dry-run]
# 
# VERSION: Version number in format X.Y.Z (e.g., 1.1.0)
# --dry-run: Build and notarize the app without making any git changes

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
# LocalLLM Release Credentials
export APPLE_ID="$APPLE_ID"
export APPLE_TEAM_ID="$APPLE_TEAM_ID"
export APPLE_APP_PASSWORD="$APPLE_APP_PASSWORD"
EOF
        chmod 600 "$PROJECT_CREDS_FILE"
    fi
}

# Parse command line arguments
DRY_RUN=false
VERSION=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            if [[ -z "$VERSION" ]]; then
                VERSION=$1
            else
                error "Unknown argument: $1"
            fi
            shift
            ;;
    esac
done

# Get version from command line or prompt
if [[ -z $VERSION ]]; then
    echo "Current version: $(git describe --tags --abbrev=0 2>/dev/null || echo 'No tags yet')"
    read -p "Enter new version (e.g., 1.1.0): " VERSION
fi

# Validate version format
if [[ ! $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    error "Version must be in format X.Y.Z (e.g., 1.1.0)"
fi

if [[ "$DRY_RUN" == "true" ]]; then
    log "Starting DRY RUN release process for version $VERSION (no git operations)"
else
    log "Starting release process for version $VERSION"
fi

# Update version in Xcode project
if [[ "$DRY_RUN" == "true" ]]; then
    log "Skipping version number updates (dry run mode)"
    cd "$PROJECT_DIR/macOS-container-app"
else
    log "Updating version numbers..."
    cd "$PROJECT_DIR/macOS-container-app"
    agvtool new-marketing-version $VERSION
    agvtool next-version -all
fi

# Create build directory
log "Preparing build directory..."
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
mkdir -p "$UPDATES_DIR"

# Build and archive the application
log "Building application archive..."
ARCHIVE_PATH="$BUILD_DIR/LocalLLM.xcarchive"
xcodebuild archive \
    -project LocalLLM.xcodeproj \
    -scheme LocalLLM \
    -configuration Release \
    -archivePath "$ARCHIVE_PATH" \
    ARCHS="arm64 x86_64" \
    ONLY_ACTIVE_ARCH=NO \
    CODE_SIGN_IDENTITY="Developer ID Application: Alexander Zats (5KE88HWMKJ)" \
    CODE_SIGN_STYLE=Manual \
    DEVELOPMENT_TEAM=5KE88HWMKJ

# Check if archive was created successfully
if [[ ! -d "$ARCHIVE_PATH" ]]; then
    error "Archive creation failed."
fi

# Export the application from archive
log "Extracting application from archive..."

# The archive contains the app in Products/Applications/
ARCHIVE_APP_PATH="$ARCHIVE_PATH/Products/Applications/LocalLLM.app"
if [[ -d "$ARCHIVE_APP_PATH" ]]; then
    log "Copying app from archive..."
    cp -R "$ARCHIVE_APP_PATH" "$BUILD_DIR/LocalLLM.app"
else
    error "App not found in archive at: $ARCHIVE_APP_PATH"
fi

# Check if app was copied successfully
if [[ ! -d "$BUILD_DIR/LocalLLM.app" ]]; then
    error "App extraction failed."
fi

# Re-sign Sparkle framework components with Developer ID
log "Re-signing Sparkle framework components..."
SPARKLE_FRAMEWORK="$BUILD_DIR/LocalLLM.app/Contents/Frameworks/Sparkle.framework"

if [[ -d "$SPARKLE_FRAMEWORK" ]]; then
    # Sign all Sparkle binaries
    SPARKLE_BINARIES=(
        "Versions/B/Updater.app/Contents/MacOS/Updater"
        "Versions/B/Autoupdate"
        "Versions/B/XPCServices/Downloader.xpc/Contents/MacOS/Downloader"
        "Versions/B/XPCServices/Installer.xpc/Contents/MacOS/Installer"
    )
    
    for binary in "${SPARKLE_BINARIES[@]}"; do
        BINARY_PATH="$SPARKLE_FRAMEWORK/$binary"
        if [[ -f "$BINARY_PATH" ]]; then
            log "Signing: $binary"
            codesign --force \
                     --sign "Developer ID Application: Alexander Zats (5KE88HWMKJ)" \
                     --options runtime \
                     --timestamp \
                     "$BINARY_PATH"
        fi
    done
    
    # Sign XPC services and Updater.app bundles
    XPC_SERVICES=(
        "Versions/B/XPCServices/Downloader.xpc"
        "Versions/B/XPCServices/Installer.xpc"
        "Versions/B/Updater.app"
    )
    
    for service in "${XPC_SERVICES[@]}"; do
        SERVICE_PATH="$SPARKLE_FRAMEWORK/$service"
        if [[ -d "$SERVICE_PATH" ]]; then
            log "Signing service: $service"
            codesign --force \
                     --sign "Developer ID Application: Alexander Zats (5KE88HWMKJ)" \
                     --options runtime \
                     --timestamp \
                     "$SERVICE_PATH"
        fi
    done
    
    # Finally, sign the entire Sparkle framework
    log "Signing Sparkle framework"
    codesign --force \
             --sign "Developer ID Application: Alexander Zats (5KE88HWMKJ)" \
             --options runtime \
             --timestamp \
             "$SPARKLE_FRAMEWORK"
else
    warn "Sparkle framework not found - skipping re-signing"
fi

# The app should now be properly signed by Xcode with Developer ID certificates
log "Application exported successfully with proper code signatures"

# Verify signatures
log "Verifying code signatures..."

# Verify Safari extension signature
SAFARI_EXTENSION_PATH="$BUILD_DIR/LocalLLM.app/Contents/PlugIns/SafariExtension.appex"
if [[ -d "$SAFARI_EXTENSION_PATH" ]]; then
    if codesign --verify --strict "$SAFARI_EXTENSION_PATH"; then
        log "Safari extension signature verified"
        # Check architecture
        SAFARI_ARCH=$(lipo -info "$SAFARI_EXTENSION_PATH/Contents/MacOS/SafariExtension" 2>/dev/null | grep -o 'x86_64\|arm64' | sort -u | tr '\n' ' ')
        log "Safari extension architectures: $SAFARI_ARCH"
    else
        warn "Safari extension signature verification failed"
    fi
else
    warn "Safari extension not found at: $SAFARI_EXTENSION_PATH"
fi

# Verify main app signature
if codesign --verify --deep --strict "$BUILD_DIR/LocalLLM.app"; then
    log "Main app signature verified successfully"
    # Check architecture
    MAIN_ARCH=$(lipo -info "$BUILD_DIR/LocalLLM.app/Contents/MacOS/LocalLLM" 2>/dev/null | grep -o 'x86_64\|arm64' | sort -u | tr '\n' ' ')
    log "Main app architectures: $MAIN_ARCH"
else
    warn "Main app signature verification failed"
fi

# Notarize app (requires Apple ID credentials)
log "Creating ZIP for distribution..."
cd "$BUILD_DIR"
ditto -c -k --keepParent "LocalLLM.app" "LocalLLM.zip"

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
    SUBMIT_OUTPUT=$(xcrun notarytool submit "LocalLLM.zip" \
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
            xcrun stapler staple "LocalLLM.app"
            
            # Re-create ZIP with stapled app
            rm "LocalLLM.zip"
            ditto -c -k --keepParent "LocalLLM.app" "LocalLLM.zip"
        else
            error "Notarization failed or invalid. Check the logs:"
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
if [[ "$DRY_RUN" == "true" ]]; then
    log "Skipping release notes creation (dry run mode)"
else
    log "Creating release notes..."
    RELEASE_NOTES_DIR="$PROJECT_DIR/docs/release-notes"
    mkdir -p "$RELEASE_NOTES_DIR"

    cat > "$RELEASE_NOTES_DIR/$VERSION.md" << EOF
# What's New in v$VERSION

$(git log --pretty=format:"- %s" $(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo "HEAD~10")..HEAD | grep -E "^- (feat|fix|perf):" || echo "- General improvements and bug fixes")

## Full Changelog
$(git log --pretty=format:"- %s (%h)" $(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo "HEAD~10")..HEAD)

---
Download: [LocalLLM.zip](https://github.com/zats/local-llm/releases/download/v$VERSION/LocalLLM.zip)
EOF
fi

# Commit version changes
if [[ "$DRY_RUN" == "true" ]]; then
    log "Skipping git commit and tagging (dry run mode)"
else
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
fi

# Determine if we should auto-publish (successful notarization or no credentials provided)
SHOULD_AUTO_PUBLISH=false
if [[ "$DRY_RUN" == "true" ]]; then
    # Never auto-publish in dry run mode
    SHOULD_AUTO_PUBLISH=false
elif [[ -n $APPLE_ID && -n $APPLE_TEAM_ID && -n $APPLE_APP_PASSWORD ]]; then
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
            "$BUILD_DIR/LocalLLM.zip" \
            --title "Release v$VERSION" \
            --notes-file "$RELEASE_NOTES_DIR/$VERSION.md"
        log "GitHub release created successfully!"
        
        # Generate appcast after GitHub release is created
        log "Generating appcast with live GitHub release URLs..."
        
        # Clean up any existing files to avoid conflicts
        rm -f "$UPDATES_DIR/LocalLLM.zip"
        
        # Copy release to updates directory with version in filename (for appcast generation)
        cp "$BUILD_DIR/LocalLLM.zip" "$UPDATES_DIR/LocalLLM-$VERSION.zip"
        
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
            DOWNLOAD_URL_PREFIX="https://github.com/zats/local-llm/releases/download/v$VERSION/"
            
            # Debug: show what files are in the updates directory
            log "Files in updates directory:"
            ls -la "$UPDATES_DIR/"
            
            # Try to find any existing private key files
            if [[ ! -f "$PRIVATE_KEY_FILE" ]]; then
                # Look for alternative key locations
                POSSIBLE_KEY=$(find "$PROJECT_DIR" -name "*private*.pem" -o -name "*sparkle*.pem" 2>/dev/null | head -1)
                if [[ -n "$POSSIBLE_KEY" ]]; then
                    PRIVATE_KEY_FILE="$POSSIBLE_KEY"
                    log "Found alternative private key: $PRIVATE_KEY_FILE"
                fi
            else
                log "Using existing private key: $PRIVATE_KEY_FILE"            
            fi
            
            if [[ -f "$PRIVATE_KEY_FILE" ]]; then
                log "Using EdDSA private key file: $PRIVATE_KEY_FILE"
                log "Using GitHub Releases URL prefix: $DOWNLOAD_URL_PREFIX"
                "$GENERATE_APPCAST_PATH" "$UPDATES_DIR" -o "$APPCAST_PATH" \
                    --ed-key-file "$PRIVATE_KEY_FILE" \
                    --download-url-prefix "$DOWNLOAD_URL_PREFIX" \
                    --maximum-versions 10 \
                    --verbose
            else
                warn "No EdDSA private key found. Manually updating appcast..."
                log "Adding new version $VERSION to appcast..."
                
                # Get file size of the ZIP
                ZIP_SIZE=$(stat -f%z "$BUILD_DIR/LocalLLM.zip")
                
                # Get current build number from Xcode project
                BUILD_NUMBER=$(agvtool what-version -terse || echo "1")
                
                # Create the new entry
                NEW_ITEM="        <item>
            <title>$VERSION</title>
            <pubDate>$(date -R)</pubDate>
            <sparkle:version>$BUILD_NUMBER</sparkle:version>
            <sparkle:shortVersionString>$VERSION</sparkle:shortVersionString>
            <sparkle:minimumSystemVersion>26.0</sparkle:minimumSystemVersion>
            <enclosure url=\"$DOWNLOAD_URL_PREFIX/LocalLLM.zip\" length=\"$ZIP_SIZE\" type=\"application/octet-stream\"/>
        </item>"
                
                # Show what the new entry will look like
                echo ""
                log "New appcast entry to be added:"
                echo "$NEW_ITEM"
                echo ""
                warn "⚠️  UNSIGNED ENTRY: This appcast entry lacks sparkle:edSignature attribute!"
                warn "   Without EdDSA signature, Sparkle will not verify this update's authenticity."
                warn "   Users may see security warnings or updates may be rejected."
                warn "   Consider adding a proper EdDSA private key to sign the appcast."
                echo ""
                
                # Use awk to insert after the title line
                awk -v new_item="$NEW_ITEM" '
                    /<title>LocalLLM<\/title>/ {
                        print $0
                        print new_item
                        next
                    }
                    { print }
                ' "$APPCAST_PATH" > "$APPCAST_PATH.tmp" && mv "$APPCAST_PATH.tmp" "$APPCAST_PATH"
                
                log "Appcast updated manually (unsigned entry)"
            fi
            
            # Check if appcast was actually updated
            if git diff --quiet docs/appcast.xml; then
                warn "Appcast was not updated by generate_appcast"
            else
                log "Appcast was successfully updated"
            fi
            
            # Clean up temporary files
            rm -f "$UPDATES_DIR/LocalLLM-$VERSION.zip"
            
            # Commit and push updated appcast
            log "Updating appcast..."
            cd "$PROJECT_DIR"
            
            # Check if appcast was actually modified
            if git diff --quiet docs/appcast.xml; then
                log "No changes to appcast detected - file was not modified"
            else
                log "Appcast changes detected, committing..."
                
                # CRITICAL: Ensure no ZIP files are staged for commit
                git reset HEAD -- "*.zip" 2>/dev/null || true
                git reset HEAD -- "*/*.zip" 2>/dev/null || true
                git reset HEAD -- "docs/updates/*.zip" 2>/dev/null || true
                
                # Only add the appcast file
                git add docs/appcast.xml
                
                # Double-check what we're about to commit
                log "Files staged for commit:"
                git diff --cached --name-only
                
                # Verify no ZIP files are staged
                if git diff --cached --name-only | grep -q "\.zip$"; then
                    error "ZIP files detected in staged changes! Aborting commit."
                fi
                
                # Verify we actually have changes to commit
                if git diff --cached --quiet; then
                    log "No staged changes for appcast"
                else
                    git commit -m "Update appcast for v$VERSION release"
                    git push origin main
                    log "Appcast committed and pushed successfully!"
                fi
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
    if [[ "$DRY_RUN" == "true" ]]; then
        log "Dry run completed! 🎉"
        echo ""
        log "Build artifacts available at: $BUILD_DIR/LocalLLM.zip"
        warn "No git operations were performed (dry run mode)"
        echo "To create actual release, run: ./scripts/release.sh $VERSION"
    else
        log "Release preparation complete! 🎉"
        echo ""
        warn "Manual steps required:"
        echo "1. Push changes and tag: git push origin main && git push origin v$VERSION"
        echo "2. Create GitHub release with ZIP file: $BUILD_DIR/LocalLLM.zip"
        echo "3. Update appcast manually after release is live"
    fi
fi

log "Release process completed! ✨"