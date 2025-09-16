#!/bin/bash

# Quick deploy script for debug version to troubleshoot live webhook issues
# This deploys the enhanced version with comprehensive logging

set -e

echo "🔧 Deploying Debug-Enhanced VAPI-GHL Lambda"
echo "=========================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the vapi-ghl-lambda directory"
    exit 1
fi

# Create deployment package
echo "📦 Creating deployment package with debug enhancements..."
zip -r vapi-ghl-debug.zip . -x "*.git*" "*.DS_Store*" "node_modules/.cache/*" "test-*" "*.md" "*.sh"

# Update Lambda function
echo "🚀 Updating Lambda function..."
aws lambda update-function-code \
    --function-name vapi-ghl-integration \
    --zip-file fileb://vapi-ghl-debug.zip \
    --region us-east-2

echo "✅ Debug version deployed successfully!"
echo ""
echo "📋 What's New in This Version:"
echo "• Enhanced payload structure logging"
echo "• Comprehensive transcript location checking"  
echo "• Custom fields manager initialization verification"
echo "• Detailed debug output for live webhook analysis"
echo ""
echo "🔍 Next Steps:"
echo "1. Make a live VAPI call"
echo "2. Check CloudWatch logs for debug output"
echo "3. Look for these log entries:"
echo "   - '🔍 LIVE WEBHOOK DEBUG - Payload Structure'"
echo "   - '🎯 TRANSCRIPT LOCATION DEBUG'"
echo "   - '🔍 Custom Fields Manager - Extracting transcript'"
echo "   - '🔧 DEBUG: Custom Fields Manager Initialization Check'"
echo ""
echo "🎯 The logs will show exactly what's different between live and test calls!"

# Clean up
rm vapi-ghl-debug.zip

echo ""
echo "💡 To monitor logs in real-time:"
echo "aws logs tail /aws/lambda/vapi-ghl-integration --follow --region us-east-2"