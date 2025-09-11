#!/usr/bin/env node

// Test script for regular GHL webhook that triggers VAPI calls
import { handler } from './index.js';

const testGhlWebhookEvent = {
    httpMethod: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'x-ghl-signature': 'test_ghl_signature_here'
    },
    body: JSON.stringify({
        // Regular GHL webhook payload - Contact with FSBO tag
        type: 'ContactUpdate',
        eventType: 'contact.tag.added',
        contact: {
            id: 'test-contact-ghl-123',
            firstName: 'John',
            lastName: 'Seller', 
            email: 'john.seller@example.com',
            phone: '+15551234567',
            address1: '789 Property Lane',
            city: 'Real Estate City',
            state: 'CA',
            postalCode: '90210',
            companyName: 'Seller Property Co',
            source: 'website',
            leadSource: 'contact form'
        },
        tags: [
            { name: 'fsbo' },
            { name: 'qualified' },
            { name: 'call-now' }
        ]
    })
};

console.log('🏠 Testing GHL Regular Webhook → VAPI Call Flow...');
console.log('📞 Contact: John Seller');
console.log('🏷️  Tags: fsbo, qualified, call-now'); 
console.log('🌐 Source: website contact form');
console.log('💰 Cost: FREE (no premium workflow fees!)');
console.log('');

try {
    const result = await handler(testGhlWebhookEvent);
    console.log('✅ GHL Webhook Response:', JSON.stringify(result, null, 2));
    
    if (result.statusCode === 200) {
        const body = JSON.parse(result.body);
        if (body.callId) {
            console.log('🎉 SUCCESS: VAPI call triggered successfully!');
            console.log('📞 Call ID:', body.callId);
            console.log('👤 Contact ID:', body.contactId);
            console.log('🔄 Trigger Reason:', body.triggerReason);
            console.log('');
            console.log('💡 Next Steps:');
            console.log('1. Check VAPI dashboard for the outbound call');
            console.log('2. When call completes, VAPI will send end-of-call report');
            console.log('3. Lambda will update contact and create notes automatically');
        } else {
            console.log('ℹ️  No call triggered:', body.message);
        }
    }
    
} catch (error) {
    console.error('❌ Error:', error.message);
    console.error('📋 Stack:', error.stack);
}

console.log('');
console.log('🔄 Testing Different Trigger Conditions...');
console.log('');

// Test 2: Website lead without FSBO tag (should still trigger)
const testWebsiteLeadEvent = {
    httpMethod: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'x-ghl-signature': 'test_ghl_signature_here'
    },
    body: JSON.stringify({
        type: 'ContactCreate',
        eventType: 'contact.created',
        contact: {
            id: 'test-contact-website-456',
            firstName: 'Sarah',
            lastName: 'WebsiteLead',
            email: 'sarah.lead@example.com', 
            phone: '+15559876543',
            address1: '456 Lead Street',
            city: 'Marketing City',
            state: 'NY',
            postalCode: '10001',
            source: 'website',
            leadSource: 'contact form'
        },
        tags: [
            { name: 'new-lead' },
            { name: 'follow-up' }
        ]
    })
};

console.log('🌐 Test 2: Website Lead with follow-up tag...');
try {
    const result2 = await handler(testWebsiteLeadEvent);
    const body2 = JSON.parse(result2.body);
    console.log('Result:', body2.message || 'Call triggered: ' + body2.callId);
} catch (error) {
    console.error('Error:', error.message);
}

// Test 3: Contact without trigger conditions (should not trigger)
const testNoTriggerEvent = {
    httpMethod: 'POST', 
    headers: {
        'Content-Type': 'application/json',
        'x-ghl-signature': 'test_ghl_signature_here'
    },
    body: JSON.stringify({
        type: 'ContactUpdate',
        contact: {
            id: 'test-contact-no-trigger-789',
            firstName: 'Bob',
            lastName: 'NotReady',
            email: 'bob.notready@example.com',
            phone: '+15555555555',
            source: 'import'
        },
        tags: [
            { name: 'general' },
            { name: 'unqualified' }
        ]
    })
};

console.log('🚫 Test 3: Contact without trigger conditions...');
try {
    const result3 = await handler(testNoTriggerEvent);
    const body3 = JSON.parse(result3.body);
    console.log('Result:', body3.message);
} catch (error) {
    console.error('Error:', error.message);
}

console.log('');
console.log('✅ GHL Webhook Testing Complete!');
console.log('');
console.log('📋 SETUP SUMMARY:');
console.log('1. Regular GHL webhooks → Lambda → VAPI calls (FREE!)');
console.log('2. VAPI end-of-call reports → Lambda → Contact updates & notes');
console.log('3. Multiple trigger conditions supported');
console.log('4. Premium workflow webhooks no longer needed 💰');