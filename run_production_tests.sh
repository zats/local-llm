#!/bin/bash

# NativeFoundationModels Production Test Runner
# Builds the native app and runs comprehensive tests

set -e

echo "🧪 NativeFoundationModels Production Test Suite"
echo "=================================="

# Change to native-app directory
cd "$(dirname "$0")/native-app"

# Check if we have Swift
if ! command -v swift &> /dev/null; then
    echo "❌ Swift not found. Please install Xcode or Swift toolchain."
    exit 1
fi

# Check if we're on macOS
if [[ "$(uname)" != "Darwin" ]]; then
    echo "❌ This test suite requires macOS"
    exit 1
fi

# Clean any existing build
echo "🧹 Cleaning previous builds..."
rm -rf .build

# Run the production tests
echo "🚀 Running production tests..."
python3 test_production.py

echo ""
echo "✅ Production test suite completed!"
echo ""
echo "💡 To run individual tests:"
echo "   cd native-app && python3 test_complete.py     # Complete functionality test (no mock data)"
echo "   cd native-app && python3 test_production.py   # Full production suite"
echo "   cd native-app && python3 test_consistency.py  # Binary consistency check"