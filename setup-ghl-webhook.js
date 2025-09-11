#!/usr/bin/env node

// Script to automatically configure GHL webhook for VAPI integration
import axios from 'axios';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

const LAMBDA_URL = 'https://7jahamtx2g2pkure4ew4nty7ua0xyykl.lambda-url.us-east-2.on.aws/';
const GHL_BASE_URL = 'https://services.leadconnectorhq.com';

// AWS SSM client
const ssmClient = new SSMClient({ region: process.env.AWS_REGION || 'us-east-1' });

// Parameter Store paths
const ACCESS_TOKEN_PARAM = '/vapi-ghl-integration/ghl-access-token';

async function getParameter(paramName, decrypt = true) {
    try {
        const command = new GetParameterCommand({
            Name: paramName,
            WithDecryption: decrypt
        });
        const response = await ssmClient.send(command);
        return response.Parameter?.Value || null;
    } catch (error) {
        console.error(`Error getting parameter ${paramName}:`, error.message);
        return null;
    }
}

async function getLocationId(accessToken) {
    try {
        // Get locations for this access token
        const response = await axios.get(`${GHL_BASE_URL}/locations/search`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Version': '2021-07-28',
                'Content-Type': 'application/json'
            }
        });
        
        const locations = response.data.locations || [];
        if (locations.length > 0) {
            console.log(`Found ${locations.length} location(s)`);
            return locations[0].id; // Use first location
        }
        
        return null;
    } catch (error) {
        console.error('Error getting locations:', error.response?.data || error.message);
        return null;
    }
}

async function createWebhook(accessToken, locationId) {
    const webhookPayload = {
        url: LAMBDA_URL,
        events: [
            'ContactCreate',
            'ContactUpdate', 
            'ContactTagUpdate'
        ],
        locationId: locationId
    };
    
    try {
        console.log('Creating webhook with payload:', JSON.stringify(webhookPayload, null, 2));
        
        const response = await axios.post(`${GHL_BASE_URL}/hooks/`, webhookPayload, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Version': '2021-07-28',
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Webhook created successfully!');
        console.log('Webhook details:', JSON.stringify(response.data, null, 2));
        return response.data;
    } catch (error) {
        console.error('❌ Error creating webhook:', error.response?.data || error.message);
        
        if (error.response?.status === 400) {
            console.log('\n🔍 Checking if webhook already exists...');
            return await checkExistingWebhooks(accessToken, locationId);
        }
        
        throw error;
    }
}

async function checkExistingWebhooks(accessToken, locationId) {
    try {
        const response = await axios.get(`${GHL_BASE_URL}/hooks/`, {
            params: { locationId: locationId },
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Version': '2021-07-28',
                'Content-Type': 'application/json'
            }
        });
        
        const webhooks = response.data.hooks || [];
        console.log(`Found ${webhooks.length} existing webhook(s)`);
        
        // Look for webhook with our Lambda URL
        const existingWebhook = webhooks.find(hook => 
            hook.url === LAMBDA_URL || hook.url.includes('lambda-url')
        );
        
        if (existingWebhook) {
            console.log('✅ Found existing webhook for Lambda URL');
            console.log('Webhook details:', JSON.stringify(existingWebhook, null, 2));
            
            // Update webhook to include required events
            return await updateWebhook(accessToken, existingWebhook.id, locationId);
        } else {
            console.log('❌ No webhook found for Lambda URL');
            webhooks.forEach((hook, index) => {
                console.log(`Webhook ${index + 1}: ${hook.url}`);
            });
        }
        
        return null;
    } catch (error) {
        console.error('Error checking existing webhooks:', error.response?.data || error.message);
        return null;
    }
}

async function updateWebhook(accessToken, webhookId, locationId) {
    const updatePayload = {
        url: LAMBDA_URL,
        events: [
            'ContactCreate',
            'ContactUpdate', 
            'ContactTagUpdate'
        ],
        locationId: locationId
    };
    
    try {
        console.log('Updating webhook with payload:', JSON.stringify(updatePayload, null, 2));
        
        const response = await axios.put(`${GHL_BASE_URL}/hooks/${webhookId}`, updatePayload, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Version': '2021-07-28',
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Webhook updated successfully!');
        console.log('Updated webhook details:', JSON.stringify(response.data, null, 2));
        return response.data;
    } catch (error) {
        console.error('❌ Error updating webhook:', error.response?.data || error.message);
        throw error;
    }
}

async function main() {
    console.log('🚀 Setting up GHL webhook for VAPI integration...');
    console.log('Lambda URL:', LAMBDA_URL);
    console.log('');
    
    try {
        // Get access token from Parameter Store
        console.log('📝 Getting access token from Parameter Store...');
        const accessToken = await getParameter(ACCESS_TOKEN_PARAM);
        
        if (!accessToken) {
            console.error('❌ No access token found in Parameter Store');
            console.log('Make sure your GHL access token is stored at:', ACCESS_TOKEN_PARAM);
            process.exit(1);
        }
        
        console.log('✅ Access token retrieved');
        
        // Get location ID
        console.log('📍 Getting location ID...');
        const locationId = await getLocationId(accessToken);
        
        if (!locationId) {
            console.error('❌ Could not get location ID');
            process.exit(1);
        }
        
        console.log('✅ Location ID:', locationId);
        
        // Create or update webhook
        console.log('🔗 Setting up webhook...');
        await createWebhook(accessToken, locationId);
        
        console.log('');
        console.log('🎉 Setup complete!');
        console.log('');
        console.log('✅ Your GHL webhook is now configured to trigger VAPI calls when:');
        console.log('   • Contacts are created');
        console.log('   • Contacts are updated'); 
        console.log('   • Contacts are tagged (including "fsbo" tag)');
        console.log('');
        console.log('💡 Test it by tagging a contact with "fsbo" in GHL');
        
    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        process.exit(1);
    }
}

main();