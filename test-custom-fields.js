#!/usr/bin/env node

// Comprehensive test script for custom fields AI extraction and updates
// Tests real estate scenarios and GoHighLevel V2 API integration

import { CustomFieldsManager } from './custom-fields-manager.js';
import { TranscriptAIExtractor } from './transcript-ai-extractor.js';
import { CustomFieldsFetcher } from './get-custom-fields.js';

// Test scenarios with realistic real estate call transcripts
const TEST_SCENARIOS = {
    scenario1_seller: {
        name: "Motivated Seller - Family Relocation",
        transcript: `
            Hello, my name is Sarah Johnson and I'm calling about selling my house. 
            We need to sell because my husband got a job transfer to Austin, Texas and we need to relocate within the next 3 months. 
            It's a 4 bedroom, 3 bathroom single family home that we've lived in for 8 years.
            We're hoping to get around $450,000 for it, but we're flexible on price because we need to move quickly.
            The disappointing thing is that we've had two other real estate agents who promised quick results but didn't deliver.
            We're a family of 5 with three kids, so we need to find something in Austin that has at least 4 bedrooms.
            We're expecting to close on something by December 15th because that's when my husband starts his new job.
            This is pretty urgent for us - we can't wait much longer to get this process started.
        `,
        expectedExtractions: {
            motivation: "job transfer to Austin, Texas",
            nextDestination: "Austin, Texas", 
            timeline: "within the next 3 months",
            expectations: "get around $450,000",
            disappointments: "two other real estate agents who promised quick results but didn't deliver",
            propertyType: "single family home",
            bedrooms: "4",
            bathrooms: "3",
            familySize: "family of 5 with three kids",
            urgency: "urgent"
        }
    },
    
    scenario2_buyer: {
        name: "First-Time Buyer - Growing Family",
        transcript: `
            Hi there, I'm Michael Chen and I'm interested in buying my first home. 
            My wife and I are expecting our second child, so we need more space than our current 2-bedroom apartment.
            We're looking for something in the $300,000 to $350,000 price range, preferably a 3 bedroom house with at least 2 bathrooms.
            We want to move to the Westside area because that's closer to my wife's work and has good schools.
            We're hoping to find something within the next 6 months, but we're not in a huge rush.
            The main thing we're looking for is a house that's move-in ready - we don't want to do major renovations with a new baby coming.
            We've been frustrated because we've looked at 15 houses already and none of them felt right.
            It's just the two of us now, but we'll be four people soon, so we need to think about space for the kids to grow.
        `,
        expectedExtractions: {
            motivation: "expecting second child, need more space",
            nextDestination: "Westside area",
            timeline: "within the next 6 months", 
            expectations: "move-in ready house, good schools",
            disappointments: "looked at 15 houses already and none of them felt right",
            propertyType: "house",
            priceRange: "$300,000 to $350,000",
            bedrooms: "3",
            bathrooms: "2",
            currentSituation: "2-bedroom apartment",
            familySize: "two of us now, but we'll be four people soon",
            urgency: "medium"
        }
    },

    scenario3_investor: {
        name: "Real Estate Investor - Multi-Property Purchase",
        transcript: `
            This is David Rodriguez calling about investment opportunities in your market.
            I'm looking to purchase multiple rental properties, ideally 2-3 single family homes or small multi-family properties.
            My budget is between $200,000 to $275,000 per property, and I'm looking for properties that need minimal work.
            I want to be in areas with good rental demand, preferably near universities or growing employment centers.
            My timeline is flexible - I can close within 30-45 days if we find the right properties.
            What I'm really looking for is cash flow positive properties that will generate at least $300-400 per month after expenses.
            I've been disappointed with other agents who keep showing me properties that need too much renovation work.
            I'm an experienced investor with 12 other rental properties, so I know what works and what doesn't.
        `,
        expectedExtractions: {
            motivation: "investment opportunities, generate cash flow",
            nextDestination: "near universities or growing employment centers",
            timeline: "30-45 days",
            expectations: "cash flow positive properties, $300-400 per month after expenses",
            disappointments: "agents showing properties that need too much renovation work", 
            propertyType: "single family homes or small multi-family",
            priceRange: "$200,000 to $275,000 per property",
            currentSituation: "experienced investor with 12 other rental properties"
        }
    }
};

