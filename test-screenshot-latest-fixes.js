#!/usr/bin/env node

// Test the latest fixes for the GoHighLevel screenshot issues
// Focus on: expectations should be "control over process", openness should be "maybe"

import { TranscriptAIExtractor } from './transcript-ai-extractor.js';

const aiExtractor = new TranscriptAIExtractor();

// Based on the latest screenshot showing the problems
const LATEST_SCREENSHOT_TEST = {
    name: "Control Process Test - Latest Screenshot",
    summary: `I wanna have control over the process. The caller is moving to Virginia and wants to sell before this summer. They expressed disappointment about finding buyers. Their main concern is selling my house in a reasonable time. When asked if a great buyer came along would they be open to working with an agent, they said maybe, depending on the situation.`,
    callData: {
        message: {
            summary: `I wanna have control over the process. The caller is moving to Virginia and wants to sell before this summer. They expressed disappointment about finding buyers. Their main concern is selling my house in a reasonable time. When asked if a great buyer came along would they be open to working with an agent, they said maybe, depending on the situation.`
        },
        call: {
            startedAt: new Date().toISOString()
        }
    },
    expectedFixed: {
        motivation: "Control over the process", // From "I wanna have control over the process"
        nextDestination: "Virginia", 
        timeline: "Before this summer",
        expectations: "Control over the process", // NOT "23 m" - should extract this properly
        disappointments: "Finding buyers", 
        concerns: "Selling within reasonable time", 
        'Openness to Re-list': "Maybe, depending on situation", // From agent question response
        'Last Contact': new Date().toISOString().split('T')[0],
        'latest Call Summary': "I wanna have control...", // Should be populated
        'Voice Memory': "Motivation: Control over the process..." // Should be populated
    }
};

console.log('🔧 LATEST SCREENSHOT FIXES TEST');
console.log('================================================================================');
console.log('🎯 Testing fixes for the exact issues shown in latest GoHighLevel screenshot:');
console.log('   ❌ Expectations: Should be "Control over the process" NOT "23 m"');
console.log('   ❌ Openness to Re-list: Should be "Maybe" from agent question response');
console.log('   ❌ System Fields: Last Contact, Latest Call Summary, Voice Memory empty');
console.log('');

try {
    console.log(`📝 ${LATEST_SCREENSHOT_TEST.name}`);
    console.log('▔'.repeat(60));
    
    const extractedData = await aiExtractor.extractDataFromTranscript('', LATEST_SCREENSHOT_TEST.callData);
    
    console.log('🎯 LATEST FIXES VALIDATION:');
    console.log('');
    
    // Test the key problem fields from the screenshot
    const problemFields = [
        { 
            field: 'expectations', 
            issue: 'Should be "Control over the process", NOT "23 m"',
            test: (value) => value && (value.toLowerCase().includes('control') || value.toLowerCase().includes('process'))
        },
        { 
            field: 'Openness to Re-list', 
            issue: 'Should be "Maybe" from agent question response',
            test: (value) => value && (value.toLowerCase().includes('maybe') || value.toLowerCase().includes('depending'))
        }
    ];
    
    let keyFixesWorking = 0;
    
    for (const { field, issue, test } of problemFields) {
        const extracted = extractedData[field];
        const value = extracted ? extracted.value : null;
        
        if (test(value)) {
            console.log(`   ✅ ${field}: "${value}" (FIXED!))`);
            console.log(`      💚 ${issue}`);
            keyFixesWorking++;
        } else {
            console.log(`   ❌ ${field}: "${value || 'Not extracted'}" (STILL BROKEN)`);
            console.log(`      🔧 ${issue}`);
        }
        console.log('');
    }
    
    // Test other key fields that should work
    console.log('📋 OTHER CORE FIELDS:');
    console.log('');
    
    const coreFields = ['motivation', 'nextDestination', 'timeline', 'disappointments', 'concerns'];
    let coreWorking = 0;
    
    for (const field of coreFields) {
        const extracted = extractedData[field];
        const value = extracted ? extracted.value : null;
        
        if (value && value.length > 2) {
            console.log(`   ✅ ${field}: "${value}"`);
            coreWorking++;
        } else {
            console.log(`   ❌ ${field}: Not extracted`);
        }
    }
    
    // Test system fields
    console.log('');
    console.log('📋 SYSTEM FIELDS (Should NOT be empty):');
    console.log('');
    
    const systemFields = [
        { field: 'Last Contact', type: 'DATE' },
        { field: 'latest Call Summary', type: 'SUMMARY' },
        { field: 'Voice Memory', type: 'BUSINESS_POINTS' }
    ];
    
    let systemWorking = 0;
    
    for (const { field, type } of systemFields) {
        const extracted = extractedData[field];
        const value = extracted ? extracted.value : null;
        
        if (value && value.length > 5) {
            console.log(`   ✅ ${field}: "${value.substring(0, 40)}..." (POPULATED)`);
            systemWorking++;
        } else {
            console.log(`   ❌ ${field}: "${value || 'EMPTY'}" (STILL EMPTY)`);
        }
    }
    
    console.log('');
    console.log('📊 SCREENSHOT FIXES RESULTS:');
    console.log(`   🔧 Key Problem Fields Fixed: ${keyFixesWorking}/2`);
    console.log(`   💼 Core Fields Working: ${coreWorking}/5`);
    console.log(`   🔧 System Fields Working: ${systemWorking}/3`);
    
    const totalScore = (keyFixesWorking + coreWorking + systemWorking);
    const maxScore = 10;
    const successRate = Math.round((totalScore / maxScore) * 100);
    
    console.log(`   🎯 Overall Success: ${successRate}% (${totalScore}/${maxScore})`);
    
    if (keyFixesWorking === 2 && systemWorking >= 2) {
        console.log('');
        console.log('🎉 SCREENSHOT ISSUES RESOLVED!');
        console.log('   ✅ Expectations now extracts "Control over process"');
        console.log('   ✅ Openness to Re-list extracts agent response');
        console.log('   ✅ System fields populating correctly');
        console.log('   🚀 Ready for production!');
    } else if (keyFixesWorking >= 1) {
        console.log('');
        console.log('🔥 PROGRESS MADE!');
        console.log('   ✅ Some key issues resolved');
        console.log('   🔧 Still need to fix remaining fields');
    } else {
        console.log('');
        console.log('⚠️ NEEDS MORE WORK');
        console.log('   🔧 Key extraction patterns still not working');
    }
    
} catch (error) {
    console.error('❌ Test failed:', error.message);
}

console.log('');
console.log('🎯 SUCCESS CRITERIA FOR SCREENSHOT FIXES:');
console.log('   • Expectations: "Control over the process" (NOT "23 m")');
console.log('   • Openness to Re-list: "Maybe" (from agent question)');
console.log('   • System fields auto-populated');
console.log('   • Clean, professional formatting');