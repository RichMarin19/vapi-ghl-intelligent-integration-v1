#!/usr/bin/env node

// Debug script to analyze live VAPI webhook payloads and compare with test data
// This helps identify differences between live and test webhook structures

import { Read } from 'fs/promises';

// Function to analyze and compare webhook payload structures
function analyzeWebhookStructure(payload, source = 'unknown') {
    console.log(`\n🔍 Analyzing ${source} Webhook Structure:`);
    console.log('=' .repeat(50));
    
    const analysis = {
        source: source,
        hasMessage: !!payload.message,
        messageType: payload.message?.type,
        hasCall: !!payload.message?.call,
        callId: payload.message?.call?.id,
        hasTranscript: !!payload.message?.call?.transcript,
        transcriptLength: payload.message?.call?.transcript?.length || 0,
        hasAnalysis: !!payload.message?.call?.analysis,
        hasStructuredData: !!payload.message?.call?.analysis?.structuredData,
        hasArtifact: !!payload.message?.call?.artifact,
        hasArtifactMessages: Array.isArray(payload.message?.call?.artifact?.messages),
        hasSummary: !!payload.message?.summary,
        topLevelKeys: Object.keys(payload),
        messageKeys: payload.message ? Object.keys(payload.message) : [],
        callKeys: payload.message?.call ? Object.keys(payload.message.call) : []
    };
    
    console.log(`📋 Basic Structure:`);
    console.log(`   Message Type: ${analysis.messageType || 'NOT FOUND'}`);
    console.log(`   Has Call: ${analysis.hasCall ? '✅' : '❌'}`);
    console.log(`   Call ID: ${analysis.callId || 'NOT FOUND'}`);
    console.log(`   Has Transcript: ${analysis.hasTranscript ? '✅' : '❌'}`);
    console.log(`   Transcript Length: ${analysis.transcriptLength} characters`);
    console.log(`   Has Analysis: ${analysis.hasAnalysis ? '✅' : '❌'}`);
    console.log(`   Has Structured Data: ${analysis.hasStructuredData ? '✅' : '❌'}`);
    console.log(`   Has Artifact: ${analysis.hasArtifact ? '✅' : '❌'}`);
    console.log(`   Has Summary: ${analysis.hasSummary ? '✅' : '❌'}`);
    
    console.log(`\n🔑 Key Structure:`);
    console.log(`   Top Level Keys: [${analysis.topLevelKeys.join(', ')}]`);
    console.log(`   Message Keys: [${analysis.messageKeys.join(', ')}]`);
    console.log(`   Call Keys: [${analysis.callKeys.join(', ')}]`);
    
    // Show transcript location paths
    console.log(`\n📄 Transcript Location Check:`);
    const transcriptPaths = [
        'message.call.transcript',
        'message.call.analysis.transcript', 
        'message.call.artifact.transcript',
        'call.transcript',
        'message.transcript'
    ];
    
    transcriptPaths.forEach(path => {
        const value = getNestedProperty(payload, path);
        const hasValue = value && typeof value === 'string' && value.length > 0;
        console.log(`   ${path}: ${hasValue ? `✅ (${value.length} chars)` : '❌'}`);
    });
    
    // Show structured data paths
    console.log(`\n📊 Structured Data Location Check:`);
    const structuredDataPaths = [
        'message.call.analysis.structuredData',
        'message.analysis.structuredData',
        'call.analysis.structuredData',
        'message.structuredData'
    ];
    
    structuredDataPaths.forEach(path => {
        const value = getNestedProperty(payload, path);
        const hasValue = value && typeof value === 'object';
        console.log(`   ${path}: ${hasValue ? '✅' : '❌'}`);
        if (hasValue) {
            console.log(`      Fields: [${Object.keys(value).join(', ')}]`);
        }
    });
    
    return analysis;
}

// Helper function to get nested property safely
function getNestedProperty(obj, path) {
    return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : null;
    }, obj);
}

