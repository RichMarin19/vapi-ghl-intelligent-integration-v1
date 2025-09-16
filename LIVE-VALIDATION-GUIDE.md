# Live VAPI Custom Fields Validation Guide

## 🎯 Quick Validation Steps

After deploying the fixed Lambda (completed at 2025-09-12T00:43:07.000+0000), follow these steps to validate that custom fields are working with live VAPI calls:

### Step 1: Start Real-Time Monitoring
```bash
node monitor-live-webhook.js
```
This will show you real-time CloudWatch logs as VAPI calls are processed.

### Step 2: Make a Live VAPI Call
Make a live VAPI call with your system. The monitoring script will show you:
- ✅ When the webhook is received
- 🔧 Custom fields manager initialization
- 🤖 AI transcript extraction
- 📊 Custom fields being updated
- 🌐 GoHighLevel V2 API calls

### Step 3: Validate Results
```bash
node validate-live-custom-fields.js validate YOUR_CONTACT_ID
```
Replace `YOUR_CONTACT_ID` with the actual contact ID from your GoHighLevel system.

## 🔍 What You Should See

### Successful Processing Indicators:
1. **Webhook Receipt**: `📞 WEBHOOK: VAPI webhook received`
2. **Manager Init**: `🔧 CUSTOM FIELDS: Custom Fields Manager initialized`
3. **AI Extraction**: `🤖 AI EXTRACTION: extractDataFromTranscript`
4. **Field Updates**: `✅ FIELD UPDATE: Updated custom field`
5. **API Success**: `🌐 GHL API: GoHighLevel V2 API call successful`

### Success Example Log Output:
```
📞 [10:30:15] WEBHOOK: VAPI webhook received - end-of-call-report
🔧 [10:30:16] CUSTOM FIELDS: Custom Fields Manager initialized successfully
🤖 [10:30:17] AI EXTRACTION: Extracting data from transcript (1,234 characters)
✅ [10:30:18] FIELD UPDATE: Updated custom field 'Motivation': 'relocating for job'
✅ [10:30:18] FIELD UPDATE: Updated custom field 'Timeline': 'within 3 months'
🌐 [10:30:19] GHL API: GoHighLevel V2 API call successful (200)
```

## ⚠️ Troubleshooting Issues

### If You See Old Token System Errors:
```
🚨 ERROR: refreshGhlToken is not a function
🚨 ERROR: getValidGhlToken is not defined
```
**Solution**: The Lambda deployment didn't take effect. Redeploy with:
```bash
./deploy-debug-version.sh
```

### If No Custom Fields Are Updated:
1. **Check Contact ID**: Verify the contact exists in GoHighLevel
2. **Check Transcript**: Ensure the call has meaningful transcript content
3. **Check Field Mapping**: Run the custom fields test to verify field IDs

### If AI Extraction Fails:
```bash
# Test AI extraction on a sample transcript
node validate-live-custom-fields.js validate CONTACT_ID "I need to sell my house because we're moving to Texas within the next 3 months"
```

## 📊 Validation Commands

### Real-Time Monitoring
```bash
# Start live monitoring (run this BEFORE making VAPI call)
node monitor-live-webhook.js

# Show monitoring guide
node monitor-live-webhook.js report
```

### Contact Validation
```bash
# Validate current contact state
node validate-live-custom-fields.js validate CONTACT_ID

# Test with specific transcript
node validate-live-custom-fields.js validate CONTACT_ID "Your transcript here"

# Capture before/after comparison
node validate-live-custom-fields.js before CONTACT_ID
# Make VAPI call...
node validate-live-custom-fields.js after CONTACT_ID
```

### Custom Fields Testing
```bash
# Test the full custom fields system
node test-custom-fields.js

# Test with specific contact (end-to-end)
TEST_CONTACT_ID=YOUR_CONTACT_ID node test-custom-fields.js
```

## 🎉 Success Criteria

The system is working correctly when you see:

1. **Live Monitoring Shows**: Custom fields manager processes transcript and updates fields
2. **Validation Shows**: New fields populated after VAPI call
3. **GoHighLevel Shows**: Contact custom fields contain extracted data
4. **No Errors**: No OAuth token refresh errors in logs

## 🔧 Next Steps After Validation

Once validated:
1. Remove debug logging if desired
2. Monitor production calls
3. Adjust AI extraction templates based on real transcript patterns
4. Add additional custom fields as needed

## 📞 Contact Field Examples

After a successful call, you should see fields like:
- **Motivation**: "relocating for job transfer" 
- **Timeline**: "within 3 months"
- **Expectations**: "quick sale around $450,000"
- **Property Type**: "single family home"
- **Bedrooms**: "4"
- **Bathrooms**: "3"

The AI extracts this data from conversational transcript and populates the appropriate GoHighLevel custom fields automatically.