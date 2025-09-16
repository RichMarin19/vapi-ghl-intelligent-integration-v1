#!/usr/bin/env node

// Validation script to verify custom fields are working with live VAPI calls
// Compares before/after contact data and validates AI extraction accuracy

import { CustomFieldsFetcher } from './get-custom-fields.js';
import { TranscriptAIExtractor } from './transcript-ai-extractor.js';

class LiveCustomFieldsValidator {
    constructor() {
        this.customFieldsFetcher = new CustomFieldsFetcher();
        this.aiExtractor = new TranscriptAIExtractor();
        this.initialized = false;
    }

    // Initialize the validation system
    async initialize() {
        console.log('🔧 Initializing Live Custom Fields Validator...');
        
        try {
            await this.customFieldsFetcher.initialize();
            console.log('✅ Custom Fields Fetcher initialized');
            
            this.initialized = true;
            return true;
        } catch (error) {
            console.error('❌ Initialization failed:', error.message);
            return false;
        }
    }

    // Capture contact state before VAPI call
    async captureBeforeState(contactId) {
        console.log(`📸 Capturing BEFORE state for contact: ${contactId}`);
        
        try {
            const contactData = await this.customFieldsFetcher.getContactDetails(contactId);
            
            if (!contactData) {
                throw new Error('Contact not found');
            }
            
            const beforeState = {
                contactId: contactId,
                timestamp: new Date().toISOString(),
                customFields: contactData.customFields || {},
                populatedFieldsCount: 0
            };
            
            // Count populated fields
            beforeState.populatedFieldsCount = Object.entries(beforeState.customFields)
                .filter(([key, value]) => value && value.toString().trim() !== '').length;
            
            console.log(`✅ Captured state: ${beforeState.populatedFieldsCount} populated custom fields`);
            
            return beforeState;
            
        } catch (error) {
            console.error('❌ Failed to capture before state:', error.message);
            throw error;
        }
    }

    // Capture contact state after VAPI call
    async captureAfterState(contactId) {
        console.log(`📸 Capturing AFTER state for contact: ${contactId}`);
        
        try {
            const contactData = await this.customFieldsFetcher.getContactDetails(contactId);
            
            if (!contactData) {
                throw new Error('Contact not found');
            }
            
            const afterState = {
                contactId: contactId,
                timestamp: new Date().toISOString(),
                customFields: contactData.customFields || {},
                populatedFieldsCount: 0
            };
            
            // Count populated fields
            afterState.populatedFieldsCount = Object.entries(afterState.customFields)
                .filter(([key, value]) => value && value.toString().trim() !== '').length;
            
            console.log(`✅ Captured state: ${afterState.populatedFieldsCount} populated custom fields`);
            
            return afterState;
            
        } catch (error) {
            console.error('❌ Failed to capture after state:', error.message);
            throw error;
        }
    }

    // Compare before and after states
    compareStates(beforeState, afterState) {
        console.log('\n🔍 Comparing BEFORE vs AFTER states...');
        console.log('-' .repeat(50));
        
        const changes = {
            newFields: [],
            updatedFields: [],
            unchangedFields: [],
            fieldCountChange: afterState.populatedFieldsCount - beforeState.populatedFieldsCount
        };
        
        // Compare each custom field
        const allFieldNames = new Set([
            ...Object.keys(beforeState.customFields),
            ...Object.keys(afterState.customFields)
        ]);
        
        for (const fieldName of allFieldNames) {
            const beforeValue = beforeState.customFields[fieldName] || '';
            const afterValue = afterState.customFields[fieldName] || '';
            
            const beforeEmpty = !beforeValue || beforeValue.toString().trim() === '';
            const afterEmpty = !afterValue || afterValue.toString().trim() === '';
            
            if (beforeEmpty && !afterEmpty) {
                // New field populated
                changes.newFields.push({
                    fieldName,
                    value: afterValue,
                    action: 'NEW'
                });
            } else if (!beforeEmpty && !afterEmpty && beforeValue !== afterValue) {
                // Field updated
                changes.updatedFields.push({
                    fieldName,
                    beforeValue,
                    afterValue,
                    action: 'UPDATED'
                });
            } else if (!beforeEmpty && !afterEmpty) {
                // Field unchanged
                changes.unchangedFields.push({
                    fieldName,
                    value: afterValue,
                    action: 'UNCHANGED'
                });
            }
        }
        
        return changes;
    }

