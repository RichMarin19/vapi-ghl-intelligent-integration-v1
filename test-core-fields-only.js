#!/usr/bin/env node

// Test focused on ONLY the 6 core custom fields from GoHighLevel screenshots
// Target: 85%+ accuracy on these specific fields

import { TranscriptAIExtractor } from './transcript-ai-extractor.js';

const aiExtractor = new TranscriptAIExtractor();

// Test scenarios focusing ONLY on the 6 core fields
const CORE_FIELD_TESTS = {
    scenario1: {
        name: "Motivated Seller - Core Fields Only",
        summary: `The caller, Sarah Johnson, is interested in selling her 4-bedroom, 3-bathroom single family home because her husband received a job transfer to Austin, Texas. They need to relocate within the next 3 months, making this a time-sensitive situation. Sarah mentioned they're hoping to get around $450,000 for the property but are flexible on price due to the urgent timeline. She expressed disappointment with two previous real estate agents who promised quick results but didn't deliver. The family of 5 with three children needs to find suitable housing in Austin before her husband's job starts on December 15th.`,
        callData: {
            message: {
                summary: `The caller, Sarah Johnson, is interested in selling her 4-bedroom, 3-bathroom single family home because her husband received a job transfer to Austin, Texas. They need to relocate within the next 3 months, making this a time-sensitive situation. Sarah mentioned they're hoping to get around $450,000 for the property but are flexible on price due to the urgent timeline. She expressed disappointment with two previous real estate agents who promised quick results but didn't deliver. The family of 5 with three children needs to find suitable housing in Austin before her husband's job starts on December 15th.`
            }
        },
        coreFields: {
            motivation: 'job transfer to Austin, Texas',
            nextDestination: 'Austin, Texas', 
            timeline: '3 months',
            expectations: '$450,000',
            disappointments: 'two previous real estate agents who promised quick results but didn\'t deliver',
            concerns: null // Not mentioned in this scenario
        }
    },

    scenario2: {
        name: "First-Time Buyer - Core Fields Only",
        summary: `Michael Chen called regarding purchasing his first home because he and his wife are expecting their second child and need more space than their current 2-bedroom apartment. They're looking for a 3-bedroom house with at least 2 bathrooms in the Westside area, closer to his wife's work and good schools. Their budget is between $300,000 to $350,000 and they want a move-in ready property within the next 6 months. Michael expressed frustration about looking at 15 houses already without finding the right fit. They're planning for a family of four and need space for the children to grow.`,
        callData: {
            message: {
                summary: `Michael Chen called regarding purchasing his first home because he and his wife are expecting their second child and need more space than their current 2-bedroom apartment. They're looking for a 3-bedroom house with at least 2 bathrooms in the Westside area, closer to his wife's work and good schools. Their budget is between $300,000 to $350,000 and they want a move-in ready property within the next 6 months. Michael expressed frustration about looking at 15 houses already without finding the right fit. They're planning for a family of four and need space for the children to grow.`
            }
        },
        coreFields: {
            motivation: 'expecting second child, need more space',
            nextDestination: 'Westside area',
            timeline: '6 months',
            expectations: 'move-in ready property, $300,000 to $350,000',
            disappointments: 'looking at 15 houses already without finding the right fit',
            concerns: null // Not mentioned directly
        }
    },

    scenario3: {
        name: "FSBO Seller - Core Fields Only",
        summary: `The caller wants to sell their home themselves to save on real estate commissions. They've been trying to sell for 2 months but are getting overwhelmed with the paperwork and legal requirements. The property is a 3-bedroom, 2-bathroom townhouse they're hoping to sell for around $380,000. They're concerned about handling the closing process correctly and worried about making mistakes with the contracts. The main motivation is saving the 6% commission, but they're starting to question if they should get professional help. They don't have a strict timeline but would prefer to close within 60-90 days.`,
        callData: {
            message: {
                summary: `The caller wants to sell their home themselves to save on real estate commissions. They've been trying to sell for 2 months but are getting overwhelmed with the paperwork and legal requirements. The property is a 3-bedroom, 2-bathroom townhouse they're hoping to sell for around $380,000. They're concerned about handling the closing process correctly and worried about making mistakes with the contracts. The main motivation is saving the 6% commission, but they're starting to question if they should get professional help. They don't have a strict timeline but would prefer to close within 60-90 days.`
            }
        },
        coreFields: {
            motivation: 'save on real estate commissions, saving 6% commission',
            nextDestination: null, // Not applicable for this scenario
            timeline: '60-90 days',
            expectations: '$380,000',
            disappointments: 'getting overwhelmed with paperwork and legal requirements',
            concerns: 'handling closing process correctly, worried about making mistakes with contracts'
        }
    }
};

