#!/bin/bash

echo "To get the Chrome extension ID, follow these steps:"
echo "1. Open Chrome and go to chrome://extensions/"
echo "2. Enable 'Developer mode' (toggle in top right)"
echo "3. Click 'Load unpacked' and select the chrome-extension directory:"
echo "   $(pwd)/chrome-extension"
echo "4. The extension ID will be displayed under the extension card"
echo "5. Copy the extension ID and run:"
echo "   ./update_manifest_with_id.sh <EXTENSION_ID>"
echo ""
echo "The extension should load successfully if all native messaging setup is correct."