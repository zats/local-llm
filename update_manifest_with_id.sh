#!/bin/bash

if [ $# -eq 0 ]; then
    echo "Usage: $0 <EXTENSION_ID>"
    echo "Example: $0 abcdefghijklmnopqrstuvwxyz123456"
    exit 1
fi

EXTENSION_ID=$1
MANIFEST_PATH="native-app/com.chromellm.native.json"
MANIFEST_PATH_INSTALLED="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.chromellm.native.json"

echo "Updating native messaging manifest with extension ID: $EXTENSION_ID"

# Update the source manifest
sed -i '' "s/YOUR_EXTENSION_ID_HERE/$EXTENSION_ID/g" "$MANIFEST_PATH"

# Update the installed manifest
sed -i '' "s/YOUR_EXTENSION_ID_HERE/$EXTENSION_ID/g" "$MANIFEST_PATH_INSTALLED"

echo "✅ Updated manifests with extension ID: $EXTENSION_ID"
echo "Manifest locations:"
echo "  - Source: $MANIFEST_PATH"
echo "  - Installed: $MANIFEST_PATH_INSTALLED"
echo ""
echo "You can now test the extension by:"
echo "1. Opening the extension popup (click the extension icon)"
echo "2. Visiting the sample website at sample-website/index.html"
echo "3. Using the browser console to test the chromeNativeLLM API"