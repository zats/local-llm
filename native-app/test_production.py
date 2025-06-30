#!/usr/bin/env python3
"""
Production-like test suite for ChromeLLM native messaging app.
Builds the binary and runs comprehensive tests using proper native messaging protocol.
"""
import sys
import json
import struct
import subprocess
import time
import os
import tempfile
from pathlib import Path

class ChromeLLMTester:
    def __init__(self, build_dir=None):
        self.build_dir = build_dir or ".build/arm64-apple-macosx/debug"
        self.binary_path = f"{self.build_dir}/ChromeLLMNative"
        self.test_results = []
        
    def build_binary(self):
        """Build the native app binary using Swift Package Manager."""
        print("🔨 Building ChromeLLM native app...")
        
        try:
            result = subprocess.run(
                ["swift", "build", "--configuration", "debug"],
                capture_output=True,
                text=True,
                timeout=60
            )
            
            if result.returncode != 0:
                print(f"❌ Build failed:")
                print(result.stderr)
                return False
                
            if not Path(self.binary_path).exists():
                print(f"❌ Binary not found at {self.binary_path}")
                return False
                
            print(f"✅ Build successful: {self.binary_path}")
            return True
            
        except subprocess.TimeoutExpired:
            print("❌ Build timed out")
            return False
        except Exception as e:
            print(f"❌ Build error: {e}")
            return False
    
    def send_message(self, message):
        """Send a message using native messaging protocol (4-byte length + JSON)."""
        j = json.dumps(message).encode('utf-8')
        return struct.pack('<I', len(j)) + j
    
    def parse_responses(self, stdout_data):
        """Parse native messaging protocol responses."""
        responses = []
        offset = 0
        
        while offset < len(stdout_data):
            if offset + 4 > len(stdout_data):
                break
                
            try:
                length = struct.unpack('<I', stdout_data[offset:offset+4])[0]
                offset += 4
                
                if offset + length > len(stdout_data):
                    break
                    
                message_data = stdout_data[offset:offset+length]
                offset += length
                
                response = json.loads(message_data.decode('utf-8'))
                responses.append(response)
                
            except (struct.error, json.JSONDecodeError, UnicodeDecodeError) as e:
                print(f"⚠️ Parse error at offset {offset}: {e}")
                break
                
        return responses
    
    def run_test_scenario(self, name, commands, timeout=5):
        """Run a test scenario with the given commands."""
        print(f"\n📋 Running test: {name}")
        print("-" * 50)
        
        
        # Prepare input data
        input_data = b''
        for cmd in commands:
            input_data += self.send_message(cmd)
        
        print(f"📤 Sending {len(commands)} commands...")
        
        try:
            # Start the app
            proc = subprocess.Popen(
                [self.binary_path],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            
            # Send input and wait
            proc.stdin.write(input_data)
            proc.stdin.flush()
            time.sleep(2)  # Allow processing time
            proc.terminate()
            
            # Get output
            stdout, stderr = proc.communicate(timeout=timeout)
            
            # Parse responses
            responses = self.parse_responses(stdout)
            
            # Log stderr for debugging
            if stderr:
                print("📋 Debug log:")
                for line in stderr.decode('utf-8', errors='ignore').split('\n'):
                    if line.strip():
                        print(f"  {line}")
            
            # Analyze responses
            test_result = self.analyze_responses(name, commands, responses)
            self.test_results.append(test_result)
            
            return test_result
            
        except subprocess.TimeoutExpired:
            print(f"❌ Test '{name}' timed out")
            return {"name": name, "status": "timeout", "responses": []}
        except Exception as e:
            print(f"❌ Test '{name}' failed: {e}")
            return {"name": name, "status": "error", "error": str(e), "responses": []}
    
    def analyze_responses(self, test_name, commands, responses):
        """Analyze test responses for consistency and correctness."""
        print(f"\n📨 Responses ({len(responses)} received):")
        
        availability_responses = []
        errors = []
        successes = []
        
        for i, response in enumerate(responses):
            req_id = response.get('requestId', 'N/A')
            resp_type = response.get('type', 'unknown')
            
            print(f"  {i+1}. [{req_id}] {resp_type}")
            
            if resp_type == 'availabilityResponse':
                available = response.get('payload', {}).get('available', False)
                availability_responses.append(available)
                print(f"     Available: {available}")
                
            elif resp_type == 'error':
                error_msg = response.get('payload', {}).get('message', '')
                errors.append(error_msg)
                print(f"     Error: {error_msg}")
                
            elif resp_type in ['completionResponse', 'playgroundSessionStarted', 'sessionEnded']:
                successes.append(resp_type)
                if resp_type == 'completionResponse':
                    resp_text = response.get('payload', {}).get('response', '')
                    print(f"     Response: {resp_text[:50]}...")
        
        # Check for consistency
        availability_consistent = len(set(availability_responses)) <= 1 if availability_responses else True
        
        result = {
            "name": test_name,
            "status": "success" if not errors else "partial",
            "commands_sent": len(commands),
            "responses_received": len(responses),
            "availability_responses": availability_responses,
            "availability_consistent": availability_consistent,
            "errors": errors,
            "successes": successes
        }
        
        if availability_responses:
            print(f"🔍 Availability consistency: {'✅ Consistent' if availability_consistent else '❌ Inconsistent'}")
            if not availability_consistent:
                print(f"   Values: {availability_responses}")
        
        return result
    
    def run_all_tests(self):
        """Run comprehensive test suite."""
        print("🧪 ChromeLLM Production Test Suite")
        print("=" * 60)
        
        # Build first
        if not self.build_binary():
            return False
        
        # Test scenarios
        scenarios = [
            {
                "name": "Basic Availability Check",
                "commands": [
                    {"requestId": "001", "command": "checkAvailability"},
                    {"requestId": "002", "command": "checkAvailability"},  # Check consistency
                ]
            },
            {
                "name": "Simple Completion Test",
                "commands": [
                    {"requestId": "001", "command": "checkAvailability"},
                    {"requestId": "002", "command": "getCompletion", "payload": {"prompt": "Say hello", "temperature": 0.7}},
                    {"requestId": "003", "command": "checkAvailability"},  # Check if state changed
                ]
            },
            {
                "name": "Streaming Test",
                "commands": [
                    {"requestId": "001", "command": "checkAvailability"},
                    {"requestId": "002", "command": "getCompletionStream", "payload": {"prompt": "Count 1 to 3", "temperature": 0.5}},
                ]
            },
            {
                "name": "Playground Session Basic Test",
                "commands": [
                    {"requestId": "001", "command": "checkAvailability"},
                    {"requestId": "002", "command": "startPlaygroundSession"},
                    {"requestId": "003", "command": "checkAvailability"},  # Check if session creation affects availability
                ]
            }
        ]
        
        # Run all scenarios
        for scenario in scenarios:
            self.run_test_scenario(scenario["name"], scenario["commands"])
        
        # Generate summary
        self.print_summary()
        return True
    
    def print_summary(self):
        """Print comprehensive test summary."""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        successful_tests = sum(1 for r in self.test_results if r["status"] == "success")
        
        print(f"Total tests: {total_tests}")
        print(f"Successful: {successful_tests}")
        print(f"Failed/Partial: {total_tests - successful_tests}")
        
        # Check availability consistency across all tests
        all_availability = []
        for result in self.test_results:
            all_availability.extend(result.get("availability_responses", []))
        
        if all_availability:
            unique_availability = set(all_availability)
            consistent = len(unique_availability) <= 1
            
            print(f"\n🔍 AVAILABILITY CONSISTENCY CHECK:")
            print(f"   Responses: {len(all_availability)} total")
            print(f"   Unique values: {list(unique_availability)}")
            print(f"   Status: {'✅ CONSISTENT' if consistent else '❌ INCONSISTENT'}")
            
            if not consistent:
                print("   ⚠️  WARNING: Availability reporting is inconsistent!")
                print("   This suggests the binary and extension may report different states.")
        
        # Show any errors
        all_errors = []
        for result in self.test_results:
            all_errors.extend(result.get("errors", []))
        
        if all_errors:
            print(f"\n❌ ERRORS ENCOUNTERED:")
            for error in set(all_errors):  # Unique errors only
                print(f"   • {error}")
        
        print(f"\n{'✅ ALL TESTS PASSED' if successful_tests == total_tests else '⚠️ SOME TESTS HAD ISSUES'}")

def main():
    """Run the production test suite."""
    if len(sys.argv) > 1:
        build_dir = sys.argv[1]
        tester = ChromeLLMTester(build_dir)
    else:
        tester = ChromeLLMTester()
    
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()