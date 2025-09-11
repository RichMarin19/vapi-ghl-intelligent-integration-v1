#!/usr/bin/env node

// Direct test script to call Lambda handler locally
import { handler } from './index.js';

const testEvent = {
  httpMethod: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-vapi-signature': 'sha256=test_signature_here',
    'x-vapi-secret': ''
  },
  body: JSON.stringify({
    "message": {
      "type": "end-of-call-report",
      "call": {
        "id": "test-call-direct",
        "customer": {
          "number": "+15551234567",
          "name": "Jack Melo"
        },
        "assistantId": "9dcdb98a-613c-4927-a007-8e3437ef337c",
        "phoneNumberId": "480686f7-a658-42d7-a3d2-eef8860c6768",
        "assistantOverrides": {
          "variableValues": {
            "contactId": "jjYOawhhinftLJSQG3J2",
            "name": "Jackson Dart",
            "email": "jackson.dart@example.com", 
            "phone": "+15167104298",
            "time": "2025-09-12",
            "address": "123 Main St, Oceanside, NY 11572"
          }
        },
        "transcript": "Hello, this is Jackson Dart and my email is jackson.dart@example.com. I live at 123 Main Street in Oceanside, New York 11572. I'm looking to sell my property.",
        "analysis": {
          "structuredData": {
            "firstName": "Jackson",
            "lastName": "Dart", 
            "email": "jackson.dart@example.com",
            "companyName": null,
            "address1": "123 Main Street",
            "city": "Oceanside",
            "state": "NY",
            "postalCode": "11572",
            "phone": "+15167104298"
          }
        },
        "startedAt": "2025-09-10T14:00:00.000Z",
        "endedAt": "2025-09-10T14:18:45.000Z",
        "status": "ended",
        "endedReason": "customer-ended-call"
      },
      "phoneNumber": "+15167104298",
      "timestamp": "2025-09-10T14:18:48.000Z"
    }
  })
};

console.log('🚀 Testing Lambda handler directly...');
console.log('📞 Contact ID:', 'jjYOawhhinftLJSQG3J2');
console.log('👤 Target Name:', 'Jackson Dart');
console.log('📧 Target Email:', 'jackson.dart@example.com');
console.log('🏠 Target Address:', '123 Main St, Oceanside, NY 11572');
console.log('🏢 Target Company:', 'None');
console.log('📝 New Feature: Contact notes with transcript summary and audio link');
console.log('');

try {
  const result = await handler(testEvent);
  console.log('✅ Lambda Response:', JSON.stringify(result, null, 2));
  
  // Wait for async processing
  console.log('⏳ Waiting 5 seconds for async processing...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  console.log('✅ Test completed. Check GHL contact to verify updates.');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('📋 Stack:', error.stack);
}