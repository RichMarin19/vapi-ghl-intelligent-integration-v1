#!/usr/bin/env node

// Comprehensive Token Management Script for GHL OAuth
// Handles automatic token refresh and Parameter Store updates
import axios from 'axios';
import { SSMClient, GetParameterCommand, PutParameterCommand } from '@aws-sdk/client-ssm';

// AWS SSM client
const ssmClient = new SSMClient({ region: 'us-east-2' });

// Parameter Store paths
const ACCESS_TOKEN_PARAM = '/vapi-ghl-integration/ghl-access-token';
const REFRESH_TOKEN_PARAM = '/vapi-ghl-integration/ghl-refresh-token';
const CLIENT_SECRET_PARAM = '/vapi-ghl-integration/ghl-client-secret';

// GHL OAuth details (updated to match new tokens)
const GHL_CLIENT_ID = '68bf2a4c826efc53beb8b92c-mffujsrx';
const GHL_CLIENT_SECRET = 'd11c8ca6-8b52-4fc2-a250-9acf6ab27b1d';
const GHL_TOKEN_URL = 'https://services.leadconnectorhq.com/oauth/token';
const GHL_USER_TYPE = 'Location'; // Based on JWT decode - this is Location-level auth
const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-07-28';

class TokenManager {
    constructor() {
        this.currentAccessToken = null;
        this.currentRefreshToken = null;
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1 second
    }

