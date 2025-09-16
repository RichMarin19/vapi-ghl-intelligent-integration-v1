#!/usr/bin/env node

// Test with exact webhook payload structure that would come from VAPI
// Based on the debugging logs in index.js

import { CustomFieldsManager } from './custom-fields-manager.js';

async function testRealWebhookProcessing() {
    console.log('🔧 TESTING REAL WEBHOOK PROCESSING');
    console.log('================================================================================');
    
    try {
        // Simulate the exact payload structure that VAPI sends
        // Based on the logs from index.js that show actual webhook structure
        const realVAPIWebhookPayload = {
            message: {
                type: 'end-of-call-report',
                // VAPI puts the AI summary in message.call.analysis.summary or message.summary
                summary: `The caller mentioned the connection as their motivation. I would like to go to lets say, Missouri. By the by February, I would say. Maybe sooner if possible. They expressed disappointment about quality of buyers. Their concern is just getting things done in my time frame.`,
                call: {
                    id: 'test-real-call-' + Date.now(),
                    transcript: `Caller: The connection is really important to me. I want to move to Missouri by February, maybe sooner. I'm disappointed with the quality of buyers I've been seeing. My main concern is just getting things done in my timeframe.`,
                    customer: {
                        number: '+15551234567'
                    },
                    startedAt: new Date(Date.now() - 600000).toISOString(),
                    endedAt: new Date().toISOString(),
                    // Some VAPI webhooks have analysis data here
                    analysis: {
                        summary: `The caller mentioned the connection as their motivation. I would like to go to lets say, Missouri. By the by February, I would say. Maybe sooner if possible. They expressed disappointment about quality of buyers. Their concern is just getting things done in my time frame.`
                    }
                }
            }
        };

        console.log('🎯 WEBHOOK PAYLOAD STRUCTURE:');
        console.log(`   Message type: ${realVAPIWebhookPayload.message.type}`);
        console.log(`   Has message.summary: ${!!realVAPIWebhookPayload.message.summary}`);
        console.log(`   Has message.call.analysis.summary: ${!!realVAPIWebhookPayload.message.call.analysis?.summary}`);
        console.log(`   Has call transcript: ${!!realVAPIWebhookPayload.message.call.transcript}`);
        console.log('');

        // Use a real contact ID for testing (get one from your system)
        const testContactId = process.env.TEST_CONTACT_ID || process.argv[2] || 'C3L5sHhvD8kqBgOuWc3P'; // Default test contact

        console.log(`👤 Using test contact ID: ${testContactId}`);
        console.log('');

        // Initialize custom fields manager
        const customFieldsManager = new CustomFieldsManager();
        console.log('🔧 Initializing Custom Fields Manager...');
        
        const initialized = await customFieldsManager.initialize();
        if (!initialized) {
            throw new Error('Failed to initialize Custom Fields Manager');
        }
        
        console.log('✅ Custom Fields Manager initialized');
        console.log('');

        // Process the webhook exactly as the Lambda would
        console.log('🚀 PROCESSING WEBHOOK (simulating Lambda handler)...');
        
        const result = await customFieldsManager.processVAPICall(realVAPIWebhookPayload.message, testContactId);
        
        console.log('');
        console.log('📊 WEBHOOK PROCESSING RESULTS:');
        console.log(`   Success: ${result.success ? '✅ YES' : '❌ NO'}`);
        console.log(`   Message: ${result.message}`);
        console.log(`   Fields updated: ${result.fieldsUpdated}`);
        
        if (result.updatedFields && result.updatedFields.length > 0) {
            console.log('');
            console.log('✅ FIELDS SUCCESSFULLY UPDATED:');
            result.updatedFields.forEach(field => {
                console.log(`   • ${field.fieldName}: "${field.value}" (${field.confidence}% confidence)`);
            });
        } else {
            console.log('');
            console.log('❌ NO FIELDS WERE UPDATED - This is the problem!');
        }
        
        if (result.warnings && result.warnings.length > 0) {
            console.log('');
            console.log('⚠️ WARNINGS:');
            result.warnings.forEach(warning => console.log(`   • ${warning}`));
        }
        
        if (result.extractedData) {
            console.log('');
            console.log('🤖 RAW EXTRACTED DATA:');
            const extractedFields = Object.keys(result.extractedData).filter(key => !key.startsWith('_'));
            extractedFields.forEach(field => {
                const data = result.extractedData[field];
                console.log(`   • ${field}: "${data.value}" (${data.confidence}% confidence)`);
            });
        }
        
        if (!result.success || result.fieldsUpdated === 0) {
            console.log('');
            console.log('🔍 TROUBLESHOOTING ANALYSIS:');
            console.log('   1. Check if AI extraction is working');
            console.log('   2. Check if field mapping is finding matches');
            console.log('   3. Check if GoHighLevel API call is successful');
            console.log('   4. Check contact permissions and field accessibility');
        }
        
    } catch (error) {
        console.error('❌ Real webhook test failed:', error.message);
        console.error(error.stack);
    }
}

// Run with optional contact ID
testRealWebhookProcessing();