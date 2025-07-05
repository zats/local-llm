#!/bin/bash

set -e

echo "🚀 LocalLLM Extension Setup"
echo "============================"

# Check if Swift is available
if ! command -v swift &> /dev/null; then
    echo "❌ Swift is not installed. Please install Xcode Command Line Tools."
    exit 1
fi

# Build the native app
echo "📦 Building native messaging app..."
cd native-app
swift build -c release
cd ..

# Install the native app binary
echo "📋 Installing native app binary..."
mkdir -p ~/bin
rm -f ~/bin/nativefoundationmodels-native
cp native-app/.build/release/NativeFoundationModelsNative ~/bin/nativefoundationmodels-native
chmod +x ~/bin/nativefoundationmodels-native

# Install the native messaging host manifest
echo "📄 Installing native messaging manifest..."
mkdir -p ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts
cp -f native-app/com.nativefoundationmodels.native.json ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/

echo "✅ Setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Open Chrome and go to chrome://extensions/"
echo "2. Enable 'Developer mode' (toggle in top right)"
echo "3. Click 'Load unpacked' and select: $(pwd)/chrome-extension"
echo "4. Copy the Extension ID from the extension card"
echo "5. Run: ./update_manifest_with_id.sh <EXTENSION_ID>"
echo "6. Test the extension by opening: file://$(pwd)/test_extension.html"
echo ""
echo "🧪 You can also test the native messaging directly with:"
echo "   python3 test_native_messaging.py"