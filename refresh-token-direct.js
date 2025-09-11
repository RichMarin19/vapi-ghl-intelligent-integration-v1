#!/usr/bin/env node

// Direct approach to refresh GHL access token
import axios from 'axios';
import { SSMClient, GetParameterCommand, PutParameterCommand } from '@aws-sdk/client-ssm';

// AWS SSM client
const ssmClient = new SSMClient({ region: 'us-east-2' });

// Parameter Store paths
const ACCESS_TOKEN_PARAM = '/vapi-ghl-integration/ghl-access-token';
const REFRESH_TOKEN_PARAM = '/vapi-ghl-integration/ghl-refresh-token';

// GHL OAuth details
const GHL_CLIENT_ID = '68bf2a4c826efc53beb8b92c';  // From JWT token
const GHL_TOKEN_URL = 'https://marketplace.gohighlevel.com/oauth/token';

// Function to get parameter from Parameter Store
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

// Function to store parameter in Parameter Store
async function putParameter(paramName, value, secure = true) {
    try {
        const command = new PutParameterCommand({
            Name: paramName,
            Value: value,
            Type: secure ? 'SecureString' : 'String',
            Overwrite: true
        });
        await ssmClient.send(command);
        console.log(`✅ Parameter ${paramName} stored successfully`);
    } catch (error) {
        console.error(`❌ Error storing parameter ${paramName}:`, error.message);
        throw error;
    }
}

async function refreshAccessToken() {
    try {
        console.log('🔄 Refreshing GHL access token (direct method)...');
        
        // Get current refresh token from Parameter Store
        console.log('📝 Getting refresh token from Parameter Store...');
        const refreshToken = await getParameter(REFRESH_TOKEN_PARAM);
        
        if (!refreshToken) {
            console.error('❌ No refresh token found in Parameter Store');
            process.exit(1);
        }
        
        console.log('✅ Refresh token retrieved');
        console.log('🔍 Refresh token length:', refreshToken.length);
        
        // Prepare the refresh request
        const tokenData = {
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: GHL_CLIENT_ID
        };
        
        console.log('🔄 Making direct API call to refresh token...');
        console.log('🔍 Request URL:', GHL_TOKEN_URL);
        console.log('🔍 Client ID:', GHL_CLIENT_ID);
        
        // Make the refresh request
        const response = await axios.post(GHL_TOKEN_URL, tokenData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            transformRequest: [(data) => {
                return Object.keys(data)
                    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
                    .join('&');
            }]
        });
        
        console.log('✅ Token refresh successful!');
        console.log('🔍 Response status:', response.status);
        
        const tokenData_response = response.data;
        
        if (!tokenData_response.access_token) {
            console.error('❌ No access token in response');
            console.error('Response data:', tokenData_response);
            process.exit(1);
        }
        
        const newAccessToken = tokenData_response.access_token;
        const newRefreshToken = tokenData_response.refresh_token || refreshToken; // Use old if new not provided
        
        console.log('📝 Storing new tokens in Parameter Store...');
        
        // Store both tokens
        await putParameter(ACCESS_TOKEN_PARAM, newAccessToken);
        if (tokenData_response.refresh_token) {
            await putParameter(REFRESH_TOKEN_PARAM, newRefreshToken);
            console.log('📝 New refresh token also stored');
        }
        
        console.log('🎉 Access token successfully refreshed!');
        console.log('');
        console.log('📋 Token Information:');
        console.log(`• New access token length: ${newAccessToken.length} characters`);
        
        if (tokenData_response.expires_in) {
            const hours = Math.round(tokenData_response.expires_in / 3600);
            console.log(`• Token expires in: ${tokenData_response.expires_in} seconds (${hours} hours)`);
        }
        
        if (tokenData_response.token_type) {
            console.log(`• Token type: ${tokenData_response.token_type}`);
        }
        
        if (tokenData_response.scope) {
            console.log(`• Scopes: ${tokenData_response.scope}`);
        }
        
        console.log('');
        console.log('✅ Your Lambda function can now access GHL API successfully!');
        console.log('🧪 You can now test VAPI end-of-call reports and note creation will work.');
        
        return tokenData_response;
        
    } catch (error) {
        console.error('❌ Failed to refresh access token:', error.message);
        
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));
            console.error('Response headers:', error.response.headers);
        }
        
        if (error.code) {
            console.error('Error code:', error.code);
        }
        
        console.log('');
        console.log('💡 This might indicate:');
        console.log('   - The refresh token has expired');
        console.log('   - The client credentials are incorrect');
        console.log('   - The GHL OAuth configuration has changed');
        console.log('');
        console.log('🔑 You may need to re-authorize the GHL integration to get fresh tokens.');
        
        process.exit(1);
    }
}

// Run the refresh
refreshAccessToken().catch(console.error);