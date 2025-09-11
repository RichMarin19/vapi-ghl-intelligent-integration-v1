#!/usr/bin/env node

// Test script for VAPI-GHL Lambda integration
import axios from 'axios';

// Test payloads
const VAPI_END_OF_CALL_PAYLOAD = {
    message: {
        type: 'end-of-call-report',
        phoneNumber: '+1234567890',
        call: {
            id: 'call-123',
            transcript: "What's your email address? My email is john.doe@example.com. And what's your company name? I work at Acme Corporation.",
            analysis: {
                summary: "Customer provided email and company information",
                structuredData: {
                    firstName: "John",
                    lastName: "Doe", 
                    email: "john.doe@example.com",
                    companyName: "Acme Corporation"
                }
            }
        }
    }
};

const GHL_CONTACT_TAG_PAYLOAD = {
    type: 'ContactUpdate',
    eventType: 'contact.tag.added',
    contact: {
        id: 'contact-123',
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+1987654321',
        email: 'jane.smith@example.com',
        tags: [
            { name: 'FSBO', id: 'tag-fsbo-123' },
            { name: 'Prospect', id: 'tag-prospect-456' }
        ]
    },
    tags: ['FSBO', 'Prospect']
};

// Test function
async function testWebhook(url, payload, description) {
    console.log(`\\n🧪 Testing: ${description}`);
    console.log('📤 Payload:', JSON.stringify(payload, null, 2));
    
    try {
        const response = await axios.post(url, payload, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'VAPI-GHL-Test/1.0'
            },
            timeout: 30000
        });
        
        console.log('✅ Success!');
        console.log('📊 Status:', response.status);
        console.log('📥 Response:', JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        console.log('❌ Error!');
        console.log('Status:', error.response?.status || 'No status');
        console.log('Error:', error.response?.data || error.message);
    }
}

// Main test function
async function runTests() {
    const lambdaUrl = process.env.LAMBDA_URL || process.argv[2];
    
    if (!lambdaUrl) {
        console.error('❌ Please provide Lambda URL as environment variable LAMBDA_URL or first argument');
        console.error('Example: node test-webhook.js https://your-function-url.lambda-url.region.on.aws/');
        process.exit(1);
    }
    
    console.log('🚀 Starting VAPI-GHL Lambda Integration Tests');
    console.log('🎯 Target URL:', lambdaUrl);
    
    // Test VAPI end-of-call webhook
    await testWebhook(
        lambdaUrl, 
        VAPI_END_OF_CALL_PAYLOAD, 
        'VAPI End-of-Call Report (Contact Update)'
    );
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test GHL contact tag webhook
    await testWebhook(
        lambdaUrl,
        GHL_CONTACT_TAG_PAYLOAD,
        'GHL Contact Tag Added (FSBO Call Trigger)'
    );
    
    console.log('\\n🏁 Tests completed!');
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runTests().catch(console.error);
}