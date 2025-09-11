# Postman Test Setup for VAPI-GHL Integration

## Overview
This Postman test payload simulates a VAPI end-of-call report that will trigger contact updates, appointment scheduling, and custom field population in GoHighLevel.

## Postman Collection Setup

### 1. Create New Request
- Method: `POST`
- URL: `https://your-lambda-function-url.execute-api.us-east-1.amazonaws.com/your-stage/`

### 2. Headers
Add the following headers:
```
Content-Type: application/json
x-vapi-signature: sha256=test_signature_here
x-vapi-secret: (leave empty - this simulates VAPI's empty secret behavior)
```

### 3. Body
Use the content from `postman-test-payload.json`:

**Key Data Points in Test Payload:**
- **Contact Info**: John Smith, john.smith@example.com, +15551234567
- **Address**: 123 Main St, Anytown, NY 12345  
- **Company**: ABC Real Estate Company
- **FSBO Custom Fields**:
  - Motivation: "Save Commission"
  - Expectations: "$450,000" 
  - Timeline: "3-6 months"
  - Next Destination: "Florida"
  - Disappointments: "Pricing concerns, finding qualified buyers"
  - Last Agent Experience: "Unresponsive agent, missed appointments" 
  - Openness To Re-List: "Open to re-listing with right agent"
- **Appointment**: Tuesday 2:00 PM (2025-09-17) for listing consultation

### 4. Expected Results

When this payload is sent, the Lambda function should:

✅ **Contact Update**: 
- Update contact name to "John Smith"
- Update email to "john.smith@example.com" 
- Update address to "123 Main St, Anytown, NY 12345"
- Update company to "ABC Real Estate Company"

✅ **Custom Fields** (when implemented):
- Motivation → "Save Commission"
- Next Destination → "Florida" 
- Expectations → "$450,000"
- Timeline → "3-6 months"
- Disappointments → "Pricing concerns, finding qualified buyers"
- Last Agent Experience → "Unresponsive agent, missed appointments"
- Concerns → "Pricing concerns, finding qualified buyers" 
- Openness To Re-List → "Open to re-listing with right agent"

✅ **Appointment Scheduling** (when implemented):
- Schedule listing consultation for Tuesday, September 17th at 2:00 PM

## Testing Steps

1. **First Test - Current Functionality**:
   - Send the payload as-is to test current contact updating
   - Should successfully update basic contact fields
   
2. **After Custom Fields Implementation**:
   - Same payload should populate all custom fields
   
3. **After Appointment Scheduling Implementation**:  
   - Same payload should also schedule the appointment

## Troubleshooting

- **401 Error**: Check VAPI signature headers are correct
- **500 Error**: Check Lambda logs for specific error details
- **Contact Not Found**: Ensure contactId "test-contact-123" exists in GHL or remove it to test phone number lookup
- **Token Expired**: Lambda will auto-refresh GHL tokens

## Response Examples

**Success Response:**
```json
{
  "message": "Webhook received, processing contact update",
  "status": 200
}
```

**Error Response:**
```json
{
  "error": "Internal server error", 
  "message": "Specific error details"
}
```