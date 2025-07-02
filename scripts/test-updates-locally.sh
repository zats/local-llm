#!/bin/bash

set -e

# Local Sparkle Testing Script
# This script helps test Sparkle updates locally without needing to push to GitHub

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCAL_UPDATES_DIR="$PROJECT_DIR/local-testing/updates"
LOCAL_APPCAST="$PROJECT_DIR/local-testing/appcast.xml"
LOCAL_SERVER_PORT=8080

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

function log() {
    echo -e "${GREEN}[TESTING]${NC} $1"
}

function warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

function info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

function error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

function show_help() {
    echo "Local Sparkle Testing Script"
    echo ""
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  setup     - Set up local testing environment"
    echo "  build     - Build a test version with incremented version"
    echo "  serve     - Start local HTTP server for testing"
    echo "  test      - Run full test cycle (build + serve)"
    echo "  clean     - Clean up test files"
    echo ""
    echo "Options:"
    echo "  --version VERSION  - Specify version for build (e.g., 1.0.1)"
    echo "  --port PORT        - HTTP server port (default: 8080)"
    echo ""
    echo "Examples:"
    echo "  $0 setup"
    echo "  $0 build --version 1.0.1"
    echo "  $0 test --version 1.0.1"
    echo "  $0 serve --port 9000"
}

