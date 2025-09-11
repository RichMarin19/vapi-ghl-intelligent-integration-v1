# 🎉 WORKING VAPI-GHL INTEGRATION CONFIG
## Date: 2025-09-10
## Status: ✅ FULLY FUNCTIONAL

### **SUCCESS CONFIRMATION**
- ✅ Contact updated properly  
- ✅ Appointment setup accurately
- ✅ No more 503 errors
- ✅ Bidirectional integration working

---

## **AWS LAMBDA CONFIGURATION**

### Function Details
- **Function Name**: `vapi-ghl-integration`
- **Runtime**: `nodejs22.x`
- **Region**: `us-east-2`
- **Memory**: `256 MB`
- **Timeout**: `60 seconds`
- **Handler**: `index.handler`

### Function URL Configuration
- **URL**: `https://7jahamtx2g2pkure4ew4nty7ua0xyykl.lambda-url.us-east-2.on.aws/`
- **AuthType**: `NONE`
- **InvokeMode**: `BUFFERED`
- **CORS**: Enabled

### Permissions
```json
{
  "Sid": "allow-function-url",
  "Effect": "Allow", 
  "Principal": "*",
  "Action": "lambda:InvokeFunctionUrl",
  "Resource": "arn:aws:lambda:us-east-2:340285142294:function:vapi-ghl-integration",
  "Condition": {
    "StringEquals": {
      "lambda:FunctionUrlAuthType": "NONE"
    }
  }
}
```

### IAM Role
- **Role Name**: `vapi-ghl-lambda-role`
- **Permissions**: Lambda basic execution + SSM Parameter Store access

---

## **ENVIRONMENT VARIABLES**

```bash
VAPI_API_KEY=4697e0ee-064a-447c-b9f8-d3d2e699dadb
VAPI_SECRET_TOKEN=A7PmLhnx30xPdqHP4Bl4irhzI3U8Eu4GKPjdt2HZT2o=
VAPI_PHONE_NUMBER_ID=480686f7-a658-42d7-a3d2-eef8860c6768
VAPI_ASSISTANT_ID=9dcdb98a-613c-4927-a007-8e3437ef337c
GHL_LOCATION_ID=Tty8tmfsIBN4DdOVzgVa
```

---

## **AWS PARAMETER STORE (us-east-2)**

### OAuth2 Tokens (SecureString)
- **Access Token**: `/vapi-ghl-integration/ghl-access-token`
- **Refresh Token**: `/vapi-ghl-integration/ghl-refresh-token`

---

## **VAPI CONFIGURATION**

### Webhook URL
```
https://7jahamtx2g2pkure4ew4nty7ua0xyykl.lambda-url.us-east-2.on.aws/
```

### Assistant ID
```
9dcdb98a-613c-4927-a007-8e3437ef337c
```

---

## **GOHIGHLEVEL CONFIGURATION**

### API Details
- **Location ID**: `Tty8tmfsIBN4DdOVzgVa`
- **API Version**: `2021-07-28`
- **Base URL**: `https://services.leadconnectorhq.com`
- **OAuth Client**: `68bf2a4c826efc53beb8b92c-mfbiceoe`

### Workflow Integration
- **Contact ID Variable**: `{{contact.id}}`
- **Assistant Overrides**: Uses `variableValues.contactId` for precise contact matching

---

## **KEY TECHNICAL SOLUTIONS**

### 1. 503 Error Resolution
- **Problem**: VAPI webhook timeouts during synchronous processing
- **Solution**: Asynchronous processing with immediate webhook response

### 2. Contact ID Precision  
- **Problem**: Wrong contacts being updated (phone number matching)
- **Solution**: Direct contact ID usage from GHL workflow variables

### 3. OAuth2 Token Management
- **Problem**: 4KB environment variable limit  
- **Solution**: AWS Parameter Store with automatic token refresh

### 4. API Authentication
- **Problem**: 403/422 errors from GHL API
- **Solution**: Proper OAuth2 implementation + Version header

---

## **INTEGRATION FLOW**

### VAPI → GHL (Post-Call Updates)
1. VAPI sends `end-of-call-report` webhook
2. Lambda responds immediately (< 1 second)
3. Background processing extracts transcript data
4. Updates correct contact using provided contact ID
5. OAuth2 handles authentication automatically

### GHL → VAPI (Outbound Calls)
1. GHL workflow triggers with contact data
2. Lambda creates VAPI outbound call
3. Assistant overrides include contact variables
4. Call connects with proper context

---

## **BACKUP INFORMATION**

### Code Backup Location
```
/Users/richmarin/vapi-ghl-lambda-WORKING-BACKUP-2025-09-10/
```

### Critical Files
- `index.js` - Main Lambda function
- `package.json` - Dependencies 
- `deploy.sh` - Deployment script
- Environment variables and Parameter Store values

---

## **RESTORE INSTRUCTIONS**

If something breaks, follow these steps:

1. **Restore Code**:
   ```bash
   cp -r /Users/richmarin/vapi-ghl-lambda-WORKING-BACKUP-2025-09-10/* /Users/richmarin/vapi-ghl-lambda/
   cd /Users/richmarin/vapi-ghl-lambda
   npm run deploy
   ```

2. **Verify Function URL**:
   ```bash
   aws lambda get-function-url-config --function-name vapi-ghl-integration --region us-east-2
   ```

3. **Check Parameter Store**:
   ```bash
   aws ssm get-parameter --name "/vapi-ghl-integration/ghl-access-token" --region us-east-2
   ```

4. **Test Integration**:
   ```bash
   curl -X POST "https://7jahamtx2g2pkure4ew4nty7ua0xyykl.lambda-url.us-east-2.on.aws/" \
        -H "Content-Type: application/json" \
        -H "x-vapi-signature: sha256=test" \
        -d '{"message":{"type":"end-of-call-report","call":{"id":"test","customer":{"number":"+15551234567"}}}}'
   ```

---

## **MONITORING**

### CloudWatch Logs
```
/aws/lambda/vapi-ghl-integration (us-east-2)
```

### Success Indicators
- Response time < 2 seconds
- Status 200 responses
- "Webhook received, processing contact update" message
- "Contact update completed asynchronously" in logs

---

**🎉 CONGRATULATIONS! This integration is now production-ready!**