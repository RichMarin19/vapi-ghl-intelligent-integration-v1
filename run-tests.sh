#!/bin/bash

# Test runner script for VAPI-GHL Custom Fields System
# Makes it easy to run different types of tests

set -e  # Exit on any error

echo "🧪 VAPI-GHL Custom Fields Test Runner"
echo "===================================="
echo ""

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed or not in PATH"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the vapi-ghl-lambda directory"
    exit 1
fi

# Function to run a test with error handling
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo "🏃 Running: $test_name"
    echo "Command: $test_command"
    echo "---"
    
    if eval "$test_command"; then
        echo "✅ $test_name completed successfully"
    else
        echo "❌ $test_name failed"
        return 1
    fi
    echo ""
}

# Parse command line arguments
TEST_TYPE="${1:-all}"
CONTACT_ID="${2:-}"

case "$TEST_TYPE" in
    "system")
        echo "🔧 Testing System Components Only"
        echo ""
        run_test "Token Manager Status" "node pit-token-manager.js status"
        run_test "Custom Fields Retrieval" "node get-custom-fields.js"
        ;;
        
    "extraction")
        echo "🤖 Testing AI Extraction Only"
        echo ""
        run_test "AI Extraction Tests" "node test-custom-fields.js"
        ;;
        
    "full")
        echo "🚀 Full End-to-End Testing (with GoHighLevel updates)"
        echo ""
        if [ -z "$CONTACT_ID" ]; then
            echo "❌ Contact ID required for full testing"
            echo "Usage: ./run-tests.sh full CONTACT_ID"
            echo "Example: ./run-tests.sh full contact_123abc"
            exit 1
        fi
        
        echo "⚠️ WARNING: This will update custom fields in GoHighLevel"
        echo "Contact ID: $CONTACT_ID"
        echo ""
        read -p "Continue? (y/N): " -r
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Test cancelled"
            exit 0
        fi
        
        export TEST_CONTACT_ID="$CONTACT_ID"
        run_test "Full End-to-End Test" "node test-custom-fields.js"
        ;;
        
    "all"|*)
        echo "🔍 Running All Tests (Safe Mode - No GHL Updates)"
        echo ""
        
        run_test "1. Token Manager Status" "node pit-token-manager.js status"
        run_test "2. Custom Fields Retrieval" "node get-custom-fields.js"
        run_test "3. AI Extraction & System Tests" "node test-custom-fields.js"
        
        echo "🎯 All tests completed!"
        echo ""
        echo "💡 To run end-to-end tests with actual GoHighLevel updates:"
        echo "   ./run-tests.sh full CONTACT_ID"
        echo ""
        ;;
esac

echo "✅ Test run completed successfully!"
echo ""
echo "📋 Next Steps:"
echo "1. Review test results above"
echo "2. If all tests pass, system is ready for production"
echo "3. Deploy with: ./deploy.sh"
echo "4. Monitor logs in AWS CloudWatch"