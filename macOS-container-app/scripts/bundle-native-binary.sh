#!/bin/bash

set -e

# Only run on macOS
if [ "$PLATFORM_NAME" != "macosx" ]; then
    echo "Skipping native binary bundling for platform: $PLATFORM_NAME"
    exit 0
fi

# The native binary should already be built due to target dependency
SOURCE_BINARY="${BUILT_PRODUCTS_DIR}/NativeFoundationModelsNative"

# Copy the native binary into the app bundle
echo "Creating Resources directory..."
mkdir -p "${BUILT_PRODUCTS_DIR}/${PRODUCT_NAME}.app/Contents/Resources"

DEST_BINARY="${BUILT_PRODUCTS_DIR}/${PRODUCT_NAME}.app/Contents/Resources/nativefoundationmodels-native"

if [ -e "$SOURCE_BINARY" ]; then
    echo "Copying binary from: $SOURCE_BINARY"
    echo "To: $DEST_BINARY"
    
    # Use -L to follow symbolic links and -f to force overwrite
    cp -Lf "$SOURCE_BINARY" "$DEST_BINARY"
    
    # Ensure the binary is executable
    chmod +x "$DEST_BINARY"
    
    # Sign the binary with Hardened Runtime if we have a development team
    if [ -n "$DEVELOPMENT_TEAM" ] && [ "$CONFIGURATION" = "Release" ]; then
        echo "Signing binary with Hardened Runtime..."
        codesign --force --sign "${EXPANDED_CODE_SIGN_IDENTITY}" --options runtime --timestamp "$DEST_BINARY"
        echo "Binary signed successfully"
    fi
    
    echo "Binary copied and made executable successfully"
else
    echo "Error: Source binary not found at $SOURCE_BINARY"
    echo "Available files in BUILT_PRODUCTS_DIR:"
    ls -la "${BUILT_PRODUCTS_DIR}/" || true
    exit 1
fi