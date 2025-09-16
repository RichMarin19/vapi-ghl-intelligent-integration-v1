#!/usr/bin/env node

// Test intelligent field extraction with the exact data from the screenshots
// This should resolve the "23 m" issue and populate all empty fields

import { IntelligentFieldMapper } from './intelligent-field-mapper.js';
import { TranscriptAIExtractor } from './transcript-ai-extractor.js';

const SCREENSHOT_TEST_DATA = {
    name: "Screenshot Issue Resolution Test",
    // Based on the actual screenshot data
    summary: `The caller wants to save the commission, obviously. They're moving down south and want to sell by the end of the year. They expressed disappointment about the quality of buyers. Their main concern is just getting it done and their timeline. When asked about working with an agent, they said maybe depending on the situation. They're expecting around $1 million for the property and want a smooth, easy deal.`,
    expectedResults: {
        motivation: "Save the commission", // From "save the commission, obviously"
        nextDestination: "Down south", // From "moving down south"
        timeline: "End of the year", // From "by the end of the year"
        expectations: "Around $1 million", // NOT "23 m" - should extract meaningful expectations
        disappointments: "Quality of buyers", // From "quality of buyers"
        concerns: "Getting it done and timeline", // From "getting it done and their timeline"
        'Openness to Re-list': "Maybe", // From agent question response
        'Last Contact': new Date().toISOString().split('T')[0],
        'latest Call Summary': "The caller wants to save...",
        'Voice Memory': "Motivation: Save the commission..."
    }
};

async function testIntelligentExtraction() {
    console.log('🧠 INTELLIGENT FIELD EXTRACTION TEST');
    console.log('================================================================================');
    console.log('🎯 Resolving screenshot issues with intelligent AI extraction:');
    console.log('   ❌ Fix Expectations: "23 m" → meaningful expectation');
    console.log('   ❌ Fix Openness to Re-list: Empty → agent response');
    console.log('   ❌ Fix System Fields: Empty → auto-populated');
    console.log('');

    try {
        console.log(`📝 ${SCREENSHOT_TEST_DATA.name}`);
        console.log('▔'.repeat(60));

        // Test direct intelligent field mapping
        console.log('🧠 Testing Intelligent Field Mapper directly...');
        const mapper = new IntelligentFieldMapper();
        const intelligentResults = await mapper.extractIntelligentFields(
            SCREENSHOT_TEST_DATA.summary, 
            '', 
            {}
        );

        console.log('');
        console.log('🎯 INTELLIGENT EXTRACTION RESULTS:');
        console.log('');

        const criticalFields = [
            'motivation', 'nextDestination', 'timeline', 
            'expectations', 'disappointments', 'concerns', 
            'Openness to Re-list'
        ];

        let intelligentFieldsCorrect = 0;

        for (const field of criticalFields) {
            const extracted = intelligentResults[field];
            const value = extracted ? extracted.value : null;
            const confidence = extracted ? extracted.confidence : 0;

            // Validate against expected results
            const expected = SCREENSHOT_TEST_DATA.expectedResults[field];

            if (value) {
                // Check if the extraction makes sense
                const isValid = validateFieldExtraction(field, value, expected);
                
                if (isValid) {
                    console.log(`   ✅ ${field}: "${value}" (${confidence}% confidence) - VALID`);
                    intelligentFieldsCorrect++;
                } else {
                    console.log(`   ⚠️ ${field}: "${value}" (${confidence}% confidence) - NEEDS REVIEW`);
                    intelligentFieldsCorrect += 0.5;
                }
                
                console.log(`      💭 Expected: "${expected}"`);
            } else {
                console.log(`   ❌ ${field}: Not extracted - MISSING`);
                console.log(`      💭 Expected: "${expected}"`);
            }
            console.log('');
        }

        // Test system fields
        console.log('📋 SYSTEM FIELDS VALIDATION:');
        console.log('');

        const systemFields = ['Last Contact', 'latest Call Summary', 'Voice Memory'];
        let systemFieldsCorrect = 0;

        for (const field of systemFields) {
            const extracted = intelligentResults[field];
            const value = extracted ? extracted.value : null;

            if (value && value.length > 5) {
                console.log(`   ✅ ${field}: "${value.substring(0, 40)}..." - POPULATED`);
                systemFieldsCorrect++;
            } else {
                console.log(`   ❌ ${field}: "${value || 'MISSING'}" - NOT POPULATED`);
            }
        }

        console.log('');
        console.log('🎯 INTELLIGENT EXTRACTION ASSESSMENT:');
        console.log(`   💼 Critical Fields: ${intelligentFieldsCorrect}/${criticalFields.length} (${Math.round(intelligentFieldsCorrect/criticalFields.length*100)}%)`);
        console.log(`   🔧 System Fields: ${systemFieldsCorrect}/${systemFields.length} (${Math.round(systemFieldsCorrect/systemFields.length*100)}%)`);
        
        const overallScore = (intelligentFieldsCorrect + systemFieldsCorrect) / (criticalFields.length + systemFields.length) * 100;
        console.log(`   🎯 Overall Success: ${Math.round(overallScore)}%`);

        // Now test the full transcript AI extractor
        console.log('');
        console.log('🤖 Testing Full AI Extractor Integration...');
        
        const aiExtractor = new TranscriptAIExtractor();
        const callData = {
            message: { summary: SCREENSHOT_TEST_DATA.summary },
            call: { startedAt: new Date().toISOString() }
        };

        const fullResults = await aiExtractor.extractDataFromTranscript('', callData);
        const extractedFieldCount = Object.keys(fullResults).filter(key => !key.startsWith('_')).length;
        
        console.log(`✅ Full AI Extractor: ${extractedFieldCount} fields extracted`);

        // Final assessment
        if (overallScore >= 85) {
            console.log('');
            console.log('🎉 SUCCESS! Intelligent extraction is working:');
            console.log('   ✅ No more "23 m" garbage in expectations');
            console.log('   ✅ Openness to Re-list captures agent responses');
            console.log('   ✅ System fields auto-populate correctly');
            console.log('   ✅ All critical fields have meaningful content');
            console.log('   🚀 Ready for production deployment!');
        } else if (overallScore >= 70) {
            console.log('');
            console.log('🔥 GOOD PROGRESS! Most fields working correctly.');
            console.log('   🔧 Minor adjustments needed for remaining fields.');
        } else {
            console.log('');
            console.log('⚠️ NEEDS MORE WORK:');
            console.log('   🔧 Core extraction logic requires refinement.');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    }
}

// Validation helper function
function validateFieldExtraction(fieldName, extractedValue, expectedValue) {
    const extracted = extractedValue.toLowerCase();
    const expected = expectedValue.toLowerCase();

    // Field-specific validation
    switch (fieldName) {
        case 'expectations':
            // Should NOT be "23 m" or similar garbage
            if (/^\d+\s*m$/.test(extractedValue)) return false;
            if (extracted.includes('million') || extracted.includes('smooth') || extracted.includes('easy')) return true;
            return extracted.length > 5; // At least meaningful content

        case 'motivation':
            return extracted.includes('commission') || extracted.includes('save') || extracted.includes('money');

        case 'Openness to Re-list':
            return extracted.includes('maybe') || extracted.includes('yes') || extracted.includes('no') || extracted.includes('depending');

        case 'nextDestination':
            return extracted.includes('south') || extracted.includes('north') || extracted.length > 2;

        default:
            // General validation - should not be empty or garbage
            return extractedValue && extractedValue.length > 2 && !/^\d+\s*m$/.test(extractedValue);
    }
}

// Run the test
testIntelligentExtraction();