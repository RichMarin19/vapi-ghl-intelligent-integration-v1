#!/usr/bin/env node

// Test the actual deployed Lambda function with exact screenshot call summary
import { CustomFieldsManager } from './custom-fields-manager.js';

const SCREENSHOT_CALL_SUMMARY = `The AI called Jack Mello, a For Sale By Owner, to understand his selling motivations, which include saving commission, getting the most money, and selling by year-end for $1.05M. Jack expressed concerns about buyer quality and was open to working with an agent if the buyer paid the commission. The call concluded with scheduling an in-person preview with "Rich" for September 16th at 1 PM to offer feedback and explore potential buyers.`;

async function testLiveExtraction() {
    console.log('🔍 TESTING LIVE EXTRACTION WITH DEPLOYED CODE');
    console.log('================================================================================');
    console.log('📝 Call Summary:');
    console.log(SCREENSHOT_CALL_SUMMARY);
    console.log('');
    
    try {
        // Test with exact webhook payload structure
        const webhookPayload = {
            type: 'end-of-call-report',
            summary: SCREENSHOT_CALL_SUMMARY,
            call: {
                id: 'test-live-' + Date.now(),
                transcript: `Jack: I'm looking to sell my home. I want to save on commission and get the most money possible. I need to sell by year-end for about $1.05M. I'm concerned about the quality of buyers I've been getting. If a buyer pays the commission, I'd be open to working with an agent.`,
                customer: { number: '+15551234567' },
                startedAt: new Date(Date.now() - 600000).toISOString(),
                endedAt: new Date().toISOString(),
                analysis: { summary: SCREENSHOT_CALL_SUMMARY }
            }
        };

        console.log('🧠 Expected Field Values:');
        console.log('   Motivation: "Save commission, get the most money"');
        console.log('   Expectations: "$1.05M" or "get the most money"'); 
        console.log('   Timeline: "Year-end"');
        console.log('   Disappointments: "Quality of buyers"');
        console.log('   Concerns: "Buyer quality"');
        console.log('   Openness to Re-list: "Yes, if buyer pays commission"');
        console.log('');

        // Initialize custom fields manager
        const customFieldsManager = new CustomFieldsManager();
        await customFieldsManager.initialize();
        
        // Use a test contact ID
        const testContactId = 'jjYOawhhinftLJSQG3J2'; // Known working contact

        console.log('🤖 PROCESSING WITH LIVE DEPLOYED CODE...');
        const result = await customFieldsManager.processVAPICall(webhookPayload, testContactId);
        
        console.log('');
        console.log('📊 LIVE EXTRACTION RESULTS:');
        console.log(`   Success: ${result.success ? '✅ YES' : '❌ NO'}`);
        console.log(`   Fields updated: ${result.fieldsUpdated}`);
        
        if (result.updatedFields && result.updatedFields.length > 0) {
            console.log('');
            console.log('🎯 FIELD VALUES (What actually got saved to GHL):');
            result.updatedFields.forEach(field => {
                const status = validateFieldResult(field.fieldName, field.value);
                console.log(`   📌 ${field.fieldName}: "${field.value}" ${status}`);
            });
        }
        
        if (result.extractedData) {
            console.log('');
            console.log('🔍 RAW EXTRACTION DATA:');
            const extractedFields = Object.keys(result.extractedData).filter(key => !key.startsWith('_'));
            extractedFields.forEach(field => {
                const data = result.extractedData[field];
                console.log(`   • ${field}: "${data.value}" (${data.confidence}% confidence)`);
            });
        }

    } catch (error) {
        console.error('❌ Live extraction test failed:', error.message);
        console.error(error.stack);
    }
}

function validateFieldResult(fieldName, value) {
    const lowerValue = value.toLowerCase();
    
    switch (fieldName) {
        case 'Motivation':
            if (lowerValue.includes('commission') && lowerValue.includes('money')) return '✅ CORRECT';
            if (lowerValue.includes('commission') || lowerValue.includes('money')) return '⚠️ PARTIAL';
            return '❌ WRONG (should include commission + money)';
            
        case 'Expectations':
            if (lowerValue.includes('1.05') || lowerValue.includes('most money')) return '✅ CORRECT';
            return '❌ WRONG (should be $1.05M or "get most money")';
            
        case 'Timeline':
            if (lowerValue.includes('year')) return '✅ CORRECT';
            return '❌ WRONG (should be "year-end")';
            
        case 'Disappointments':
            if (lowerValue.includes('quality') && lowerValue.includes('buyer')) return '✅ CORRECT';
            return '❌ WRONG (should be "quality of buyers")';
            
        case 'Concerns':
            if (lowerValue.includes('buyer') && lowerValue.includes('quality')) return '✅ CORRECT';
            return '❌ WRONG (should be "buyer quality")';
            
        case 'Openness to Re-list':
            if (lowerValue.includes('yes') && lowerValue.includes('buyer') && lowerValue.includes('commission')) return '✅ CORRECT';
            if (lowerValue.includes('yes')) return '⚠️ PARTIAL';
            return '❌ WRONG (should be "Yes, if buyer pays commission")';
            
        default:
            return '➖ OTHER';
    }
}

testLiveExtraction();