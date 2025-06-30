#!/usr/bin/env python3
"""
Consistency test to verify that the installed binary (/Users/zats/bin/chromellm-native)
reports the same availability as the freshly built version.
"""
import sys
import json
import struct
import subprocess
import time
from pathlib import Path

def send_message(message):
    """Send a message using native messaging protocol."""
    j = json.dumps(message).encode('utf-8')
    return struct.pack('<I', len(j)) + j

def test_binary_availability(binary_path):
    """Test availability using a specific binary."""
    if not Path(binary_path).exists():
        return None, f"Binary not found: {binary_path}"
    
    # Test availability
    cmd = {"requestId": "test", "command": "checkAvailability"}
    input_data = send_message(cmd)
    
    try:
        proc = subprocess.Popen(
            [binary_path],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        proc.stdin.write(input_data)
        proc.stdin.flush()
        time.sleep(1)
        proc.terminate()
        
        stdout, stderr = proc.communicate(timeout=3)
        
        # Parse response
        if len(stdout) >= 4:
            length = struct.unpack('<I', stdout[0:4])[0]
            if len(stdout) >= 4 + length:
                message_data = stdout[4:4+length]
                response = json.loads(message_data.decode('utf-8'))
                
                if response.get('type') == 'availabilityResponse':
                    available = response.get('payload', {}).get('available', False)
                    return available, None
        
        return None, "No valid response received"
        
    except Exception as e:
        return None, f"Error: {e}"

def main():
    print("🔍 ChromeLLM Binary Consistency Test")
    print("=" * 45)
    
    # Test binaries
    binaries = [
        ("/Users/zats/bin/chromellm-native", "Installed binary"),
        (".build/arm64-apple-macosx/debug/ChromeLLMNative", "Fresh build")
    ]
    
    results = []
    
    for binary_path, description in binaries:
        print(f"\n📋 Testing {description}:")
        print(f"   Path: {binary_path}")
        
        available, error = test_binary_availability(binary_path)
        
        if error:
            print(f"   ❌ {error}")
            results.append((description, None, error))
        else:
            print(f"   ✅ Available: {available}")
            results.append((description, available, None))
    
    # Check consistency
    print(f"\n" + "=" * 45)
    print("📊 CONSISTENCY CHECK")
    print("=" * 45)
    
    available_values = [r[1] for r in results if r[1] is not None]
    
    if len(available_values) < 2:
        print("❌ Cannot compare - not enough valid results")
        return False
    
    consistent = len(set(available_values)) == 1
    
    print(f"Installed binary: {results[0][1] if results[0][1] is not None else 'ERROR'}")
    print(f"Fresh build:      {results[1][1] if results[1][1] is not None else 'ERROR'}")
    print(f"Consistent:       {'✅ YES' if consistent else '❌ NO'}")
    
    if not consistent:
        print("\n⚠️  WARNING: Binaries report different availability!")
        print("   This suggests version mismatch or configuration differences.")
        print("   Consider rebuilding and reinstalling the binary:")
        print("   1. cd native-app && swift build")
        print("   2. cp .build/arm64-apple-macosx/debug/ChromeLLMNative /Users/zats/bin/chromellm-native")
    
    return consistent

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)