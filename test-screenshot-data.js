#!/usr/bin/env node

// Test the improved intelligent field extraction with the exact call summary from screenshot
import { IntelligentFieldMapper } from './intelligent-field-mapper.js';

const SCREENSHOT_CALL_SUMMARY = `The AI called Jack Mello, a For Sale By Owner, to understand his selling motivations, which include saving commission, getting the most money, and selling by year-end for $1.05M. Jack expressed concerns about buyer quality and was open to working with an agent if the buyer paid the commission. The call concluded with scheduling an in-person preview with "Rich" for September 16th at 1 PM to offer feedback and explore potential buyers.`;

async function testScreenshotData() {
    console.log('🎯 TESTING WITH EXACT SCREENSHOT CALL SUMMARY');
    console.log('================================================================================');
    console.log('📝 Call Summary:');
    console.log(SCREENSHOT_CALL_SUMMARY);
    console.log('');
    
    console.log('🧠 Expected Field Values:');
    console.log('   Motivation: "Save commission, get the most money"');
    console.log('   Expectations: "$1.05M, get the most money" or similar');
    console.log('   Timeline: "Year-end"');
    console.log('   Concerns: "Buyer quality"');
    console.log('   Openness to Re-list: "Yes, if buyer pays commission"');
    console.log('   Next Destination: "Not specified"');
    console.log('');
    
    try {
        const mapper = new IntelligentFieldMapper();
        const results = await mapper.extractIntelligentFields(SCREENSHOT_CALL_SUMMARY, '', {});
        
        console.log('🎯 EXTRACTION RESULTS:');
        console.log('');
        
        const testFields = [
            'motivation', 'expectations', 'timeline', 
            'concerns', 'Openness to Re-list', 'nextDestination'
        ];
        
        let correctFields = 0;
        
        for (const field of testFields) {
            const extracted = results[field];
            const value = extracted ? extracted.value : 'NOT EXTRACTED';
            const confidence = extracted ? extracted.confidence : 0;
            
            console.log(`📌 ${field}:`);
            console.log(`   Result: "${value}" (${confidence}% confidence)`);
            
            // Validate results
            let isCorrect = false;
            switch (field) {
                case 'motivation':
                    isCorrect = value.toLowerCase().includes('commission') && value.toLowerCase().includes('money');
                    break;
                case 'expectations':
                    isCorrect = value.includes('1.05') || value.toLowerCase().includes('most money');
                    break;
                case 'timeline':
                    isCorrect = value.toLowerCase().includes('year');
                    break;
                case 'concerns':
                    isCorrect = value.toLowerCase().includes('buyer') && value.toLowerCase().includes('quality');
                    break;
                case 'Openness to Re-list':
                    isCorrect = value.toLowerCase().includes('yes') && value.toLowerCase().includes('buyer') && value.toLowerCase().includes('commission');
                    break;
                case 'nextDestination':
                    isCorrect = value === 'Not specified';
                    break;
            }
            
            console.log(`   Status: ${isCorrect ? '✅ CORRECT' : '❌ NEEDS IMPROVEMENT'}`);
            if (isCorrect) correctFields++;
            console.log('');
        }
        
        // Test system fields
        console.log('📋 SYSTEM FIELDS:');
        console.log('');
        
        const systemFields = ['Last Contact', 'latest Call Summary', 'Voice Memory'];
        for (const field of systemFields) {
            const extracted = results[field];
            const value = extracted ? extracted.value : 'NOT GENERATED';
            console.log(`📌 ${field}: "${value.substring(0, 60)}${value.length > 60 ? '...' : ''}"`);
        }
        
        console.log('');
        console.log('🎯 ACCURACY ASSESSMENT:');
        console.log(`   Correct fields: ${correctFields}/${testFields.length} (${Math.round(correctFields/testFields.length*100)}%)`);
        
        if (correctFields >= 5) {
            console.log('   🎉 EXCELLENT! Ready for deployment!');
        } else if (correctFields >= 4) {
            console.log('   🔥 VERY GOOD! Minor tweaks needed.');
        } else {
            console.log('   ⚠️ NEEDS MORE WORK');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    }
}

testScreenshotData();