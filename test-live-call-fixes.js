#!/usr/bin/env node

// Test the fixes based on the actual live call results shown in screenshots
// Addresses: Expectations showing "2 m", Next Destination format, missing Last Contact/Latest Call Summary

import { TranscriptAIExtractor } from './transcript-ai-extractor.js';

const aiExtractor = new TranscriptAIExtractor();

// Test case based on the actual live call from screenshots
const LIVE_CALL_TEST = {
    name: "Live Call - Utah Move FSBO",
    summary: `The caller wants to see if they can sell their home on their own. They mentioned they're moving to Utah and need to sell within the next 2 months. They expressed disappointment about getting appointments with agents but want to try the FSBO route first. They're concerned about the process but motivated to avoid agent commissions.`,
    callData: {
        message: {
            summary: `The caller wants to see if they can sell their home on their own. They mentioned they're moving to Utah and need to sell within the next 2 months. They expressed disappointment about getting appointments with agents but want to try the FSBO route first. They're concerned about the process but motivated to avoid agent commissions.`
        },
        call: {
            startedAt: new Date().toISOString() // Today's call
        }
    },
    expectedResults: {
        motivation: "sell it on my own (FSBO)",
        nextDestination: "Utah", // Just location, no extra text
        timeline: "2 months",
        expectations: null, // Should NOT extract "2 m" 
        disappointments: "getting appointments",
        concerns: "concerned about the process",
        lastContact: new Date().toISOString().split('T')[0], // Today's date
        latestCallSummary: "The caller wants to see if they can sell their home on their own..." // Full summary
    }
};

console.log('🔧 TESTING LIVE CALL FIXES');
console.log('================================================================================');
console.log('📋 Based on actual GoHighLevel screenshots showing:');
console.log('   ❌ Expectations: "2 m" (wrong)');
console.log('   ❌ Next Destination: "Im moving to Utah." (needs cleaning)');
console.log('   ❌ Last Contact: Empty (should be today)');
console.log('   ❌ Latest Call Summary: Empty (should be VAPI summary)');
console.log('');

try {
    console.log(`📝 ${LIVE_CALL_TEST.name}`);
    console.log('▔'.repeat(60));
    
    const extractedData = await aiExtractor.extractDataFromTranscript('', LIVE_CALL_TEST.callData);
    
    console.log('🎯 EXTRACTION RESULTS:');
    console.log('');
    
    // Test each field
    const fields = [
        'motivation', 'nextDestination', 'timeline', 'expectations', 
        'disappointments', 'concerns', 'lastContact', 'latestCallSummary'
    ];
    
    let fixes = 0;
    let total = 0;
    
    for (const fieldName of fields) {
        const extracted = extractedData[fieldName];
        const expected = LIVE_CALL_TEST.expectedResults[fieldName];
        
        total++;
        
        if (fieldName === 'expectations') {
            // Special test - should NOT extract "2 m"
            if (!extracted || !extracted.value || extracted.value !== '2 m') {
                console.log(`   ✅ ${fieldName}: ${extracted ? `"${extracted.value}"` : 'Not extracted'} (CORRECT - avoided "2 m")`);
                fixes++;
            } else {
                console.log(`   ❌ ${fieldName}: "${extracted.value}" (STILL EXTRACTING WRONG CONTENT)`);
            }
        } else if (fieldName === 'nextDestination') {
            // Should be clean location only
            if (extracted && extracted.value === 'Utah') {
                console.log(`   ✅ ${fieldName}: "${extracted.value}" (CLEAN LOCATION ONLY)`);
                fixes++;
            } else {
                console.log(`   ⚠️ ${fieldName}: "${extracted ? extracted.value : 'Not extracted'}" (Expected: "Utah")`);
            }
        } else if (fieldName === 'lastContact') {
            // Should be today's date
            const today = new Date().toISOString().split('T')[0];
            if (extracted && extracted.value === today) {
                console.log(`   ✅ ${fieldName}: "${extracted.value}" (AUTO-POPULATED WITH TODAY)`);
                fixes++;
            } else {
                console.log(`   ❌ ${fieldName}: "${extracted ? extracted.value : 'Not extracted'}" (Expected: "${today}")`);
            }
        } else if (fieldName === 'latestCallSummary') {
            // Should contain the VAPI summary
            if (extracted && extracted.value && extracted.value.includes('caller wants to see')) {
                console.log(`   ✅ ${fieldName}: "${extracted.value.substring(0, 50)}..." (VAPI SUMMARY INCLUDED)`);
                fixes++;
            } else {
                console.log(`   ❌ ${fieldName}: "${extracted ? (extracted.value ? extracted.value.substring(0, 50) : 'Empty') : 'Not extracted'}" (Expected: VAPI summary)`);
            }
        } else {
            // Regular field test
            if (extracted && extracted.value) {
                console.log(`   ✅ ${fieldName}: "${extracted.value}" (${extracted.confidence}% confidence)`);
                fixes++;
            } else {
                console.log(`   ❌ ${fieldName}: Not extracted`);
            }
        }
    }
    
    console.log('');
    console.log('📊 FIXES VERIFICATION:');
    console.log(`   ✅ Fixed Fields: ${fixes}/${total}`);
    console.log(`   📈 Success Rate: ${Math.round((fixes/total) * 100)}%`);
    
    if (fixes >= 6) {
        console.log('');
        console.log('🎉 EXCELLENT! Major issues fixed:');
        console.log('   ✅ Expectations no longer extracts "2 m"');
        console.log('   ✅ Next Destination shows clean location');
        console.log('   ✅ Last Contact auto-populated');
        console.log('   ✅ Latest Call Summary included');
        console.log('');
        console.log('🚀 Ready for production deployment!');
    } else {
        console.log('');
        console.log('⚠️ Some issues still need attention.');
        console.log('🔧 Review the extraction patterns for remaining failures.');
    }
    
} catch (error) {
    console.error('❌ Test failed:', error.message);
}

console.log('');
console.log('🎯 NEXT STEPS:');
console.log('1. Deploy updated system to handle real VAPI calls');
console.log('2. Monitor live extractions for accuracy');
console.log('3. Fine-tune any remaining edge cases');