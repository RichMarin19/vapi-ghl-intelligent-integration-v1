# VAPI-GHL Lambda Integration

This Lambda function handles both VAPI post-call webhooks and GHL contact tag webhooks to create a complete integration: VAPI calls update contact data in GHL, and when contacts are tagged with "FSBO" in GHL, it triggers new VAPI calls.

## Architecture

```
VAPI Call → Webhook → AWS Lambda → GHL API → Contact Updated
                         ↑
GHL Tag (FSBO) → Webhook → Lambda → VAPI API → Outbound Call
```

## Features

### VAPI → GHL Integration
- ✅ Receives VAPI end-of-call-report webhooks
- ✅ Analyzes call transcripts to extract Q&A data
- ✅ Finds contacts in GHL by phone number
- ✅ Updates contact fields with extracted information

### GHL → VAPI Integration
- ✅ Receives GHL contact tag webhooks
- ✅ Detects "FSBO" tag additions
- ✅ Triggers outbound VAPI calls automatically
- ✅ Uses specified assistant ID: `9dcdb98a-613c-4927-a007-8e3437ef337c`

### General Features
- ✅ Dual webhook source detection
- ✅ Error handling and logging
- ✅ Webhook signature verification (VAPI + GHL)
- ✅ Node.js 22 runtime support

## Setup

### 1. Environment Variables

Create environment variables for the Lambda function:

```bash
# GoHighLevel Configuration
export GHL_API_KEY="your_ghl_api_key_here"
export GHL_LOCATION_ID="your_ghl_location_id_here" 
export GHL_WEBHOOK_SECRET="your_ghl_webhook_secret_here"

# VAPI Configuration
export VAPI_API_KEY="your_vapi_api_key_here"
export VAPI_ASSISTANT_ID="9dcdb98a-613c-4927-a007-8e3437ef337c"
export VAPI_PHONE_NUMBER_ID="your_vapi_phone_number_id_here"
export VAPI_SECRET_TOKEN="your_vapi_secret_token_here"  # Optional

# AWS Configuration
export AWS_REGION="us-east-1"  # Optional, defaults to us-east-1
```

### 2. Deploy to AWS

```bash
cd vapi-ghl-lambda
./deploy.sh
```

The deployment script will:
- Install dependencies
- Create IAM role if needed
- Package and deploy the Lambda function
- Set up Function URL for webhooks
- Configure environment variables

### 3. Configure Webhooks

#### VAPI Webhook Setup
1. Copy the Function URL from deployment output
2. In your VAPI assistant settings, set the webhook URL to the Function URL
3. Configure your assistant ID: `9dcdb98a-613c-4927-a007-8e3437ef337c`

#### GHL Webhook Setup
1. In GHL, go to Settings → Webhooks
2. Create a new webhook with the Lambda Function URL
3. Select event type: "Contact Updated" or "Contact Tag Changed"
4. Test the webhook to ensure it reaches your Lambda function

## Configuration

### VAPI Assistant Setup

In your VAPI assistant configuration, ensure:

1. **Server URL**: Set to your Lambda Function URL
2. **Server Messages**: Include `end-of-call-report`
3. **Analysis Plan**: Configure to extract structured data from calls

Example assistant configuration:
```json
{
  "id": "9dcdb98a-613c-4927-a007-8e3437ef337c",
  "serverUrl": "https://your-function-url.lambda-url.region.on.aws/",
  "serverUrlSecret": "your_vapi_secret_token",
  "analysisPlan": {
    "summaryPlan": "Summarize the key information collected during this call",
    "structuredDataPlan": {
      "firstName": "Extract the customer's first name",
      "lastName": "Extract the customer's last name", 
      "email": "Extract the customer's email address",
      "companyName": "Extract the customer's company name"
    }
  }
}
```

### GHL API Requirements

- **API Key**: Generate from GHL Settings > API Keys
- **Location ID**: Your GHL location/sub-account ID
- **Permissions**: Contacts read/write access

## Data Extraction

The Lambda function extracts data using two methods:

### 1. VAPI Structured Data (Recommended)
Configure your assistant's `analysisPlan.structuredDataPlan` to extract specific fields.

### 2. Transcript Pattern Matching
Fallback regex patterns for common questions:
- Email addresses
- First/last names
- Company names
- Addresses

## Supported GHL Fields

The function can update these contact fields:
- `firstName`
- `lastName` 
- `email`
- `companyName`
- `address1`

Add more field mappings in the `analyzeTranscript()` function as needed.

## Error Handling

The function includes:
- Webhook signature verification
- Phone number normalization
- Graceful error responses
- Detailed CloudWatch logging
- Retry logic for API calls

## Monitoring

View logs in AWS CloudWatch:
```bash
aws logs tail /aws/lambda/vapi-ghl-integration --follow
```

## Testing

Test the webhook locally or with a sample payload:

```json
{
  "message": {
    "type": "end-of-call-report",
    "phoneNumber": "+1234567890",
    "call": {
      "transcript": "What's your email? My email is john@example.com",
      "analysis": {
        "structuredData": {
          "firstName": "John",
          "email": "john@example.com"
        }
      }
    }
  }
}
```

## Testing

Use the included test script to verify webhook functionality:

```bash
cd vapi-ghl-lambda
npm install
node test-webhook.js https://your-function-url.lambda-url.region.on.aws/
```

The test script will send sample VAPI and GHL webhooks to verify both integrations.

## Troubleshooting

### VAPI → GHL Issues
1. **Contact not found**: Ensure phone numbers match exactly in GHL
2. **Authentication errors**: Verify GHL API key and permissions
3. **Webhook not triggered**: Check VAPI assistant serverUrl configuration
4. **No data extracted**: Review transcript content and extraction patterns

### GHL → VAPI Issues
1. **Call not triggered**: Verify VAPI API key and phone number ID
2. **FSBO tag not detected**: Check tag name matches exactly (case-insensitive)
3. **Authentication errors**: Verify VAPI API key permissions
4. **Webhook not received**: Check GHL webhook configuration and URL

## Security

- Use VAPI secret token for webhook verification
- Store sensitive data in environment variables
- Function URL has no authentication (relies on webhook signatures)
- IAM role follows principle of least privilege