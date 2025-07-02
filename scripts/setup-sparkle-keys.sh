#!/bin/bash

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KEYS_DIR="$PROJECT_DIR/.sparkle-keys"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

function log() {
    echo -e "${GREEN}[SPARKLE-SETUP]${NC} $1"
}

function warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

function error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

log "Setting up Sparkle signing keys..."

# Create keys directory
mkdir -p "$KEYS_DIR"

# Check if Sparkle tools are available
SPARKLE_TOOLS_PATH=""
if command -v generate_keys &> /dev/null; then
    SPARKLE_TOOLS_PATH="generate_keys"
elif [[ -f "$PROJECT_DIR/bin/generate_keys" ]]; then
    SPARKLE_TOOLS_PATH="$PROJECT_DIR/bin/generate_keys"
elif [[ -f "$PROJECT_DIR/Sparkle/bin/generate_keys" ]]; then
    SPARKLE_TOOLS_PATH="$PROJECT_DIR/Sparkle/bin/generate_keys"
else
    log "Downloading Sparkle tools..."
    cd "$PROJECT_DIR"
    curl -L https://github.com/sparkle-project/Sparkle/releases/download/2.7.1/Sparkle-2.7.1.tar.xz | tar xJ
    SPARKLE_TOOLS_PATH="$PROJECT_DIR/bin/generate_keys"
fi

# Generate keys if they don't exist
if [[ ! -f "$KEYS_DIR/sparkle_private_key.pem" ]] || [[ ! -f "$KEYS_DIR/sparkle_public_key.pem" ]]; then
    log "Generating new EdDSA key pair..."
    
    # Generate keys and store in Keychain
    "$SPARKLE_TOOLS_PATH" --account "native-foundation-models" > "$KEYS_DIR/sparkle_public_key_info.txt"
    
    # Extract just the public key part
    grep -A 20 "Public key:" "$KEYS_DIR/sparkle_public_key_info.txt" | sed -n '/^[A-Za-z0-9+/=]*$/p' | head -1 > "$KEYS_DIR/sparkle_public_key.pem"
    
    # Export private key to file for CI/CD
    "$SPARKLE_TOOLS_PATH" --account "native-foundation-models" -x "$KEYS_DIR/sparkle_private_key.pem"
    
    # Set secure permissions
    chmod 600 "$KEYS_DIR/sparkle_private_key.pem"
    chmod 644 "$KEYS_DIR/sparkle_public_key.pem"
    chmod 644 "$KEYS_DIR/sparkle_public_key_info.txt"
    
    log "Keys generated successfully!"
else
    log "Keys already exist, skipping generation."
fi

# Read public key for Info.plist
if [[ -f "$KEYS_DIR/sparkle_public_key.pem" ]]; then
    PUBLIC_KEY=$(cat "$KEYS_DIR/sparkle_public_key.pem")
else
    # Fallback: extract from keychain info
    PUBLIC_KEY=$(grep -A 20 "Public key:" "$KEYS_DIR/sparkle_public_key_info.txt" | sed -n '/^[A-Za-z0-9+/=]*$/p' | head -1)
fi

log "Public key (add to Info.plist):"
echo "$PUBLIC_KEY"

# Create a convenience script for signing
cat > "$KEYS_DIR/sign_update.sh" << 'EOF'
#!/bin/bash
# Usage: ./sign_update.sh path/to/update.zip

if [[ -z $1 ]]; then
    echo "Usage: $0 <path-to-update-file>"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRIVATE_KEY="$SCRIPT_DIR/sparkle_private_key.pem"

if [[ ! -f "$PRIVATE_KEY" ]]; then
    echo "Error: Private key not found at $PRIVATE_KEY"
    exit 1
fi

# Find sign_update tool
SIGN_UPDATE=""
if command -v sign_update &> /dev/null; then
    SIGN_UPDATE="sign_update"
elif [[ -f "$(dirname "$SCRIPT_DIR")/bin/sign_update" ]]; then
    SIGN_UPDATE="$(dirname "$SCRIPT_DIR")/bin/sign_update"
elif [[ -f "$(dirname "$SCRIPT_DIR")/Sparkle/bin/sign_update" ]]; then
    SIGN_UPDATE="$(dirname "$SCRIPT_DIR")/Sparkle/bin/sign_update"
else
    echo "Error: sign_update tool not found"
    exit 1
fi

echo "Signing $1..."
"$SIGN_UPDATE" "$1" -s "$PRIVATE_KEY"
EOF

chmod +x "$KEYS_DIR/sign_update.sh"

# Add to gitignore
echo "" >> "$PROJECT_DIR/.gitignore"
echo "# Sparkle signing keys (keep these secret!)" >> "$PROJECT_DIR/.gitignore"
echo ".sparkle-keys/" >> "$PROJECT_DIR/.gitignore"
echo "Sparkle/" >> "$PROJECT_DIR/.gitignore"

warn "IMPORTANT: Keep your private key secure!"
warn "- Private key: $KEYS_DIR/sparkle_private_key.pem"
warn "- This key is needed to sign updates"
warn "- Never commit it to git (added to .gitignore)"
warn ""
warn "Next steps:"
warn "1. Add the public key to your app's Info.plist"
warn "2. Update SUFeedURL in Info.plist"
warn "3. Initialize Sparkle in your app"

log "Setup complete! 🎉"