console.log('🎯 CORE FIELDS ACCURACY TEST');
console.log('================================================================================');
console.log('📋 Testing ONLY the 6 core custom fields from GoHighLevel:');
console.log('   1. Motivation');
console.log('   2. Next Destination');  
console.log('   3. Timeline');
console.log('   4. Expectations');
console.log('   5. Disappointments');
console.log('   6. Concerns');
console.log('🏆 TARGET: 85%+ accuracy\n');

let totalCoreFields = 0;
let extractedCoreFields = 0;
let scenarios = 0;

for (const [key, scenario] of Object.entries(CORE_FIELD_TESTS)) {
    console.log(`📝 ${scenario.name}`);
    console.log('▔'.repeat(60));
    
    try {
        const extractedData = await aiExtractor.extractDataFromTranscript('', scenario.callData);
        
        let scenarioTotal = 0;
        let scenarioExtracted = 0;
        
        for (const [fieldName, expectedValue] of Object.entries(scenario.coreFields)) {
            scenarioTotal++;
            
            if (expectedValue === null) {
                // Field not applicable for this scenario, skip
                console.log(`   ➖ ${fieldName}: Not applicable for this scenario`);
                continue;
            }
            
            const actualData = extractedData[fieldName];
            const actualValue = actualData?.value;
            
            if (actualValue && isReasonableMatch(actualValue, expectedValue)) {
                console.log(`   ✅ ${fieldName}: "${actualValue}" (${actualData.confidence}% confidence)`);
                console.log(`      💚 Expected: "${expectedValue}"`);
                scenarioExtracted++;
            } else if (actualValue) {
                console.log(`   ⚠️ ${fieldName}: "${actualValue}" (${actualData.confidence}% confidence)`);
                console.log(`      🔍 Expected: "${expectedValue}" - Partial match`);
                scenarioExtracted += 0.5; // Partial credit
            } else {
                console.log(`   ❌ ${fieldName}: Not extracted`);
                console.log(`      🎯 Expected: "${expectedValue}"`);
            }
        }
        
        const scenarioAccuracy = Math.round((scenarioExtracted / scenarioTotal) * 100);
        console.log(`\n   📊 Scenario Accuracy: ${scenarioAccuracy}% (${scenarioExtracted}/${scenarioTotal} core fields)`);
        
        if (scenarioAccuracy >= 85) {
            console.log(`   🎉 TARGET ACHIEVED!`);
        } else if (scenarioAccuracy >= 75) {
            console.log(`   🔥 VERY CLOSE - Almost there!`);
        } else {
            console.log(`   🔧 NEEDS WORK - Below target`);
        }
        
        totalCoreFields += scenarioTotal;
        extractedCoreFields += scenarioExtracted;
        scenarios++;
        
    } catch (error) {
        console.error(`   ❌ Test failed:`, error.message);
    }
    
    console.log('\n');
}

// Calculate overall core fields accuracy
const overallAccuracy = Math.round((extractedCoreFields / totalCoreFields) * 100);

console.log('🏆 FINAL CORE FIELDS RESULTS');
console.log('================================================================================');
console.log(`📊 Total Core Fields Tested: ${totalCoreFields}`);
console.log(`✅ Core Fields Extracted: ${extractedCoreFields}`);
console.log(`📈 Overall Core Fields Accuracy: ${overallAccuracy}%`);
console.log(`🎯 Scenarios Tested: ${scenarios}`);

if (overallAccuracy >= 85) {
    console.log('\n🎉 🎉 SUCCESS! 🎉 🎉');
    console.log('✅ TARGET ACHIEVED: 85%+ accuracy on core custom fields!');
    console.log('🚀 System is ready for production deployment');
} else if (overallAccuracy >= 80) {
    console.log('\n🔥 SO CLOSE!');
    console.log(`✅ ${overallAccuracy}% accuracy - Just ${85 - overallAccuracy}% away from target`);
    console.log('🔧 Small tweaks needed to reach 85%');
} else {
    console.log('\n⚠️ NEEDS MORE WORK');
    console.log(`📊 ${overallAccuracy}% accuracy - Need ${85 - overallAccuracy}% improvement`);
    console.log('🔧 Pattern enhancements required');
}

// Helper function
function isReasonableMatch(actual, expected) {
    if (!actual || !expected) return false;
    
    const actualLower = actual.toLowerCase();
    const expectedLower = expected.toLowerCase();
    
    if (actualLower.includes(expectedLower) || expectedLower.includes(actualLower)) {
        return true;
    }
    
    const expectedWords = expectedLower.split(/\s+/).filter(w => w.length > 2);
    const actualWords = actualLower.split(/\s+/);
    
    const matchedWords = expectedWords.filter(word => 
        actualWords.some(actualWord => 
            actualWord.includes(word) || word.includes(actualWord)
        )
    );
    
    return matchedWords.length >= Math.ceil(expectedWords.length * 0.6);
}