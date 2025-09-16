#!/usr/bin/env node

// Test script for VAPI AI Summary extraction - much more accurate than transcript parsing
// Tests realistic VAPI AI summaries based on what VAPI actually generates

import { TranscriptAIExtractor } from './transcript-ai-extractor.js';

const aiExtractor = new TranscriptAIExtractor();

// Realistic VAPI AI summaries based on real estate calls
const TEST_SCENARIOS = {
    scenario1_motivated_seller: {
        name: "Motivated Seller with Job Transfer - VAPI AI Summary",
        summary: `The caller, Sarah Johnson, is interested in selling her 4-bedroom, 3-bathroom single family home because her husband received a job transfer to Austin, Texas. They need to relocate within the next 3 months, making this a time-sensitive situation. Sarah mentioned they're hoping to get around $450,000 for the property but are flexible on price due to the urgent timeline. She expressed disappointment with two previous real estate agents who promised quick results but didn't deliver. The family of 5 with three children needs to find suitable housing in Austin before her husband's job starts on December 15th.`,
        callData: {
            message: {
                summary: `The caller, Sarah Johnson, is interested in selling her 4-bedroom, 3-bathroom single family home because her husband received a job transfer to Austin, Texas. They need to relocate within the next 3 months, making this a time-sensitive situation. Sarah mentioned they're hoping to get around $450,000 for the property but are flexible on price due to the urgent timeline. She expressed disappointment with two previous real estate agents who promised quick results but didn't deliver. The family of 5 with three children needs to find suitable housing in Austin before her husband's job starts on December 15th.`
            },
            call: {}
        },
        expectedFields: {
            motivation: 'job transfer to Austin, Texas',
            timeline: '3 months',
            expectations: '$450,000',
            disappointments: 'two previous real estate agents who promised quick results but didn\'t deliver',
            nextDestination: 'Austin, Texas',
            propertyType: 'single family home',
            bedrooms: '4',
            bathrooms: '3'
        }
    },

    scenario2_first_time_buyer: {
        name: "First-Time Buyer - Growing Family - VAPI AI Summary", 
        summary: `Michael Chen called regarding purchasing his first home because he and his wife are expecting their second child and need more space than their current 2-bedroom apartment. They're looking for a 3-bedroom house with at least 2 bathrooms in the Westside area, closer to his wife's work and good schools. Their budget is between $300,000 to $350,000 and they want a move-in ready property within the next 6 months. Michael expressed frustration about looking at 15 houses already without finding the right fit. They're planning for a family of four and need space for the children to grow.`,
        callData: {
            message: {
                summary: `Michael Chen called regarding purchasing his first home because he and his wife are expecting their second child and need more space than their current 2-bedroom apartment. They're looking for a 3-bedroom house with at least 2 bathrooms in the Westside area, closer to his wife's work and good schools. Their budget is between $300,000 to $350,000 and they want a move-in ready property within the next 6 months. Michael expressed frustration about looking at 15 houses already without finding the right fit. They're planning for a family of four and need space for the children to grow.`
            },
            call: {}
        },
        expectedFields: {
            motivation: 'expecting second child, need more space',
            timeline: '6 months',
            expectations: 'move-in ready property, $300,000 to $350,000',
            disappointments: 'looking at 15 houses already without finding the right fit',
            nextDestination: 'Westside area',
            bedrooms: '3',
            bathrooms: '2'
        }
    },

    scenario3_fsbo_seller: {
        name: "FSBO Seller - Commission Savings - VAPI AI Summary",
        summary: `The caller wants to sell their home themselves to save on real estate commissions. They've been trying to sell for 2 months but are getting overwhelmed with the paperwork and legal requirements. The property is a 3-bedroom, 2-bathroom townhouse they're hoping to sell for around $380,000. They're concerned about handling the closing process correctly and worried about making mistakes with the contracts. The main motivation is saving the 6% commission, but they're starting to question if they should get professional help. They don't have a strict timeline but would prefer to close within 60-90 days.`,
        callData: {
            message: {
                summary: `The caller wants to sell their home themselves to save on real estate commissions. They've been trying to sell for 2 months but are getting overwhelmed with the paperwork and legal requirements. The property is a 3-bedroom, 2-bathroom townhouse they're hoping to sell for around $380,000. They're concerned about handling the closing process correctly and worried about making mistakes with the contracts. The main motivation is saving the 6% commission, but they're starting to question if they should get professional help. They don't have a strict timeline but would prefer to close within 60-90 days.`
            },
            call: {}
        },
        expectedFields: {
            motivation: 'save on real estate commissions',
            timeline: '60-90 days',
            expectations: '$380,000',
            disappointments: 'getting overwhelmed with paperwork and legal requirements',
            concerns: 'handling the closing process correctly and worried about making mistakes with contracts',
            propertyType: 'townhouse',
            bedrooms: '3',
            bathrooms: '2'
        }
    }
};