function setup_local_testing() {
    log "Setting up local testing environment..."
    
    # Create testing directory structure
    mkdir -p "$LOCAL_UPDATES_DIR"
    mkdir -p "$PROJECT_DIR/local-testing/release-notes"
    
    # Create test Info.plist that points to local server
    cat > "$PROJECT_DIR/local-testing/Info-test.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>SUFeedURL</key>
    <string>http://localhost:$LOCAL_SERVER_PORT/appcast.xml</string>
    <key>SUPublicEDKey</key>
    <string>$(cat "$PROJECT_DIR/.sparkle-keys/sparkle_public_key.pem")</string>
    <key>SUEnableAutomaticChecks</key>
    <true/>
    <key>SUAutomaticallyUpdate</key>
    <false/>
    <key>SUScheduledCheckInterval</key>
    <integer>60</integer>
    <key>SUEnableSystemProfiling</key>
    <false/>
</dict>
</plist>
EOF
    
    # Create test HTML page for serving
    cat > "$PROJECT_DIR/local-testing/index.html" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Local Sparkle Testing Server</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 40px; }
        .status { padding: 10px; margin: 10px 0; border-radius: 5px; }
        .success { background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
        .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; color: #856404; }
        .error { background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
        pre { background: #f8f9fa; padding: 15px; border-radius: 5px; overflow: auto; }
    </style>
</head>
<body>
    <h1>🧪 Local Sparkle Testing Server</h1>
    <p>This server is running to test Sparkle updates locally.</p>
    
    <div class="status success">
        ✅ Server is running and serving appcast.xml
    </div>
    
    <h2>Available Files:</h2>
    <ul>
        <li><a href="/appcast.xml">appcast.xml</a> - Update feed</li>
        <li><a href="/updates/">updates/</a> - Application updates</li>
    </ul>
    
    <h2>Testing Instructions:</h2>
    <ol>
        <li>Build your app with the test Info.plist (points to localhost)</li>
        <li>Install the old version</li>
        <li>Use the test script to build a newer version</li>
        <li>Check for updates in the app</li>
    </ol>
    
    <div class="status warning">
        ⚠️ Remember to revert to production Info.plist before releasing!
    </div>
</body>
</html>
EOF

    info "Local testing environment set up!"
    info "Test Info.plist: $PROJECT_DIR/local-testing/Info-test.plist"
    info "Local updates dir: $LOCAL_UPDATES_DIR"
}

function get_current_version() {
    cd "$PROJECT_DIR/macOS-container-app"
    local current_version=$(agvtool vers -terse 2>/dev/null || echo "1.0.0")
    echo "$current_version"
}

function get_next_version() {
    local current=$(get_current_version)
    local major=$(echo $current | cut -d. -f1)
    local minor=$(echo $current | cut -d. -f2)
    local patch=$(echo $current | cut -d. -f3)
    
    # Increment patch version
    patch=$((patch + 1))
    echo "$major.$minor.$patch"
}

function build_test_version() {
    local version=${1:-$(get_next_version)}
    
    log "Building test version $version..."
    
    cd "$PROJECT_DIR/macOS-container-app"
    
    # Update version numbers
    agvtool new-marketing-version "$version"
    agvtool next-version -all
    
    # Build the app
    log "Building application..."
    xcodebuild -project NativeFoundationModels.xcodeproj \
        -scheme NativeFoundationModels \
        -configuration Release \
        -archivePath "$PROJECT_DIR/local-testing/NativeFoundationModels.xcarchive" \
        archive
    
    # Export app
    log "Exporting application..."
    xcodebuild -exportArchive \
        -archivePath "$PROJECT_DIR/local-testing/NativeFoundationModels.xcarchive" \
        -exportPath "$PROJECT_DIR/local-testing" \
        -exportOptionsPlist ExportOptions.plist
    
    # Create ZIP for distribution
    cd "$PROJECT_DIR/local-testing"
    if [[ -f "NativeFoundationModels.zip" ]]; then
        rm "NativeFoundationModels.zip"
    fi
    
    ditto -c -k --keepParent "NativeFoundationModels.app" "NativeFoundationModels.zip"
    
    # Copy to updates directory
    cp "NativeFoundationModels.zip" "$LOCAL_UPDATES_DIR/NativeFoundationModels-$version.zip"
    
    # Sign the update
    log "Signing update..."
    "$PROJECT_DIR/.sparkle-keys/sign_update.sh" "$LOCAL_UPDATES_DIR/NativeFoundationModels-$version.zip"
    
    # Get file size and signature
    local file_size=$(stat -f%z "$LOCAL_UPDATES_DIR/NativeFoundationModels-$version.zip")
    local signature_file="$LOCAL_UPDATES_DIR/NativeFoundationModels-$version.zip.ed25519"
    local signature=""
    if [[ -f "$signature_file" ]]; then
        signature=$(cat "$signature_file")
    fi
    
    # Create release notes
    cat > "$PROJECT_DIR/local-testing/release-notes/$version.html" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>What's New in v$version</title>
    <style>body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 20px; }</style>
</head>
<body>
    <h2>🧪 Test Release v$version</h2>
    <ul>
        <li>This is a test build for local Sparkle testing</li>
        <li>Version: $version</li>
        <li>Built: $(date)</li>
        <li>Test all update functionality before production release</li>
    </ul>
</body>
</html>
EOF
    
    # Generate appcast
    log "Generating local appcast..."
    generate_local_appcast "$version" "$file_size" "$signature"
    
    log "Test version $version built successfully!"
    info "App: $PROJECT_DIR/local-testing/NativeFoundationModels.app"
    info "ZIP: $LOCAL_UPDATES_DIR/NativeFoundationModels-$version.zip"
    info "Size: $file_size bytes"
    info "Signature: ${signature:-'Not signed'}"
}

function generate_local_appcast() {
    local version="$1"
    local file_size="$2"
    local signature="$3"
    local pub_date=$(date -u "+%a, %d %b %Y %H:%M:%S %z")
    
    cat > "$LOCAL_APPCAST" << EOF
<?xml version="1.0" encoding="utf-8"?>
<rss xmlns:sparkle="http://www.andymatuschak.org/xml-namespaces/sparkle" version="2.0">
  <channel>
    <title>NativeFoundationModels Updates (Local Testing)</title>
    <description>Local test updates for NativeFoundationModels</description>
    <language>en</language>
    <link>http://localhost:$LOCAL_SERVER_PORT/</link>
    
    <item>
      <title>Version $version (Test)</title>
      <pubDate>$pub_date</pubDate>
      <sparkle:version>$version</sparkle:version>
      <sparkle:shortVersionString>$version</sparkle:shortVersionString>
      <sparkle:minimumSystemVersion>14.0</sparkle:minimumSystemVersion>
      <enclosure url="http://localhost:$LOCAL_SERVER_PORT/updates/NativeFoundationModels-$version.zip"
                 sparkle:edSignature="$signature"
                 length="$file_size"
                 type="application/octet-stream"/>
      <sparkle:releaseNotesLink>
        http://localhost:$LOCAL_SERVER_PORT/release-notes/$version.html
      </sparkle:releaseNotesLink>
      <description><![CDATA[
        <h2>🧪 Test Release v$version</h2>
        <p>This is a test build for local Sparkle testing.</p>
        <ul>
          <li>Version: $version</li>
          <li>Built: $(date)</li>
          <li>Test all update functionality before production release</li>
        </ul>
      ]]></description>
    </item>
    
  </channel>
</rss>
EOF
}

function serve_local_updates() {
    local port=${1:-$LOCAL_SERVER_PORT}
    
    log "Starting local HTTP server on port $port..."
    
    cd "$PROJECT_DIR/local-testing"
    
    # Check if port is available
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        warn "Port $port is already in use. Trying to stop existing server..."
        pkill -f "python.*$port" || true
        sleep 2
    fi
    
    # Start Python HTTP server
    info "Serving files from: $PROJECT_DIR/local-testing"
    info "Appcast URL: http://localhost:$port/appcast.xml"
    info "Press Ctrl+C to stop the server"
    
    python3 -m http.server $port
}

function run_test_cycle() {
    local version=${1:-$(get_next_version)}
    local port=${2:-$LOCAL_SERVER_PORT}
    
    log "Running full test cycle for version $version..."
    
    setup_local_testing
    build_test_version "$version"
    
    log "Test build complete! Now serving updates..."
    warn "To test updates:"
    warn "1. Install the current app version"
    warn "2. In another terminal, run: open '$PROJECT_DIR/local-testing/NativeFoundationModels.app'"
    warn "3. Check for updates in the app menu"
    warn "4. The app should detect and offer the update"
    
    serve_local_updates "$port"
}

function clean_test_files() {
    log "Cleaning up test files..."
    
    rm -rf "$PROJECT_DIR/local-testing"
    
    # Reset version if it was changed
    cd "$PROJECT_DIR/macOS-container-app"
    git checkout -- . 2>/dev/null || true
    
    log "Test files cleaned up!"
}

# Parse command line arguments
COMMAND=""
VERSION=""
PORT=$LOCAL_SERVER_PORT

while [[ $# -gt 0 ]]; do
    case $1 in
        setup|build|serve|test|clean)
            COMMAND="$1"
            shift
            ;;
        --version)
            VERSION="$2"
            shift 2
            ;;
        --port)
            PORT="$2"
            LOCAL_SERVER_PORT="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

# Execute command
case $COMMAND in
    setup)
        setup_local_testing
        ;;
    build)
        build_test_version "$VERSION"
        ;;
    serve)
        serve_local_updates "$PORT"
        ;;
    test)
        run_test_cycle "$VERSION" "$PORT"
        ;;
    clean)
        clean_test_files
        ;;
    "")
        show_help
        ;;
    *)
        error "Invalid command: $COMMAND"
        ;;
esac