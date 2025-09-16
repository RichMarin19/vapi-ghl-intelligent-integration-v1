#!/usr/bin/env node

// Test the screenshot data specifically: Missouri move with connection motivation
// Focus on fixing: Expectations still showing "23 m" instead of proper extraction

import { TranscriptAIExtractor } from './transcript-ai-extractor.js';

const aiExtractor = new TranscriptAIExtractor();

// Based on the exact screenshot data showing the issues
const MISSOURI_SCREENSHOT_TEST = {
    name: "Missouri Connection Test - Exact Screenshot Data",
    // This should match what's being shown in the screenshot
    summary: `The caller mentioned the connection as their motivation. I would like to go to lets say, Missouri. By the by February, I would say. Maybe sooner if possible. They expressed disappointment about quality of buyers. Their concern is just getting things done in my time frame.`,
    callData: {
        message: {
            summary: `The caller mentioned the connection as their motivation. I would like to go to lets say, Missouri. By the by February, I would say. Maybe sooner if possible. They expressed disappointment about quality of buyers. Their concern is just getting things done in my time frame.`
        },
        call: {
            startedAt: new Date().toISOString()
        }
    },
    expectedResults: {
        motivation: "Personal connection", // From "the connection"
        nextDestination: "Missouri",
        timeline: "By February, maybe sooner", 
        expectations: "Personal connection with buyer", // NOT "23 m"!
        disappointments: "Quality of buyers",
        concerns: "Getting things done in timeframe",
        'Openness to Re-list': "Not mentioned", // Should not be empty
        'Last Contact': new Date().toISOString().split('T')[0],
        'latest Call Summary': "The caller mentioned...", // Should be populated
        'Voice Memory': "Motivation: Personal connection..." // Should be populated
    }
};

console.log('🔧 MISSOURI SCREENSHOT EXACT DATA TEST');
console.log('================================================================================');
console.log('🎯 Testing with exact screenshot data to fix remaining issues:');
console.log('   ❌ Expectations: Still showing "23 m" instead of meaningful content');
console.log('   ❌ Empty system fields: Last Contact, Latest Call Summary, Voice Memory');
console.log('   ❌ Openness to Re-list: Still empty');
console.log('');

try {
    console.log(`📝 ${MISSOURI_SCREENSHOT_TEST.name}`);
    console.log('▔'.repeat(60));
    
    const extractedData = await aiExtractor.extractDataFromTranscript('', MISSOURI_SCREENSHOT_TEST.callData);
    
    console.log('🎯 SCREENSHOT DATA EXTRACTION RESULTS:');
    console.log('');
    
    // Test ALL fields from screenshot
    const screenshotFields = [
        'motivation', 'nextDestination', 'expectations', 'timeline', 
        'disappointments', 'concerns', 'Openness to Re-list'
    ];
    
    let workingFields = 0;
    let totalFields = screenshotFields.length;
    
    for (const field of screenshotFields) {
        const extracted = extractedData[field];
        const value = extracted ? extracted.value : null;
        const confidence = extracted ? extracted.confidence : 0;
        
        if (value && value !== 'Not mentioned' && value !== '23 m' && value.length > 3) {
            console.log(`   ✅ ${field}: "${value}" (${confidence}% confidence)`);
            workingFields++;
        } else if (field === 'expectations' && value === '23 m') {
            console.log(`   🚨 ${field}: "${value}" (STILL THE PROBLEM VALUE!)`);
        } else {
            console.log(`   ❌ ${field}: "${value || 'Empty'}" (NEEDS FIX)`);
        }
    }
    
    // Test system fields specifically
    console.log('');
    console.log('📋 SYSTEM FIELDS VALIDATION:');
    console.log('');
    
    const systemFields = [
        { field: 'Last Contact', expectedType: 'date' },
        { field: 'latest Call Summary', expectedType: 'summary' },
        { field: 'Voice Memory', expectedType: 'business_points' }
    ];
    
    let systemWorking = 0;
    
    for (const { field, expectedType } of systemFields) {
        const extracted = extractedData[field];
        const value = extracted ? extracted.value : null;
        
        if (value && value.length > 5) {
            console.log(`   ✅ ${field}: "${value.substring(0, 30)}..." (${expectedType.toUpperCase()})`);
            systemWorking++;
        } else {
            console.log(`   ❌ ${field}: "${value || 'EMPTY'}" (${expectedType.toUpperCase()} MISSING)`);
        }
    }
    
    // Overall assessment
    const totalScore = workingFields + systemWorking;
    const maxScore = totalFields + systemFields.length;
    const successRate = Math.round((totalScore / maxScore) * 100);
    
    console.log('');
    console.log('📊 SCREENSHOT FIX ASSESSMENT:');
    console.log(`   💼 Screenshot Fields Working: ${workingFields}/${totalFields}`);
    console.log(`   🔧 System Fields Working: ${systemWorking}/${systemFields.length}`);
    console.log(`   🎯 Overall Success: ${successRate}% (${totalScore}/${maxScore})`);
    
    // Specific issue analysis
    console.log('');
    console.log('🔍 SPECIFIC ISSUE ANALYSIS:');
    
    const expectationsValue = extractedData.expectations?.value;
    if (expectationsValue === '23 m') {
        console.log('   🚨 CRITICAL: Expectations still showing "23 m" - extraction logic not working');
        console.log('   🔧 ISSUE: Need to implement proper expectation extraction for connection-based motivation');
    } else if (expectationsValue && expectationsValue.includes('connection')) {
        console.log('   ✅ SUCCESS: Expectations now properly extracting connection-based content');
    } else if (!expectationsValue) {
        console.log('   ⚠️ WARNING: Expectations not extracting at all - check patterns');
    }
    
    if (systemWorking === 0) {
        console.log('   🚨 CRITICAL: System fields not populating - check field mapping');
    } else if (systemWorking < 3) {
        console.log('   ⚠️ WARNING: Some system fields missing - check field name matching');
    } else {
        console.log('   ✅ SUCCESS: System fields populating correctly');
    }
    
    // Action items
    if (successRate < 80) {
        console.log('');
        console.log('🔧 REQUIRED FIXES:');
        if (expectationsValue === '23 m') {
            console.log('   1. Fix expectations extraction logic for connection-based motivation');
        }
        if (systemWorking < 3) {
            console.log('   2. Fix system field mapping and population');
        }
        if (workingFields < 5) {
            console.log('   3. Improve core field extraction patterns');
        }
    } else {
        console.log('');
        console.log('🎉 SCREENSHOT ISSUES RESOLVED!');
        console.log('   🚀 Ready for production deployment');
    }
    
} catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
}

console.log('');
console.log('🎯 TARGET GOALS:');
console.log('   • Expectations: "Personal connection with buyer" (NOT "23 m")');
console.log('   • System fields: All populated automatically');
console.log('   • Core fields: Clean, business-focused content');
console.log('   • Overall: 85%+ success rate for production readiness');