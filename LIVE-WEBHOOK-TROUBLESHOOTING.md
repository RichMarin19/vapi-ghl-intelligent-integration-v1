
# VAPI Live Webhook vs Test Webhook Troubleshooting Guide

## Issue: Custom fields work in tests but not with live VAPI calls

### Most Common Causes:

1. **Payload Structure Differences**
   - Live webhooks come through Lambda Function URLs with event.body as string
   - Test payloads are direct objects
   - VAPI may change payload structure between versions

2. **Transcript Location Changes**
   - Live calls may store transcript in different locations
   - VAPI analysis may process transcript differently
   - Artifact messages may contain the actual transcript

3. **Lambda Environment Differences**
   - Test runs synchronously, live runs async
   - Different timeout behaviors
   - Cold starts affecting initialization

4. **VAPI API Changes (2024-2025)**
   - Analysis data structure changes
   - New structured data locations
   - Webhook payload format updates

### Debugging Steps:

1. **Add Debug Logging**
   - Log entire event structure
   - Log parsed payload structure
   - Log transcript extraction attempts
   - Log custom fields manager state

2. **Check Lambda CloudWatch Logs**
   - Look for payload structure differences
   - Check for error messages during processing
   - Verify custom fields manager initialization

3. **Test with Live Data**
   - Capture actual live webhook payload
   - Compare with test payload structure
   - Update extraction logic as needed

### Solutions Applied:

✅ Enhanced payload parsing for different Lambda event types
✅ Comprehensive transcript location checking  
✅ Detailed debug logging for live webhook troubleshooting
✅ Fallback transcript extraction methods
✅ Custom fields manager initialization verification

### Next Steps:

1. Deploy updated code with enhanced logging
2. Make a live VAPI call
3. Check CloudWatch logs for debug output
4. Compare live vs test payload structures
5. Update extraction logic based on findings
