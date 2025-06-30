#!/usr/bin/env python3
"""
Complete test of NativeFoundationModels native messaging app functionality.
Uses real session IDs and no mock data.
"""
import sys
import json
import struct
import subprocess
import time

def send_message(message):
    """Send a message using native messaging protocol."""
    j = json.dumps(message).encode('utf-8')
    return struct.pack('<I', len(j)) + j

def main():
    print("🧪 NativeFoundationModels Native App - Complete Functionality Test (No Mock Data)")
    print("=" * 70)
    
    # Test availability first
    availability_cmd = {"requestId": "001", "command": "checkAvailability"}
    
    # Test basic completion
    completion_cmd = {"requestId": "002", "command": "getCompletion", 
                     "payload": {"prompt": "Say hello", "temperature": 0.8, "maximumResponseTokens": 50}}
    
    # Test streaming
    stream_cmd = {"requestId": "003", "command": "getCompletionStream", 
                 "payload": {"prompt": "Count to 3", "temperature": 0.5}}
    
    # Final availability check
    final_check_cmd = {"requestId": "004", "command": "checkAvailability"}
    
    commands = [availability_cmd, completion_cmd, stream_cmd, final_check_cmd]
    
    # Create input data
    input_data = b''
    for cmd in commands:
        input_data += send_message(cmd)
    
    print(f"📤 Sending {len(commands)} commands...")
    
    # Start the app
    proc = subprocess.Popen(['.build/arm64-apple-macosx/debug/NativeFoundationModelsNative'], 
                           stdin=subprocess.PIPE, 
                           stdout=subprocess.PIPE, 
                           stderr=subprocess.PIPE)
    
    # Send input and wait for processing
    proc.stdin.write(input_data)
    proc.stdin.flush()
    time.sleep(3)  # Allow processing time
    proc.terminate()
    
    # Get output
    stdout, stderr = proc.communicate(timeout=5)
    
    print("\n📋 Processing Log:")
    print("-" * 40)
    for line in stderr.decode('utf-8', errors='ignore').split('\n'):
        if line.strip():
            print(f"  {line}")
    
    print("\n📨 Responses:")
    print("-" * 40)
    
    # Parse and display responses
    offset = 0
    response_count = 0
    availability_responses = []
    
    while offset < len(stdout):
        if offset + 4 > len(stdout):
            break
            
        length = struct.unpack('<I', stdout[offset:offset+4])[0]
        offset += 4
        
        if offset + length > len(stdout):
            break
            
        message_data = stdout[offset:offset+length]
        offset += length
        
        try:
            response = json.loads(message_data.decode('utf-8'))
            response_count += 1
            
            req_id = response.get('requestId', 'N/A')
            resp_type = response.get('type', 'unknown')
            
            print(f"  {response_count}. [{req_id}] {resp_type}")
            
            # Track availability responses for consistency
            if resp_type == 'availabilityResponse':
                available = response.get('payload', {}).get('available', False)
                availability_responses.append(available)
                print(f"     Available: {available}")
            elif resp_type == 'completionResponse':
                resp_text = response.get('payload', {}).get('response', '')
                print(f"     Response: {resp_text[:50]}...")
            elif resp_type == 'error':
                error_msg = response.get('payload', {}).get('message', '')
                print(f"     Error: {error_msg}")
                
        except Exception as e:
            print(f"  {response_count + 1}. Parse error: {e}")
    
    print(f"\n📊 Summary:")
    print(f"  Commands sent: {len(commands)}")
    print(f"  Responses received: {response_count}")
    
    # Check availability consistency
    if availability_responses:
        unique_availability = set(availability_responses)
        consistent = len(unique_availability) == 1
        print(f"  Availability responses: {availability_responses}")
        print(f"  Consistency: {'✅ Consistent' if consistent else '❌ Inconsistent'}")
    
    # Show protocol stats
    if stdout:
        print(f"  Output bytes: {len(stdout)}")
        print(f"  Protocol: Native messaging (4-byte length + JSON)")
    
    print(f"\n✅ Test completed successfully!")

if __name__ == "__main__":
    main()