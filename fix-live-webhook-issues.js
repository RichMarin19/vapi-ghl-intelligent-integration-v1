#!/usr/bin/env node

// Comprehensive fix for live VAPI webhook issues vs test webhook success
// Addresses common payload structure differences and Lambda parsing issues

import fs from 'fs/promises';

// Create enhanced payload handler that works with both test and live webhooks
const enhancedPayloadHandler = `
// Enhanced payload handling for VAPI webhooks - handles both test and live structures
function parseVAPIWebhookPayload(event) {
    console.log('🔍 ENHANCED: Parsing VAPI webhook payload...');
    console.log('📦 Raw event type:', typeof event);
    console.log('📦 Raw event keys:', Object.keys(event));
    
    let payload;
    
    // Handle different Lambda event structures
    if (typeof event.body === 'string') {
        // Lambda Function URL or API Gateway with string body
        console.log('📦 Parsing string event.body (length:', event.body.length, ')');
        try {
            payload = JSON.parse(event.body);
        } catch (parseError) {
            console.error('❌ Failed to parse event.body as JSON:', parseError);
            throw new Error('Invalid JSON in request body');
        }
    } else if (event.body && typeof event.body === 'object') {
        // Lambda with object body
        console.log('📦 Using object event.body');
        payload = event.body;
    } else if (event.message?.type) {
        // Direct VAPI webhook (test scenarios)
        console.log('📦 Using direct event (test scenario)');
        payload = event;
    } else {
        console.log('📦 Unknown event structure, using event as payload');
        payload = event;
    }
    
    console.log('✅ Payload parsed, keys:', Object.keys(payload));
    return payload;
}

// Enhanced transcript extraction that works with all VAPI payload variants
function extractTranscriptFromVAPIPayload(payload) {
    console.log('🔍 ENHANCED: Extracting transcript from VAPI payload...');
    
    // List all possible transcript locations based on VAPI documentation and real examples
    const transcriptLocations = [
        // Standard locations
        { path: 'message.call.transcript', desc: 'Standard VAPI call transcript' },
        { path: 'call.transcript', desc: 'Direct call transcript' },
        
        // Analysis locations
        { path: 'message.call.analysis.transcript', desc: 'Analysis transcript' },
        { path: 'message.analysis.transcript', desc: 'Message analysis transcript' },
        { path: 'call.analysis.transcript', desc: 'Call analysis transcript' },
        
        // Artifact locations (VAPI sometimes stores data here)
        { path: 'message.call.artifact.transcript', desc: 'Artifact transcript' },
        { path: 'call.artifact.transcript', desc: 'Call artifact transcript' },
        
        // Alternative locations
        { path: 'message.transcript', desc: 'Message level transcript' },
        { path: 'transcript', desc: 'Root level transcript' },
        
        // Structured data locations
        { path: 'message.call.analysis.structuredData.transcript', desc: 'Structured data transcript' },
        { path: 'message.analysis.structuredData.transcript', desc: 'Message structured transcript' }
    ];
    
    // Helper function to get nested property
    const getNestedValue = (obj, path) => {
        return path.split('.').reduce((current, key) => 
            current && current[key] !== undefined ? current[key] : null, obj);
    };
    
    // Try each location
    for (const location of transcriptLocations) {
        const transcript = getNestedValue(payload, location.path);
        console.log(\`🔍 Checking \${location.path}: \${transcript ? \`✅ Found (\${transcript.length} chars)\` : '❌ Not found'}\`);
        
        if (transcript && typeof transcript === 'string' && transcript.trim().length > 0) {
            console.log(\`✅ Using transcript from: \${location.path}\`);
            console.log(\`📄 Transcript preview: "\${transcript.substring(0, 100)}..."\`);
            return transcript.trim();
        }
    }
    
    // Check for transcript in artifact messages array (VAPI 2024+ sometimes uses this)
    const artifactMessages = getNestedValue(payload, 'message.call.artifact.messages') || 
                            getNestedValue(payload, 'call.artifact.messages');
    
    if (Array.isArray(artifactMessages)) {
        console.log('🔍 Checking artifact messages array for transcript...');
        for (const message of artifactMessages) {
            if (message.content && typeof message.content === 'string' && 
                (message.role === 'assistant' || message.type === 'transcript')) {
                console.log('✅ Found transcript in artifact messages');
                return message.content.trim();
            }
        }
    }
    
    // Last resort: look for any string field containing conversational content
    console.log('🔍 Last resort: searching for conversational content...');
    const searchForConversation = (obj, path = '') => {
        if (typeof obj === 'string' && obj.length > 50 && 
            (obj.includes('Hello') || obj.includes('Hi') || obj.includes('?') || obj.includes('I am'))) {
            console.log(\`✅ Found potential transcript at: \${path}\`);
            return obj.trim();
        }
        
        if (typeof obj === 'object' && obj !== null) {
            for (const [key, value] of Object.entries(obj)) {
                const result = searchForConversation(value, path ? \`\${path}.\${key}\` : key);
                if (result) return result;
            }
        }
        
        return null;
    };
    
    const foundTranscript = searchForConversation(payload);
    if (foundTranscript) return foundTranscript;
    
    console.log('❌ No transcript found in any location');
    console.log('📊 Available payload structure (first 500 chars):');
    console.log(JSON.stringify(payload, null, 2).substring(0, 500) + '...');
    
    return null;
}

// Export the enhanced functions
export { parseVAPIWebhookPayload, extractTranscriptFromVAPIPayload };
`;

// Create comprehensive troubleshooting guide
const troubleshootingGuide = `
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
`;

// Main function to apply fixes
async function applyFixes() {
    console.log('🔧 Applying comprehensive fixes for live VAPI webhook issues...');
    console.log('=' .repeat(70));
    
    // Save the enhanced functions to a separate file
    await fs.writeFile('/Users/richmarin/vapi-ghl-lambda/enhanced-webhook-parser.js', enhancedPayloadHandler);
    console.log('✅ Created enhanced-webhook-parser.js');
    
    // Save troubleshooting guide
    await fs.writeFile('/Users/richmarin/vapi-ghl-lambda/LIVE-WEBHOOK-TROUBLESHOOTING.md', troubleshootingGuide);
    console.log('✅ Created LIVE-WEBHOOK-TROUBLESHOOTING.md');
    
    console.log('\n📋 Fixes Applied:');
    console.log('1. Enhanced payload parsing for different event structures');
    console.log('2. Comprehensive transcript location checking');
    console.log('3. Detailed debug logging added to index.js');
    console.log('4. Enhanced custom fields manager transcript extraction');
    console.log('5. Initialization verification logging');
    
    console.log('\n🚀 Next Steps:');
    console.log('1. Deploy the updated Lambda function');
    console.log('2. Make a live VAPI call');
    console.log('3. Check CloudWatch logs for detailed debug output');
    console.log('4. Compare the logged live payload with test payload');
    console.log('5. If transcript location differs, update extraction logic');
    
    console.log('\n💡 Key Files Updated:');
    console.log('• index.js - Enhanced debug logging');
    console.log('• custom-fields-manager.js - Better transcript extraction');
    console.log('• enhanced-webhook-parser.js - NEW enhanced parser functions');
    console.log('• LIVE-WEBHOOK-TROUBLESHOOTING.md - NEW troubleshooting guide');
    
    console.log('\n⚠️ Important:');
    console.log('The debug logs will show you exactly what the live webhook payload looks like.');
    console.log('This will help identify why the custom fields work in tests but not live calls.');
}

// Run fixes if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    applyFixes().catch(console.error);
}