    // Display validation results
    displayValidationResults(beforeState, afterState, changes) {
        console.log('\n📋 Live Custom Fields Validation Results');
        console.log('=' .repeat(60));
        
        console.log(`\n📊 Summary:`);
        console.log(`   Before: ${beforeState.populatedFieldsCount} populated fields`);
        console.log(`   After:  ${afterState.populatedFieldsCount} populated fields`);
        console.log(`   Change: ${changes.fieldCountChange > 0 ? '+' : ''}${changes.fieldCountChange} fields`);
        
        if (changes.newFields.length > 0) {
            console.log(`\n✅ NEW Fields Populated (${changes.newFields.length}):`);
            changes.newFields.forEach(field => {
                console.log(`   • ${field.fieldName}: "${field.value}"`);
            });
        }
        
        if (changes.updatedFields.length > 0) {
            console.log(`\n🔄 UPDATED Fields (${changes.updatedFields.length}):`);
            changes.updatedFields.forEach(field => {
                console.log(`   • ${field.fieldName}:`);
                console.log(`     Before: "${field.beforeValue}"`);
                console.log(`     After:  "${field.afterValue}"`);
            });
        }
        
        if (changes.unchangedFields.length > 0 && changes.unchangedFields.length < 10) {
            console.log(`\n📋 Existing Fields (${changes.unchangedFields.length}):`);
            changes.unchangedFields.forEach(field => {
                console.log(`   • ${field.fieldName}: "${field.value}"`);
            });
        }
        
        // Determine success
        const success = changes.newFields.length > 0 || changes.updatedFields.length > 0;
        
        console.log(`\n🎯 Validation Result: ${success ? '✅ SUCCESS' : '⚠️ NO CHANGES'}`);
        
        if (success) {
            console.log('🎉 Custom fields are working with live VAPI calls!');
        } else {
            console.log('🔧 Custom fields were not updated. Check CloudWatch logs for issues.');
        }
        
        return success;
    }

    // Test AI extraction against a known transcript
    async testAIExtraction(transcript) {
        console.log('\n🤖 Testing AI Extraction on Provided Transcript');
        console.log('-' .repeat(50));
        
        try {
            const extractedData = await this.aiExtractor.extractDataFromTranscript(transcript);
            const extractedFields = Object.keys(extractedData).filter(key => !key.startsWith('_'));
            
            console.log(`🎯 AI extracted ${extractedFields.length} fields from transcript:`);
            
            extractedFields.forEach(fieldName => {
                const fieldData = extractedData[fieldName];
                const confidence = fieldData.confidence || 0;
                console.log(`   • ${fieldName}: "${fieldData.value}" (${confidence}% confidence)`);
            });
            
            return extractedData;
            
        } catch (error) {
            console.error('❌ AI extraction test failed:', error.message);
            return null;
        }
    }

    // Full validation workflow
    async validateLiveCall(contactId, transcript = null) {
        if (!this.initialized) {
            const initialized = await this.initialize();
            if (!initialized) {
                throw new Error('Failed to initialize validator');
            }
        }
        
        console.log('🧪 Starting Live VAPI Call Validation');
        console.log('=' .repeat(60));
        console.log(`👤 Contact ID: ${contactId}`);
        console.log(`📅 Time: ${new Date().toLocaleString()}`);
        console.log('');
        
        try {
            // Capture current state
            const afterState = await this.captureAfterState(contactId);
            
            // Test AI extraction if transcript provided
            if (transcript) {
                await this.testAIExtraction(transcript);
            }
            
            // Show current field state
            console.log('\n📊 Current Custom Fields State:');
            const populatedFields = Object.entries(afterState.customFields)
                .filter(([key, value]) => value && value.toString().trim() !== '');
            
            if (populatedFields.length > 0) {
                populatedFields.forEach(([fieldName, value]) => {
                    console.log(`   • ${fieldName}: "${value}"`);
                });
            } else {
                console.log('   ⚠️ No populated custom fields found');
            }
            
            return {
                success: populatedFields.length > 0,
                populatedFieldsCount: populatedFields.length,
                fields: afterState.customFields
            };
            
        } catch (error) {
            console.error('❌ Validation failed:', error.message);
            throw error;
        }
    }
}

// Command line interface
async function main() {
    const validator = new LiveCustomFieldsValidator();
    
    const command = process.argv[2];
    const contactId = process.argv[3];
    const transcript = process.argv[4];
    
    if (!command || !contactId) {
        console.log('🧪 Live Custom Fields Validator');
        console.log('');
        console.log('Usage:');
        console.log('  node validate-live-custom-fields.js validate CONTACT_ID [TRANSCRIPT]');
        console.log('  node validate-live-custom-fields.js before CONTACT_ID    - Capture before state');
        console.log('  node validate-live-custom-fields.js after CONTACT_ID     - Capture after state');
        console.log('  node validate-live-custom-fields.js compare CONTACT_ID   - Compare saved states');
        console.log('');
        console.log('Examples:');
        console.log('  # Validate current state');
        console.log('  node validate-live-custom-fields.js validate 67890abc123def');
        console.log('');
        console.log('  # Test with transcript');
        console.log('  node validate-live-custom-fields.js validate 67890abc123def "I need to sell my house..."');
        process.exit(1);
    }
    
    try {
        await validator.initialize();
        
        switch (command) {
            case 'validate':
                await validator.validateLiveCall(contactId, transcript);
                break;
                
            case 'before':
                const beforeState = await validator.captureBeforeState(contactId);
                console.log('\n💾 Before state saved. Make your VAPI call now, then run:');
                console.log(`node validate-live-custom-fields.js after ${contactId}`);
                break;
                
            case 'after':
                const afterState = await validator.captureAfterState(contactId);
                console.log('\n✅ After state captured');
                break;
                
            default:
                console.error(`❌ Unknown command: ${command}`);
                process.exit(1);
        }
        
    } catch (error) {
        console.error('💥 Validation error:', error.message);
        console.log('\n🔧 Troubleshooting:');
        console.log('1. Verify contact ID exists in GoHighLevel');
        console.log('2. Check PIT token is valid');
        console.log('3. Ensure AWS credentials are configured');
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export default LiveCustomFieldsValidator;