class CustomFieldsTestSuite {
    constructor() {
        this.customFieldsManager = new CustomFieldsManager();
        this.aiExtractor = new TranscriptAIExtractor();
        this.customFieldsFetcher = new CustomFieldsFetcher();
        this.testResults = [];
    }

    // Run all tests
    async runAllTests() {
        console.log('🧪 Starting Custom Fields Test Suite');
        console.log('=' .repeat(80));
        console.log('');

        try {
            // Test 1: System Initialization
            await this.testSystemInitialization();
            
            // Test 2: Custom Fields Retrieval
            await this.testCustomFieldsRetrieval();
            
            // Test 3: AI Extraction Tests
            await this.testAIExtraction();
            
            // Test 4: End-to-End Processing (if contact ID provided)
            const testContactId = process.env.TEST_CONTACT_ID || process.argv[2];
            if (testContactId) {
                await this.testEndToEndProcessing(testContactId);
            } else {
                console.log('ℹ️ Skipping end-to-end test (no TEST_CONTACT_ID provided)');
                console.log('💡 To test with actual GoHighLevel updates, set TEST_CONTACT_ID environment variable');
            }
            
            // Generate final report
            this.generateTestReport();
            
        } catch (error) {
            console.error('💥 Test suite failed:', error.message);
            throw error;
        }
    }

    // Test system initialization
    async testSystemInitialization() {
        console.log('🔧 Test 1: System Initialization');
        console.log('-' .repeat(50));
        
        try {
            const initialized = await this.customFieldsManager.initialize();
            
            if (initialized) {
                console.log('✅ Custom Fields Manager initialized successfully');
                this.testResults.push({
                    test: 'System Initialization',
                    status: 'PASS',
                    message: 'Custom Fields Manager initialized'
                });
            } else {
                throw new Error('Failed to initialize Custom Fields Manager');
            }
            
        } catch (error) {
            console.error('❌ System initialization failed:', error.message);
            this.testResults.push({
                test: 'System Initialization',
                status: 'FAIL',
                message: error.message
            });
            throw error;
        }
        
        console.log('');
    }

    // Test custom fields retrieval
    async testCustomFieldsRetrieval() {
        console.log('📋 Test 2: Custom Fields Retrieval');
        console.log('-' .repeat(50));
        
        try {
            const result = await this.customFieldsFetcher.fetchAndAnalyzeFields();
            
            if (result && result.customFields && result.customFields.length > 0) {
                console.log(`✅ Retrieved ${result.customFields.length} custom fields from GoHighLevel`);
                console.log(`🔗 Generated ${result.mapping.length} field mappings`);
                
                // Show sample mappings
                const sampleMappings = result.mapping.slice(0, 5);
                console.log('\n📊 Sample Field Mappings:');
                sampleMappings.forEach(mapping => {
                    console.log(`   • ${mapping.fieldName} (${mapping.dataType}) -> ${mapping.fieldId}`);
                });
                
                this.testResults.push({
                    test: 'Custom Fields Retrieval',
                    status: 'PASS',
                    message: `Retrieved ${result.customFields.length} fields`
                });
            } else {
                throw new Error('No custom fields retrieved');
            }
            
        } catch (error) {
            console.error('❌ Custom fields retrieval failed:', error.message);
            this.testResults.push({
                test: 'Custom Fields Retrieval',
                status: 'FAIL',
                message: error.message
            });
        }
        
        console.log('');
    }