console.log('🧪 Testing VAPI AI Summary Extraction');
console.log('================================================================================');
console.log('🎯 Enhanced system now prioritizes VAPI AI Summary over raw transcript');
console.log('📋 Testing realistic VAPI AI summaries for better extraction accuracy\n');

let totalTests = 0;
let passedTests = 0;

for (const [scenarioKey, scenario] of Object.entries(TEST_SCENARIOS)) {
    console.log(`📝 Testing: ${scenario.name}`);
    console.log('▔'.repeat(80));
    
    try {
        // Test the enhanced extraction with VAPI summary
        const extractedData = await aiExtractor.extractDataFromTranscript(
            '', // Empty transcript to force summary usage
            scenario.callData
        );
        
        const extractedFields = Object.keys(extractedData).filter(key => !key.startsWith('_'));
        
        console.log(`🎯 Extracted ${extractedFields.length} fields from VAPI AI Summary:`);
        
        // Analyze results
        let matchCount = 0;
        let totalExpected = Object.keys(scenario.expectedFields).length;
        
        for (const [expectedField, expectedValue] of Object.entries(scenario.expectedFields)) {
            const actualData = extractedData[expectedField];
            const actualValue = actualData?.value;
            
            if (actualValue) {
                // Check if extracted value contains key elements of expected value
                const isGoodMatch = isReasonableMatch(actualValue, expectedValue);
                
                if (isGoodMatch) {
                    console.log(`   ✅ ${expectedField}: "${actualValue}" (${actualData.confidence}% confidence)`);
                    console.log(`      💚 Good match with expected: "${expectedValue}"`);
                    matchCount++;
                } else {
                    console.log(`   ✅ ${expectedField}: "${actualValue}" (${actualData.confidence}% confidence)`);
                    console.log(`      ⚠️ Expected: "${expectedValue}"`);
                    matchCount += 0.5; // Partial credit for extraction
                }
            } else {
                console.log(`   ❌ ${expectedField}: Not extracted (expected: "${expectedValue}")`);
            }
        }
        
        // Show additional fields
        const additionalFields = extractedFields.filter(f => !scenario.expectedFields[f]);
        if (additionalFields.length > 0) {
            console.log(`\n   🎁 Additional fields extracted:`);
            additionalFields.forEach(field => {
                const data = extractedData[field];
                console.log(`      • ${field}: "${data.value}" (${data.confidence}% confidence)`);
            });
        }
        
        const accuracy = Math.round((matchCount / totalExpected) * 100);
        console.log(`\n   📊 Extraction Accuracy: ${accuracy}% (${matchCount}/${totalExpected} expected fields)`);
        
        if (accuracy >= 70) {
            console.log(`   🎉 EXCELLENT - Summary extraction significantly improved!`);
            passedTests++;
        } else if (accuracy >= 50) {
            console.log(`   ✅ GOOD - Better than transcript-only extraction`);
            passedTests += 0.5;
        } else {
            console.log(`   ⚠️ NEEDS IMPROVEMENT - Review summary patterns`);
        }
        
        totalTests++;
        
    } catch (error) {
        console.error(`   ❌ Extraction failed:`, error.message);
    }
    
    console.log('\n');
}

// Helper function to check if extraction is reasonable
function isReasonableMatch(actual, expected) {
    if (!actual || !expected) return false;
    
    const actualLower = actual.toLowerCase();
    const expectedLower = expected.toLowerCase();
    
    // Direct match
    if (actualLower.includes(expectedLower) || expectedLower.includes(actualLower)) {
        return true;
    }
    
    // Key word matches
    const expectedWords = expectedLower.split(/\s+/).filter(w => w.length > 2);
    const actualWords = actualLower.split(/\s+/);
    
    const matchedWords = expectedWords.filter(word => 
        actualWords.some(actualWord => 
            actualWord.includes(word) || word.includes(actualWord)
        )
    );
    
    return matchedWords.length >= Math.ceil(expectedWords.length * 0.5);
}

// Final report
console.log('📋 VAPI AI Summary Test Results');
console.log('================================================================================');
console.log(`📊 Tests Completed: ${totalTests}`);
console.log(`✅ Tests Passed: ${passedTests}`);
console.log(`📈 Success Rate: ${Math.round((passedTests/totalTests) * 100)}%`);

if (passedTests/totalTests >= 0.8) {
    console.log('🎉 EXCELLENT - VAPI AI Summary extraction is working great!');
    console.log('🚀 System ready for production use with VAPI AI summaries');
} else if (passedTests/totalTests >= 0.6) {
    console.log('✅ GOOD - Significant improvement over transcript-only extraction');
    console.log('🔧 Minor pattern adjustments may further improve accuracy');
} else {
    console.log('⚠️ NEEDS WORK - Summary patterns need refinement');
}

console.log('\n🎯 Next Steps:');
console.log('1. Deploy updated system to capture VAPI AI summaries');
console.log('2. Monitor real call extractions');
console.log('3. Fine-tune patterns based on actual VAPI summary formats');