// Function to extract transcript from various possible locations
function extractTranscriptFromPayload(payload) {
    console.log(`\n🔍 Transcript Extraction Analysis:`);
    console.log('=' .repeat(40));
    
    const transcriptSources = [
        {
            path: 'message.call.transcript',
            description: 'Standard VAPI transcript location'
        },
        {
            path: 'message.call.analysis.transcript',
            description: 'Analysis transcript location'
        },
        {
            path: 'message.call.artifact.transcript', 
            description: 'Artifact transcript location'
        },
        {
            path: 'call.transcript',
            description: 'Direct call transcript'
        },
        {
            path: 'message.transcript',
            description: 'Message level transcript'
        }
    ];
    
    for (const source of transcriptSources) {
        const transcript = getNestedProperty(payload, source.path);
        if (transcript && typeof transcript === 'string' && transcript.length > 0) {
            console.log(`✅ Found transcript at: ${source.path}`);
            console.log(`   Description: ${source.description}`);
            console.log(`   Length: ${transcript.length} characters`);
            console.log(`   Sample: "${transcript.substring(0, 100)}..."`);
            return transcript;
        } else {
            console.log(`❌ No transcript at: ${source.path}`);
        }
    }
    
    console.log(`⚠️ No transcript found in any expected location`);
    return null;
}

// Function to show sample live vs test comparison
function compareLiveVsTest() {
    console.log(`\n📊 Live vs Test Webhook Comparison:`);
    console.log('=' .repeat(50));
    
    // Test webhook structure (what we used in testing)
    const testStructure = {
        message: {
            type: 'end-of-call-report',
            call: {
                id: 'test-call-123',
                transcript: 'Test transcript...',
                customer: { number: '+1234567890' },
                startedAt: '2025-01-01T10:00:00Z',
                endedAt: '2025-01-01T10:05:00Z'
            }
        }
    };
    
    console.log(`🧪 Test Structure (what worked):`);
    analyzeWebhookStructure(testStructure, 'TEST');
    
    console.log(`\n💡 Expected Live VAPI Structure Differences:`);
    console.log(`   - Live calls may have 'body' wrapper from Lambda`);
    console.log(`   - Transcript might be in call.artifact.messages`);
    console.log(`   - Analysis data may be in different location`);
    console.log(`   - Additional fields like summary, analysis, etc.`);
    console.log(`   - Structured data in analysis.structuredData`);
}

// Main diagnostic function
async function runDiagnostics() {
    console.log(`🔧 VAPI Live Webhook Diagnostics`);
    console.log(`===============================`);
    console.log(`\nThis script helps identify why custom fields work in tests but not live calls.`);
    console.log(`\n📋 What to check:`);
    console.log(`1. Webhook payload structure differences`);
    console.log(`2. Transcript location in live vs test data`);
    console.log(`3. Lambda event.body parsing issues`);
    console.log(`4. VAPI payload format changes`);
    
    // Show comparison of structures
    compareLiveVsTest();
    
    console.log(`\n🔧 Debugging Steps:`);
    console.log(`1. Add logging to Lambda function to capture live payloads`);
    console.log(`2. Compare live payload structure with test structure`);
    console.log(`3. Update transcript extraction logic if needed`);
    console.log(`4. Verify custom fields manager initialization in live environment`);
    
    console.log(`\n📝 Recommended Lambda Debug Code:`);
    console.log(`
// Add this to your Lambda handler to debug live payloads:
console.log('🔍 RAW EVENT:', JSON.stringify(event, null, 2));

if (typeof event.body === 'string') {
    console.log('📦 PARSED BODY:', JSON.stringify(JSON.parse(event.body), null, 2));
} else {
    console.log('📦 DIRECT BODY:', JSON.stringify(event.body || event, null, 2));
}

// Test transcript extraction:
const payload = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || event;
const transcript1 = payload.message?.call?.transcript;
const transcript2 = payload.call?.transcript;
const transcript3 = extractTranscriptFromVAPICall(payload); // Your existing function

console.log('🎯 Transcript Sources:');
console.log('   message.call.transcript:', transcript1 ? transcript1.length + ' chars' : 'NOT FOUND');
console.log('   call.transcript:', transcript2 ? transcript2.length + ' chars' : 'NOT FOUND');
console.log('   extractTranscriptFromVAPICall:', transcript3 ? transcript3.length + ' chars' : 'NOT FOUND');
    `);
}

// Export functions for use in other scripts
export { analyzeWebhookStructure, extractTranscriptFromPayload, compareLiveVsTest };

// Run diagnostics if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runDiagnostics().catch(console.error);
}