    // Test AI extraction on different scenarios
    async testAIExtraction() {
        console.log('🤖 Test 3: AI Extraction Testing');
        console.log('-' .repeat(50));
        
        for (const [scenarioKey, scenario] of Object.entries(TEST_SCENARIOS)) {
            console.log(`\n📝 Testing: ${scenario.name}`);
            console.log('▔'.repeat(40));
            
            try {
                // Extract data using AI
                const extractedData = await this.aiExtractor.extractDataFromTranscript(scenario.transcript);
                const extractedFields = Object.keys(extractedData).filter(key => !key.startsWith('_'));
                
                console.log(`🎯 Extracted ${extractedFields.length} fields:`);
                
                // Compare with expected extractions
                let matchCount = 0;
                let totalExpected = Object.keys(scenario.expectedExtractions).length;
                
                for (const [expectedField, expectedValue] of Object.entries(scenario.expectedExtractions)) {
                    const actualValue = extractedData[expectedField]?.value;
                    const confidence = extractedData[expectedField]?.confidence || 0;
                    
                    if (actualValue) {
                        matchCount++;
                        console.log(`   ✅ ${expectedField}: "${actualValue}" (${confidence}% confidence)`);
                        
                        // Check if extraction is reasonable (not requiring exact match)
                        if (this.isReasonableExtraction(actualValue, expectedValue)) {
                            console.log(`      💚 Good match with expected: "${expectedValue}"`);
                        } else {
                            console.log(`      ⚠️ Expected: "${expectedValue}"`);
                        }
                    } else {
                        console.log(`   ❌ ${expectedField}: Not extracted (expected: "${expectedValue}")`);
                    }
                }
                
                // Show additional extracted fields not in expected list
                const additionalFields = extractedFields.filter(field => 
                    !scenario.expectedExtractions.hasOwnProperty(field)
                );
                
                if (additionalFields.length > 0) {
                    console.log(`\n   🎁 Additional fields extracted:`);
                    additionalFields.forEach(field => {
                        const value = extractedData[field]?.value;
                        const confidence = extractedData[field]?.confidence || 0;
                        console.log(`      • ${field}: "${value}" (${confidence}% confidence)`);
                    });
                }
                
                const accuracy = Math.round((matchCount / totalExpected) * 100);
                console.log(`\n   📊 Extraction Accuracy: ${accuracy}% (${matchCount}/${totalExpected} expected fields)`);
                
                this.testResults.push({
                    test: `AI Extraction - ${scenario.name}`,
                    status: accuracy >= 60 ? 'PASS' : 'PARTIAL',
                    message: `${accuracy}% accuracy (${matchCount}/${totalExpected} fields)`,
                    details: {
                        extractedCount: extractedFields.length,
                        expectedCount: totalExpected,
                        matchCount: matchCount,
                        accuracy: accuracy
                    }
                });
                
            } catch (error) {
                console.error(`❌ AI extraction failed for ${scenario.name}:`, error.message);
                this.testResults.push({
                    test: `AI Extraction - ${scenario.name}`,
                    status: 'FAIL', 
                    message: error.message
                });
            }
        }
        
        console.log('');
    }

    // Test end-to-end processing with actual GoHighLevel updates
    async testEndToEndProcessing(contactId) {
        console.log('🚀 Test 4: End-to-End Processing');
        console.log('-' .repeat(50));
        console.log(`👤 Using test contact ID: ${contactId}`);
        
        // Use the first test scenario for end-to-end testing
        const testScenario = TEST_SCENARIOS.scenario1_seller;
        
        try {
            // Create mock VAPI call data
            const mockCallData = {
                call: {
                    id: 'test-call-e2e-' + Date.now(),
                    transcript: testScenario.transcript,
                    customer: {
                        number: '+15551234567'
                    },
                    startedAt: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
                    endedAt: new Date().toISOString()
                },
                message: {
                    type: 'end-of-call-report'
                }
            };
            
            console.log('📞 Processing mock VAPI call...');
            
            // Process the call through the custom fields manager
            const result = await this.customFieldsManager.processVAPICall(mockCallData, contactId);
            
            if (result.success) {
                console.log(`✅ End-to-end processing succeeded!`);
                console.log(`📊 Fields updated: ${result.fieldsUpdated}`);
                
                if (result.updatedFields && result.updatedFields.length > 0) {
                    console.log('\n📝 Fields successfully updated in GoHighLevel:');
                    result.updatedFields.forEach(field => {
                        console.log(`   • ${field.fieldName}: "${field.value}" (${field.confidence}% confidence)`);
                    });
                }
                
                if (result.warnings && result.warnings.length > 0) {
                    console.log('\n⚠️ Warnings during processing:');
                    result.warnings.forEach(warning => {
                        console.log(`   • ${warning}`);
                    });
                }
                
                this.testResults.push({
                    test: 'End-to-End Processing',
                    status: 'PASS',
                    message: `Successfully updated ${result.fieldsUpdated} fields`,
                    details: result
                });
                
            } else {
                console.log(`❌ End-to-end processing failed: ${result.message}`);
                this.testResults.push({
                    test: 'End-to-End Processing', 
                    status: 'FAIL',
                    message: result.message,
                    details: result
                });
            }
            
        } catch (error) {
            console.error('❌ End-to-end processing error:', error.message);
            this.testResults.push({
                test: 'End-to-End Processing',
                status: 'FAIL',
                message: error.message
            });
        }
        
        console.log('');
    }

