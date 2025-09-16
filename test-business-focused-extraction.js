#!/usr/bin/env node

// Test business-focused, concise extraction based on actual live call
// Should produce bullet-point style info for realtor quick reference

import { TranscriptAIExtractor } from './transcript-ai-extractor.js';

const aiExtractor = new TranscriptAIExtractor();

// Based on the actual call from your screenshot
const BUSINESS_TEST = {
    name: "Africa Move - Business Focused Test",
    summary: `The caller said um, well, I wanna make the most money out of the house. They're moving to Africa and want to sell by the end of the year. They expressed disappointment about just the quality of buyers they've been getting. Their main concern is just getting it closed in their timeline. When asked if a great buyer came along would they be open to working with an agent, they said maybe, not at this time.`,
    callData: {
        message: {
            summary: `The caller said um, well, I wanna make the most money out of the house. They're moving to Africa and want to sell by the end of the year. They expressed disappointment about just the quality of buyers they've been getting. Their main concern is just getting it closed in their timeline. When asked if a great buyer came along would they be open to working with an agent, they said maybe, not at this time.`
        },
        call: {
            startedAt: new Date().toISOString()
        }
    },
    expectedBusinessResults: {
        motivation: "Get top dollar", // Not the verbose version
        nextDestination: "Africa", // Clean location
        timeline: "End of the year", // Clean timeline
        expectations: "Get top dollar", // Not "23 m" garbage
        disappointments: "Quality of buyers", // Concise
        concerns: "Closing within timeline", // Business focused
        openness: "Maybe, not at this time", // Direct quote for this field
        lastContact: new Date().toISOString().split('T')[0],
        latestCallSummary: "The caller said um, well...", // Full summary
        voiceMemory: "Motivation: Get top dollar | Timeline: End of the year..."
    }
};

console.log('🎯 BUSINESS-FOCUSED EXTRACTION TEST');
console.log('================================================================================');
console.log('📋 Target: Concise, bullet-point style info for realtor quick reference');
console.log('🚫 Avoid: Verbose content, random numbers like "23 m", meaningless text');
console.log('✅ Goal: Clean, actionable business intelligence');
console.log('');

try {
    console.log(`📝 ${BUSINESS_TEST.name}`);
    console.log('▔'.repeat(60));
    
    const extractedData = await aiExtractor.extractDataFromTranscript('', BUSINESS_TEST.callData);
    
    console.log('🎯 BUSINESS EXTRACTION RESULTS:');
    console.log('');
    
    // Test key business fields
    const businessFields = [
        { field: 'motivation', label: 'Motivation', target: 'Get top dollar' },
        { field: 'nextDestination', label: 'Next Destination', target: 'Africa' },
        { field: 'timeline', label: 'Timeline', target: 'End of the year' },
        { field: 'expectations', label: 'Expectations', target: 'Get top dollar' },
        { field: 'disappointments', label: 'Disappointments', target: 'Quality of buyers' },
        { field: 'concerns', label: 'Concerns', target: 'Closing within timeline' }
    ];
    
    let businessFieldsCorrect = 0;
    
    for (const { field, label, target } of businessFields) {
        const extracted = extractedData[field];
        const value = extracted ? extracted.value : 'Not extracted';
        
        // Check if it's concise and business-focused
        const isConcise = value.length <= 50; // Reasonable length
        const isBusinessFocused = !value.includes('um,') && !value.includes('well,') && !/^\d+\s*m$/.test(value);
        const isRelevant = value !== 'Not extracted';
        
        if (isConcise && isBusinessFocused && isRelevant) {
            console.log(`   ✅ ${label}: "${value}" (BUSINESS-FOCUSED)`);
            businessFieldsCorrect++;
        } else if (isRelevant) {
            console.log(`   ⚠️ ${label}: "${value}" (NEEDS REFINEMENT)`);
            businessFieldsCorrect += 0.5;
        } else {
            console.log(`   ❌ ${label}: Not extracted`);
        }
    }
    
    // Test system fields
    console.log('');
    console.log('📋 SYSTEM FIELDS:');
    
    const systemFields = ['lastContact', 'latestCallSummary', 'voiceMemory'];
    let systemFieldsCorrect = 0;
    
    for (const field of systemFields) {
        const extracted = extractedData[field];
        const value = extracted ? extracted.value : null;
        
        if (field === 'lastContact') {
            const today = new Date().toISOString().split('T')[0];
            if (value === today) {
                console.log(`   ✅ Last Contact: "${value}" (TODAY'S DATE)`);
                systemFieldsCorrect++;
            } else {
                console.log(`   ❌ Last Contact: "${value || 'Not set'}" (Should be ${today})`);
            }
        } else if (field === 'latestCallSummary') {
            if (value && value.includes('caller said')) {
                console.log(`   ✅ Latest Call Summary: "${value.substring(0, 50)}..." (VAPI SUMMARY)`);
                systemFieldsCorrect++;
            } else {
                console.log(`   ❌ Latest Call Summary: "${value || 'Not set'}" (Should be VAPI summary)`);
            }
        } else if (field === 'voiceMemory') {
            if (value && (value.includes('Motivation:') || value.includes('Timeline:'))) {
                console.log(`   ✅ Voice Memory: "${value.substring(0, 50)}..." (BUSINESS POINTS)`);
                systemFieldsCorrect++;
            } else {
                console.log(`   ⚠️ Voice Memory: "${value || 'Not set'}" (Should be business points)`);
            }
        }
    }
    
    console.log('');
    console.log('📊 BUSINESS QUALITY ASSESSMENT:');
    console.log(`   💼 Business Fields: ${businessFieldsCorrect}/6 (${Math.round(businessFieldsCorrect/6*100)}%)`);
    console.log(`   🔧 System Fields: ${systemFieldsCorrect}/3 (${Math.round(systemFieldsCorrect/3*100)}%)`);
    
    const overallScore = (businessFieldsCorrect + systemFieldsCorrect) / 9 * 100;
    console.log(`   🎯 Overall Quality: ${Math.round(overallScore)}%`);
    
    if (overallScore >= 85) {
        console.log('');
        console.log('🎉 EXCELLENT! Ready for realtors:');
        console.log('   ✅ Concise, actionable information');
        console.log('   ✅ No verbose or meaningless content');
        console.log('   ✅ Business-focused intelligence');
        console.log('   ✅ System fields auto-populated');
    } else if (overallScore >= 70) {
        console.log('');
        console.log('🔥 GOOD PROGRESS! Minor refinements needed:');
        console.log('   ✅ Most fields are business-focused');
        console.log('   🔧 Some fields need more concise formatting');
    } else {
        console.log('');
        console.log('⚠️ NEEDS MORE WORK:');
        console.log('   🔧 Fields still too verbose or extracting wrong content');
        console.log('   🔧 System fields not populating correctly');
    }
    
} catch (error) {
    console.error('❌ Test failed:', error.message);
}

console.log('');
console.log('🎯 REALTOR-READY CRITERIA:');
console.log('   • Concise bullet points (under 50 characters)');
console.log('   • No filler words ("um", "well", etc.)');
console.log('   • Business-focused language');
console.log('   • System fields auto-populated');
console.log('   • Quick scan-able information');