    // Function to get parameter from Parameter Store with retry logic
    async getParameter(paramName, decrypt = true, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const command = new GetParameterCommand({
                    Name: paramName,
                    WithDecryption: decrypt
                });
                const response = await ssmClient.send(command);
                return response.Parameter?.Value || null;
            } catch (error) {
                console.warn(`⚠️ Attempt ${attempt}/${maxRetries} failed for parameter ${paramName}:`, error.message);
                if (attempt === maxRetries) {
                    console.error(`❌ Failed to get parameter ${paramName} after ${maxRetries} attempts`);
                    return null;
                }
                await this.delay(this.retryDelay * attempt);
            }
        }
    }

    // Function to store parameter in Parameter Store with retry logic
    async putParameter(paramName, value, secure = true, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const command = new PutParameterCommand({
                    Name: paramName,
                    Value: value,
                    Type: secure ? 'SecureString' : 'String',
                    Overwrite: true
                });
                await ssmClient.send(command);
                console.log(`✅ Parameter ${paramName} stored successfully`);
                return true;
            } catch (error) {
                console.warn(`⚠️ Attempt ${attempt}/${maxRetries} failed to store parameter ${paramName}:`, error.message);
                if (attempt === maxRetries) {
                    console.error(`❌ Failed to store parameter ${paramName} after ${maxRetries} attempts`);
                    throw error;
                }
                await this.delay(this.retryDelay * attempt);
            }
        }
    }

    // Utility function for delays
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Load current tokens from Parameter Store
    async loadTokens() {
        console.log('📝 Loading tokens from Parameter Store...');
        
        try {
            const [accessToken, refreshToken, clientSecret] = await Promise.all([
                this.getParameter(ACCESS_TOKEN_PARAM),
                this.getParameter(REFRESH_TOKEN_PARAM),
                this.getParameter(CLIENT_SECRET_PARAM)
            ]);

            this.currentAccessToken = accessToken;
            this.currentRefreshToken = refreshToken;
            this.clientSecret = clientSecret;

            if (accessToken && refreshToken && clientSecret) {
                console.log('✅ Tokens and client secret loaded successfully from Parameter Store');
                console.log(`🔍 Access token length: ${accessToken.length} characters`);
                console.log(`🔍 Refresh token length: ${refreshToken.length} characters`);
                console.log(`🔍 Client secret loaded: ${clientSecret ? 'Yes' : 'No'}`);
                return true;
            } else {
                console.log('❌ One or more required parameters not found in Parameter Store');
                console.log(`   Access token: ${accessToken ? 'Found' : 'Missing'}`);
                console.log(`   Refresh token: ${refreshToken ? 'Found' : 'Missing'}`);
                console.log(`   Client secret: ${clientSecret ? 'Found' : 'Missing'}`);
                return false;
            }
        } catch (error) {
            console.error('❌ Error loading tokens:', error.message);
            return false;
        }
    }

    // Test if current access token is valid
    async testAccessToken() {
        if (!this.currentAccessToken) {
            console.log('❌ No access token available for testing');
            return false;
        }

        try {
            console.log('🧪 Testing current access token...');
            const response = await axios.get(`${GHL_BASE_URL}/locations/`, {
                headers: {
                    'Authorization': `Bearer ${this.currentAccessToken}`,
                    'Version': GHL_API_VERSION
                },
                timeout: 10000 // 10 second timeout
            });

            console.log(`✅ Access token is valid (Status: ${response.status})`);
            return true;
        } catch (error) {
            if (error.response?.status === 401) {
                console.log('⚠️ Access token is expired or invalid (401 Unauthorized)');
            } else if (error.response?.status === 403) {
                console.log('⚠️ Access token lacks permissions (403 Forbidden)');
            } else {
                console.log(`⚠️ Token test failed with status: ${error.response?.status || 'Network Error'}`);
            }
            return false;
        }
    }

    // Refresh access token using refresh token
    async refreshAccessToken() {
        if (!this.currentRefreshToken) {
            throw new Error('No refresh token available for refreshing access token');
        }

        console.log('🔄 Refreshing GHL access token...');

        // Complete OAuth parameters as required by GHL API (minimal required set)
        const tokenData = {
            client_id: GHL_CLIENT_ID,
            client_secret: this.clientSecret,
            grant_type: 'refresh_token',
            refresh_token: this.currentRefreshToken,
            user_type: GHL_USER_TYPE
        };

        try {
            // Make the refresh request using the exact same method that worked before
            const response = await axios.post(GHL_TOKEN_URL, tokenData, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                transformRequest: [(data) => {
                    return Object.keys(data)
                        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
                        .join('&');
                }],
                timeout: 30000 // 30 second timeout
            });

            console.log('✅ Token refresh successful!');

            const tokenResponse = response.data;

            if (!tokenResponse.access_token) {
                throw new Error('No access token in refresh response');
            }

            // Update tokens
            const newAccessToken = tokenResponse.access_token;
            const newRefreshToken = tokenResponse.refresh_token || this.currentRefreshToken;

            // Store updated tokens in Parameter Store
            console.log('📝 Storing refreshed tokens in Parameter Store...');
            await Promise.all([
                this.putParameter(ACCESS_TOKEN_PARAM, newAccessToken),
                tokenResponse.refresh_token ? this.putParameter(REFRESH_TOKEN_PARAM, newRefreshToken) : Promise.resolve()
            ]);

            // Update in-memory tokens
            this.currentAccessToken = newAccessToken;
            if (tokenResponse.refresh_token) {
                this.currentRefreshToken = newRefreshToken;
            }

            // Display token information
            console.log('');
            console.log('📋 New Token Information:');
            console.log(`• Access token length: ${newAccessToken.length} characters`);
            
            if (tokenResponse.expires_in) {
                const hours = Math.round(tokenResponse.expires_in / 3600);
                console.log(`• Token expires in: ${tokenResponse.expires_in} seconds (${hours} hours)`);
            }
            
            if (tokenResponse.token_type) {
                console.log(`• Token type: ${tokenResponse.token_type}`);
            }
            
            if (tokenResponse.scope) {
                console.log(`• Scopes: ${tokenResponse.scope}`);
            }

            console.log('');
            console.log('🎉 Token refresh completed successfully!');
            
            return tokenResponse;

        } catch (error) {
            console.error('❌ Failed to refresh access token:', error.message);
            
            if (error.response) {
                console.error('📄 Response Details:');
                console.error(`   Status: ${error.response.status}`);
                console.error(`   Status Text: ${error.response.statusText}`);
                console.error(`   Data:`, JSON.stringify(error.response.data, null, 2));
            }
            
            if (error.response?.status === 400 && error.response?.data?.error === 'invalid_grant') {
                console.log('');
                console.log('🔑 The refresh token appears to be expired or invalid.');
                console.log('💡 You need to re-authorize the GHL integration to get fresh tokens.');
                console.log('🌐 Visit the GHL OAuth authorization URL to get new tokens.');
            }
            
            throw error;
        }
    }

    // Main function to ensure valid access token
    async ensureValidAccessToken() {
        console.log('🔍 Ensuring valid access token...');
        
        // Load tokens from Parameter Store
        const tokensLoaded = await this.loadTokens();
        if (!tokensLoaded) {
            throw new Error('Failed to load tokens from Parameter Store');
        }

        // Test current access token
        const isTokenValid = await this.testAccessToken();
        
        if (isTokenValid) {
            console.log('✅ Current access token is valid, no refresh needed');
            return this.currentAccessToken;
        }

        // Token is invalid, attempt refresh
        console.log('🔄 Access token needs refresh, attempting refresh...');
        
        try {
            await this.refreshAccessToken();
            
            // Test the refreshed token
            const isRefreshedTokenValid = await this.testAccessToken();
            
            if (!isRefreshedTokenValid) {
                throw new Error('Refreshed token is still invalid');
            }
            
            console.log('✅ Successfully refreshed and validated new access token');
            return this.currentAccessToken;
            
        } catch (refreshError) {
            console.error('❌ Token refresh failed:', refreshError.message);
            throw new Error(`Token refresh failed: ${refreshError.message}`);
        }
    }

    // Utility function to get current token status
    async getTokenStatus() {
        const tokensLoaded = await this.loadTokens();
        
        if (!tokensLoaded) {
            return {
                hasTokens: false,
                accessTokenValid: false,
                message: 'No tokens found in Parameter Store'
            };
        }

        const isValid = await this.testAccessToken();
        
        return {
            hasTokens: true,
            accessTokenValid: isValid,
            accessTokenLength: this.currentAccessToken?.length || 0,
            refreshTokenLength: this.currentRefreshToken?.length || 0,
            message: isValid ? 'Tokens are valid' : 'Access token needs refresh'
        };
    }
}