    // Check if extraction is reasonable (fuzzy matching)
    isReasonableExtraction(actual, expected) {
        if (!actual || !expected) return false;
        
        const actualLower = actual.toLowerCase();
        const expectedLower = expected.toLowerCase();
        
        // Check for partial matches or key term inclusion
        const keyTerms = expectedLower.split(/[\s,.-]+/).filter(term => term.length > 2);
        const matchedTerms = keyTerms.filter(term => actualLower.includes(term));
        
        return matchedTerms.length > 0 || actualLower.includes(expectedLower) || expectedLower.includes(actualLower);
    }

    // Generate comprehensive test report
    generateTestReport() {
        console.log('📋 Final Test Report');
        console.log('=' .repeat(80));
        
        const passedTests = this.testResults.filter(result => result.status === 'PASS');
        const partialTests = this.testResults.filter(result => result.status === 'PARTIAL');
        const failedTests = this.testResults.filter(result => result.status === 'FAIL');
        
        console.log(`\n📊 Test Summary:`);
        console.log(`   ✅ Passed: ${passedTests.length}`);
        console.log(`   ⚠️ Partial: ${partialTests.length}`);
        console.log(`   ❌ Failed: ${failedTests.length}`);
        console.log(`   📈 Overall: ${this.testResults.length} tests executed`);
        
        if (failedTests.length > 0) {
            console.log(`\n❌ Failed Tests:`);
            failedTests.forEach(result => {
                console.log(`   • ${result.test}: ${result.message}`);
            });
        }
        
        if (partialTests.length > 0) {
            console.log(`\n⚠️ Partial Tests:`);
            partialTests.forEach(result => {
                console.log(`   • ${result.test}: ${result.message}`);
            });
        }
        
        console.log(`\n🎯 System Status: ${failedTests.length === 0 ? '✅ READY FOR PRODUCTION' : '⚠️ NEEDS ATTENTION'}`);
        
        if (failedTests.length === 0 && partialTests.length <= 1) {
            console.log(`\n🎉 Congratulations! The custom fields system is working properly.`);
            console.log(`🚀 Ready to process real VAPI calls and update GoHighLevel custom fields.`);
        } else {
            console.log(`\n🔧 Please review the failed/partial tests and make necessary adjustments.`);
        }
        
        console.log('');
    }
}

// Command line interface
async function main() {
    const testSuite = new CustomFieldsTestSuite();
    
    try {
        await testSuite.runAllTests();
        
    } catch (error) {
        console.error('\n💥 Test suite execution failed:', error.message);
        console.log('\n🔧 Troubleshooting Tips:');
        console.log('1. Ensure AWS credentials are configured correctly');
        console.log('2. Verify GoHighLevel PIT token is valid');
        console.log('3. Check that environment variables are set');
        console.log('4. Run: node pit-token-manager.js status');
        process.exit(1);
    }
}

// Export for module use
export default CustomFieldsTestSuite;
export { CustomFieldsTestSuite, TEST_SCENARIOS };

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}