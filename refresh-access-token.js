#!/usr/bin/env node

// Script to refresh GHL access token using refresh token
import { AuthorizationCode } from 'simple-oauth2';
import { SSMClient, GetParameterCommand, PutParameterCommand } from '@aws-sdk/client-ssm';

// Environment variables
const GHL_CLIENT_ID = process.env.GHL_CLIENT_ID;
const GHL_CLIENT_SECRET = process.env.GHL_CLIENT_SECRET;

// AWS SSM client
const ssmClient = new SSMClient({ region: 'us-east-2' });

// Parameter Store paths
const ACCESS_TOKEN_PARAM = '/vapi-ghl-integration/ghl-access-token';
const REFRESH_TOKEN_PARAM = '/vapi-ghl-integration/ghl-refresh-token';

// OAuth2 configuration for GHL
const oauth2Config = {
    client: {
        id: GHL_CLIENT_ID,
        secret: GHL_CLIENT_SECRET
    },
    auth: {
        tokenHost: 'https://marketplace.gohighlevel.com',
        tokenPath: '/oauth/token',
        authorizePath: '/oauth/authorize'
    }
};

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
        console.log('🔄 Refreshing GHL access token...');
        
        // Get current refresh token from Parameter Store
        console.log('📝 Getting refresh token from Parameter Store...');
        const refreshToken = await getParameter(REFRESH_TOKEN_PARAM);
        
        if (!refreshToken) {
            console.error('❌ No refresh token found in Parameter Store');
            process.exit(1);
        }
        
        console.log('✅ Refresh token retrieved');
        
        // Create OAuth2 client
        const client = new AuthorizationCode(oauth2Config);
        
        // Create token object
        const accessToken = client.createToken({
            refresh_token: refreshToken
        });
        
        console.log('🔄 Requesting new access token from GHL...');
        
        // Refresh the token
        console.log('🔍 Debug: About to refresh token...');
        console.log('🔍 Using client ID:', GHL_CLIENT_ID);
        console.log('🔍 Token host:', oauth2Config.auth.tokenHost);
        
        const refreshedToken = await accessToken.refresh();
        
        const newAccessToken = refreshedToken.token.access_token;
        const newRefreshToken = refreshedToken.token.refresh_token;
        
        console.log('✅ New access token received');
        console.log('📝 Storing new tokens in Parameter Store...');
        
        // Store both tokens
        await putParameter(ACCESS_TOKEN_PARAM, newAccessToken);
        await putParameter(REFRESH_TOKEN_PARAM, newRefreshToken);
        
        console.log('🎉 Access token successfully refreshed!');
        console.log('');
        console.log('📋 Token Information:');
        console.log(`• New access token length: ${newAccessToken.length} characters`);
        console.log(`• Token expires in: ${refreshedToken.token.expires_in} seconds (${Math.round(refreshedToken.token.expires_in / 3600)} hours)`);
        console.log(`• Token type: ${refreshedToken.token.token_type}`);
        
        if (refreshedToken.token.scope) {
            console.log(`• Scopes: ${refreshedToken.token.scope}`);
        }
        
        console.log('');
        console.log('✅ Your Lambda function can now access GHL API successfully!');
        console.log('🧪 You can now test VAPI end-of-call reports and note creation will work.');
        
        return {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            expiresIn: refreshedToken.token.expires_in
        };
        
    } catch (error) {
        console.error('❌ Failed to refresh access token:', error.message);
        
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        
        if (error.message.includes('invalid_grant')) {
            console.log('');
            console.log('🔑 The refresh token may be expired or invalid.');
            console.log('💡 You may need to re-authorize the GHL integration to get new tokens.');
        }
        
        process.exit(1);
    }
}

// Load environment variables from Lambda environment
if (!GHL_CLIENT_ID || !GHL_CLIENT_SECRET) {
    console.log('⚙️  Loading environment variables from Lambda...');
    
    // Get from Lambda environment variables if needed
    process.env.GHL_CLIENT_ID = '68bf2a4c826efc53beb8b92c';  // Based on previous logs
    process.env.GHL_CLIENT_SECRET = process.env.GHL_CLIENT_SECRET || 'your-client-secret-here';
}

// Run the refresh
refreshAccessToken().catch(console.error);