// Command-line interface
async function main() {
    const tokenManager = new TokenManager();
    
    // Get command line arguments
    const args = process.argv.slice(2);
    const command = args[0] || 'refresh';

    console.log('🔧 GHL Token Manager');
    console.log('=' .repeat(50));
    console.log('');

    try {
        switch (command.toLowerCase()) {
            case 'status':
                console.log('📊 Checking token status...');
                const status = await tokenManager.getTokenStatus();
                console.log('📋 Token Status:');
                console.log(`   Has Tokens: ${status.hasTokens ? '✅' : '❌'}`);
                console.log(`   Access Token Valid: ${status.accessTokenValid ? '✅' : '❌'}`);
                if (status.hasTokens) {
                    console.log(`   Access Token Length: ${status.accessTokenLength} characters`);
                    console.log(`   Refresh Token Length: ${status.refreshTokenLength} characters`);
                }
                console.log(`   Status: ${status.message}`);
                break;

            case 'test':
                console.log('🧪 Testing access token...');
                await tokenManager.loadTokens();
                const isValid = await tokenManager.testAccessToken();
                console.log(`🎯 Result: Token is ${isValid ? 'VALID ✅' : 'INVALID ❌'}`);
                break;

            case 'refresh':
                console.log('🔄 Refreshing access token...');
                const newToken = await tokenManager.ensureValidAccessToken();
                console.log('✅ Token management completed successfully');
                console.log(`🔑 New access token ready for use (${newToken.length} characters)`);
                break;

            case 'force-refresh':
                console.log('🔄 Force refreshing access token (skipping validation)...');
                await tokenManager.loadTokens();
                await tokenManager.refreshAccessToken();
                console.log('✅ Force refresh completed');
                break;

            default:
                console.log('❓ Usage: node token-manager.js [command]');
                console.log('');
                console.log('Available commands:');
                console.log('  status        - Check current token status');
                console.log('  test          - Test current access token validity');
                console.log('  refresh       - Refresh token if needed (default)');
                console.log('  force-refresh - Force refresh without testing');
                process.exit(1);
        }

    } catch (error) {
        console.error('');
        console.error('💥 Token management failed:', error.message);
        console.log('');
        console.log('🔧 Troubleshooting Tips:');
        console.log('1. Check AWS credentials and region configuration');
        console.log('2. Verify Parameter Store parameters exist');
        console.log('3. Ensure refresh token is not expired');
        console.log('4. Re-authorize GHL integration if tokens are expired');
        process.exit(1);
    }
}

// Export for use as module
export default TokenManager;
export { TokenManager };

// Run CLI if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}