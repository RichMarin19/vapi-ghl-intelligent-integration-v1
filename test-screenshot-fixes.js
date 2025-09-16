#!/usr/bin/env node

// Test fixes for the exact issues shown in the GoHighLevel screenshot
// Address: expectations "23 m", verbose disappointments/concerns, empty system fields

import { TranscriptAIExtractor } from './transcript-ai-extractor.js';

const aiExtractor = new TranscriptAIExtractor();

// Based on the actual problematic call from screenshot
const SCREENSHOT_TEST = {
    name: "Jersey Move - Screenshot Issues Test",
    summary: `The caller wants to save the commission and is moving to Jersey by next April. When asked about expectations, they said they want to make the most money out of the house. They expressed disappointment saying "Um, I would say Im getting a lot of calls from buyers that arent qualified. Theyre all asking for some type of concession or homeowner owner finance and we need the money to buy our next house." Their concern was "Uh, not at this time. Just that." About openness to working with an agent they said "Maybe, depending on the situation."`,
    callData: {
        message: {
            summary: `The caller wants to save the commission and is moving to Jersey by next April. When asked about expectations, they said they want to make the most money out of the house. They expressed disappointment saying "Um, I would say Im getting a lot of calls from buyers that arent qualified. Theyre all asking for some type of concession or homeowner owner finance and we need the money to buy our next house." Their concern was "Uh, not at this time. Just that." About openness to working with an agent they said "Maybe, depending on the situation."`
        },
        call: {
            startedAt: new Date().toISOString()
        }
    },
    expectedFixed: {
        motivation: "Avoid agent commissions", // Not verbose
        nextDestination: "Jersey", // Clean location
        timeline: "By April", // Not "Um, by next April"
        expectations: "Get top dollar", // NOT "23 m"
        disappointments: "Unqualified buyers", // Not the verbose paragraph
        concerns: "No major concerns", // Not "Uh, not at this time. Just that."
        'Last Contact': new Date().toISOString().split('T')[0],
        'latest Call Summary': "The caller wants to save...", // Should not be empty
        'Voice Memory': "Motivation: Avoid agent commissions..." // Should not be empty
    }
};

console.log('🔧 SCREENSHOT ISSUES FIX TEST');
console.log('================================================================================');
console.log('📋 Fixing the exact problems shown in GoHighLevel screenshot:');
console.log('   ❌ Expectations: "23 m" (completely wrong)');
console.log('   ❌ Timeline: "Um, by next April." (has filler words)');
console.log('   ❌ Disappointments: Too verbose paragraph');
console.log('   ❌ Concerns: "Uh, not at this time. Just that." (messy)');
console.log('   ❌ System Fields: Empty (Last Contact, Latest Call Summary, Voice Memory)');
console.log('');

try {
    console.log(`📝 ${SCREENSHOT_TEST.name}`);
    console.log('▔'.repeat(60));
    
    const extractedData = await aiExtractor.extractDataFromTranscript('', SCREENSHOT_TEST.callData);
    
    console.log('🎯 EXTRACTION FIXES VALIDATION:');
    console.log('');
    
    let fixedIssues = 0;
    let totalIssues = 0;
    
    // Check each problematic field
    const problemFields = [
        { 
            field: 'expectations', 
            issue: 'Should be "Get top dollar", NOT "23 m"',
            test: (value) => value && value.includes('top dollar') && !value.includes('23 m')
        },
        { 
            field: 'timeline', 
            issue: 'Should be "By April", no filler words',
            test: (value) => value && value.includes('April') && !value.includes('Um,')
        },
        { 
            field: 'disappointments', 
            issue: 'Should be concise "Unqualified buyers"',
            test: (value) => value && value.length < 50 && (value.includes('Unqualified') || value.includes('qualified'))
        },
        { 
            field: 'concerns', 
            issue: 'Should be clean, not "Uh, not at this time"',
            test: (value) => value && !value.includes('Uh,') && !value.includes('Just that')
        }
    ];
    
    for (const { field, issue, test } of problemFields) {
        totalIssues++;
        const extracted = extractedData[field];
        const value = extracted ? extracted.value : null;
        
        if (test(value)) {
            console.log(`   ✅ ${field}: "${value}" (FIXED)`);
            console.log(`      💚 ${issue}`);
            fixedIssues++;
        } else {
            console.log(`   ❌ ${field}: "${value || 'Not extracted'}" (STILL BROKEN)`);
            console.log(`      🔧 ${issue}`);
        }
        console.log('');
    }
    
    // Check system fields
    console.log('📋 SYSTEM FIELDS (Should NOT be empty):');
    console.log('');
    
    const systemFields = [
        { field: 'Last Contact', type: 'DATE' },
        { field: 'latest Call Summary', type: 'SUMMARY' },
        { field: 'Voice Memory', type: 'BUSINESS_POINTS' }
    ];
    
    let systemFixed = 0;
    
    for (const { field, type } of systemFields) {
        totalIssues++;
        const extracted = extractedData[field];
        const value = extracted ? extracted.value : null;
        
        if (value && value.length > 5) {
            console.log(`   ✅ ${field}: "${value.substring(0, 40)}..." (POPULATED)`);
            systemFixed++;
            fixedIssues++;
        } else {
            console.log(`   ❌ ${field}: "${value || 'EMPTY'}" (STILL EMPTY)`);
        }
    }
    
    console.log('');
    console.log('📊 FIX VALIDATION RESULTS:');
    console.log(`   🔧 Issues Fixed: ${fixedIssues}/${totalIssues}`);
    console.log(`   📈 Success Rate: ${Math.round((fixedIssues/totalIssues) * 100)}%`);
    
    if (fixedIssues >= 6) {
        console.log('');
        console.log('🎉 EXCELLENT! Major screenshot issues fixed:');
        console.log('   ✅ No more "23 m" garbage in expectations');
        console.log('   ✅ Clean, concise field content');
        console.log('   ✅ System fields populating correctly');
        console.log('   ✅ Filler words removed');
    } else if (fixedIssues >= 4) {
        console.log('');
        console.log('🔥 GOOD PROGRESS! Most issues resolved.');
        console.log('🔧 Minor tweaks still needed for remaining fields.');
    } else {
        console.log('');
        console.log('⚠️ NEEDS MORE WORK');
        console.log('🔧 Core extraction patterns still need refinement.');
    }
    
} catch (error) {
    console.error('❌ Test failed:', error.message);
}

console.log('');
console.log('🎯 SUCCESS CRITERIA:');
console.log('   • NO "23 m" or random numbers in expectations');
console.log('   • Clean timeline without "Um,"');
console.log('   • Concise disappointments (under 50 chars)');
console.log('   • Professional concerns formatting');
console.log('   • System fields auto-populated with real data');