#!/usr/bin/env node

// Comprehensive test for all trigger methods - MOST EFFICIENT & EFFECTIVE SETUP
import { handler } from './index.js';

console.log('🚀 TESTING ALL TRIGGER METHODS - HYBRID APPROACH');
console.log('='.repeat(80));
console.log('');

// Test 1: Direct API Trigger (MOST EFFICIENT for on-demand)
console.log('📞 Test 1: Direct API Trigger (On-Demand)');
console.log('-'.repeat(50));

const directApiTest = {
    httpMethod: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        action: 'trigger-call',
        contactId: 'api-contact-123',
        phone: '+15551234567',
        name: 'John DirectAPI',
        email: 'john@directapi.com',
        address: '123 API Street',
        city: 'Tech City',
        state: 'CA'
    })
};

try {
    console.log('Triggering direct API call...');
    const result1 = await handler(directApiTest);
    const body1 = JSON.parse(result1.body);
    console.log('✅ Result:', body1.message || body1.error);
    if (body1.callId) console.log('📞 Call ID:', body1.callId);
} catch (error) {
    console.log('❌ Error:', error.message);
}

console.log('');

// Test 2: Bulk API Trigger (EFFICIENT for multiple contacts)
console.log('📞 Test 2: Bulk API Trigger (Multiple Contacts)');
console.log('-'.repeat(50));

const bulkApiTest = {
    httpMethod: 'POST', 
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        action: 'bulk-trigger',
        contacts: [
            {
                contactId: 'bulk-contact-1',
                phone: '+15551111111',
                name: 'Alice Bulk',
                email: 'alice@bulk.com'
            },
            {
                contactId: 'bulk-contact-2', 
                phone: '+15552222222',
                name: 'Bob Bulk',
                email: 'bob@bulk.com'
            },
            {
                contactId: 'bulk-contact-3',
                phone: '+15553333333', 
                name: 'Carol Bulk',
                email: 'carol@bulk.com'
            }
        ]
    })
};

try {
    console.log('Triggering bulk API calls...');
    const result2 = await handler(bulkApiTest);
    const body2 = JSON.parse(result2.body);
    console.log('✅ Result:', body2.message || body2.error);
    if (body2.summary) {
        console.log(`📊 Summary: ${body2.summary.total} total, ${body2.summary.successful} successful, ${body2.summary.failed} failed`);
    }
} catch (error) {
    console.log('❌ Error:', error.message);
}

console.log('');

// Test 3: Regular GHL Webhook (AUTOMATIC on contact changes) 
console.log('🌐 Test 3: Regular GHL Webhook (Automatic)');
console.log('-'.repeat(50));

const ghlWebhookTest = {
    httpMethod: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'x-ghl-signature': 'test_signature'
    },
    body: JSON.stringify({
        type: 'ContactCreate',
        eventType: 'contact.created',
        contact: {
            id: 'ghl-webhook-contact-456',
            firstName: 'Sarah',
            lastName: 'GHLWebhook',
            phone: '+15554444444',
            email: 'sarah@ghlwebhook.com',
            source: 'website',
            leadSource: 'contact form'
        },
        tags: [{ name: 'call-now' }]
    })
};

try {
    console.log('Testing GHL webhook trigger...');
    const result3 = await handler(ghlWebhookTest);
    const body3 = JSON.parse(result3.body);
    console.log('✅ Result:', body3.message || body3.error);
    if (body3.callId) console.log('📞 Call ID:', body3.callId);
    if (body3.triggerReason) console.log('🎯 Trigger Reason:', body3.triggerReason);
} catch (error) {
    console.log('❌ Error:', error.message);
}

console.log('');

// Test 4: VAPI End-of-Call Processing (AUTOMATIC post-call)
console.log('📋 Test 4: VAPI End-of-Call Processing (Automatic)');
console.log('-'.repeat(50));

const vapiEndOfCallTest = {
    httpMethod: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'x-vapi-signature': 'sha256=test_signature',
        'x-vapi-secret': ''
    },
    body: JSON.stringify({
        message: {
            type: 'end-of-call-report',
            call: {
                id: 'test-eoc-call-789',
                customer: { number: '+15555555555', name: 'End Of Call Test' },
                assistantId: '9dcdb98a-613c-4927-a007-8e3437ef337c',
                assistantOverrides: {
                    variableValues: {
                        contactId: 'jjYOawhhinftLJSQG3J2',
                        name: 'Test EOC',
                        email: 'test@eoc.com'
                    }
                },
                transcript: 'This is a test end-of-call report.',
                analysis: {
                    structuredData: {
                        firstName: 'Test',
                        lastName: 'EOC',
                        email: 'test@eoc.com',
                        phone: '+15555555555'
                    }
                },
                startedAt: new Date(Date.now() - 300000).toISOString(),
                endedAt: new Date().toISOString(),
                status: 'ended',
                endedReason: 'customer-ended-call'
            },
            timestamp: new Date().toISOString()
        }
    })
};

try {
    console.log('Testing VAPI end-of-call processing...');
    const result4 = await handler(vapiEndOfCallTest);
    const body4 = JSON.parse(result4.body);
    console.log('✅ Result:', body4.message || body4.error);
} catch (error) {
    console.log('❌ Error:', error.message);
}

console.log('');
console.log('🎉 HYBRID APPROACH TESTING COMPLETE!');
console.log('='.repeat(80));
console.log('');

console.log('📋 SUMMARY - MOST EFFICIENT & EFFECTIVE SETUP:');
console.log('');
console.log('1. 🎯 DIRECT API TRIGGER (On-Demand)');
console.log('   • Immediate calls when you need them');
console.log('   • Perfect control over timing');
console.log('   • Single contact or bulk operations');
console.log('');
console.log('2. 🌐 REGULAR GHL WEBHOOK (Automatic)');  
console.log('   • Auto-triggers on contact events (FREE!)');
console.log('   • Set-and-forget for routine leads');
console.log('   • Multiple trigger conditions');
console.log('');
console.log('3. 📞 VAPI END-OF-CALL (Automatic)');
console.log('   • Auto-processes call results');
console.log('   • Updates contacts & creates notes');
console.log('   • Complete call documentation');
console.log('');
console.log('💡 USAGE RECOMMENDATIONS:');
console.log('');
console.log('• Use DIRECT API for immediate/priority calls');
console.log('• Use BULK API for campaign-style calling');  
console.log('• Use GHL WEBHOOK for automatic lead follow-up');
console.log('• All methods work together seamlessly!');
console.log('');
console.log('🚀 Your Lambda is now the ULTIMATE call orchestrator!');

console.log('');
console.log('📝 API EXAMPLES:');
console.log('');
console.log('// Single Call:');
console.log('curl -X POST https://your-lambda-url/ \\');
console.log('  -H "Content-Type: application/json" \\');
console.log('  -d \'{"action":"trigger-call","phone":"+15551234567","name":"John Doe"}\'');
console.log('');
console.log('// Bulk Calls:');  
console.log('curl -X POST https://your-lambda-url/ \\');
console.log('  -H "Content-Type: application/json" \\');
console.log('  -d \'{"action":"bulk-trigger","contacts":[{"phone":"+1555...","name":"..."}]}\'');