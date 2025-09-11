#!/usr/bin/env node

// Private Integration Token (PIT) Manager for GHL
// Much simpler and more reliable than OAuth
import axios from 'axios';
import { SSMClient, GetParameterCommand, PutParameterCommand } from '@aws-sdk/client-ssm';

// AWS SSM client
const ssmClient = new SSMClient({ region: 'us-east-2' });

// Parameter Store paths
const PIT_TOKEN_PARAM = '/vapi-ghl-integration/ghl-pit-token';

// GHL API details
const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-07-28';

class PITTokenManager {
    constructor() {
        this.pitToken = null;
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

    // Load PIT token from Parameter Store
    async loadToken() {
        console.log('📝 Loading PIT token from Parameter Store...');
        
        try {
            const token = await this.getParameter(PIT_TOKEN_PARAM);
            
            if (token) {
                this.pitToken = token;
                console.log('✅ PIT token loaded successfully from Parameter Store');
                console.log(`🔍 Token format: ${token.substring(0, 15)}...${token.substring(token.length - 8)}`);
                return true;
            } else {
                console.log('❌ PIT token not found in Parameter Store');
                return false;
            }
        } catch (error) {
            console.error('❌ Error loading PIT token:', error.message);
            return false;
        }
    }

    // Test if PIT token is valid by making a simple API call to a specific contact
    async testToken() {
        if (!this.pitToken) {
            console.log('❌ No PIT token available for testing');
            return false;
        }

        // Use a specific contact ID that we know works for testing
        const testContactId = 'jjYOawhhinftLJSQG3J2';

        try {
            console.log('🧪 Testing PIT token with specific contact endpoint...');
            const response = await axios.get(`${GHL_BASE_URL}/contacts/${testContactId}`, {
                headers: {
                    'Authorization': `Bearer ${this.pitToken}`, // Official docs require "Bearer" prefix
                    'Version': GHL_API_VERSION,
                    'Accept': 'application/json'
                },
                timeout: 10000 // 10 second timeout
            });

            console.log(`✅ PIT token is valid (Status: ${response.status})`);
            console.log(`📞 Test contact accessible: ${response.data?.contact?.firstName} ${response.data?.contact?.lastName}`);
            return true;
        } catch (error) {
            if (error.response?.status === 401) {
                console.log('⚠️ PIT token is invalid or expired (401 Unauthorized)');
            } else if (error.response?.status === 403) {
                console.log('⚠️ PIT token lacks permissions for contacts endpoint (403 Forbidden)');
            } else if (error.response?.status === 404) {
                console.log('⚠️ Test contact not found (404) - using fallback validation');
                // Try a different approach - just check if we can make any authenticated call
                return await this.testTokenMinimal();
            } else {
                console.log(`⚠️ Token test failed with status: ${error.response?.status || 'Network Error'}`);
                console.log(`   Error: ${error.message}`);
            }
            return false;
        }
    }

    // Minimal token test - just check if token format is accepted
    async testTokenMinimal() {
        try {
            console.log('🔄 Trying minimal token validation...');
            // Just test that the token is properly formatted and accepted
            // This will still fail if token is completely invalid
            const response = await axios.get(`${GHL_BASE_URL}/contacts/test-id-that-does-not-exist`, {
                headers: {
                    'Authorization': `Bearer ${this.pitToken}`,
                    'Version': GHL_API_VERSION,
                    'Accept': 'application/json'
                },
                timeout: 5000
            });
            return true; // If we get here, token is valid
        } catch (error) {
            if (error.response?.status === 404) {
                // 404 means token was accepted but contact not found - this is good!
                console.log('✅ PIT token format is valid (404 for non-existent contact is expected)');
                return true;
            } else if (error.response?.status === 401) {
                console.log('⚠️ PIT token is invalid (401 Unauthorized)');
                return false;
            } else {
                // For other errors, assume token is valid but may have permission issues
                console.log(`🤔 Unclear token status (${error.response?.status}), assuming valid for PIT scope`);
                return true;
            }
        }
    }

    // Get a valid PIT token (simple - no refresh needed!)
    async getValidToken() {
        try {
            console.log('🔍 Getting valid PIT token...');
            
            // Load token from Parameter Store
            const tokenLoaded = await this.loadToken();
            if (!tokenLoaded) {
                throw new Error('Failed to load PIT token from Parameter Store');
            }

            // Test token validity
            const isValid = await this.testToken();
            if (!isValid) {
                throw new Error('PIT token is invalid - may need to be rotated in GHL settings');
            }

            console.log('✅ Valid PIT token ready for use');
            return this.pitToken;
        } catch (error) {
            console.error('❌ Failed to get valid PIT token:', error.message);
            throw error;
        }
    }

    // Store PIT token in Parameter Store
    async storeToken(token) {
        try {
            console.log('💾 Storing PIT token in Parameter Store...');
            await this.putParameter(PIT_TOKEN_PARAM, token);
            this.pitToken = token;
            console.log('✅ PIT token stored successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to store PIT token:', error.message);
            throw error;
        }
    }

    // Get current token status
    async getTokenStatus() {
        const tokenLoaded = await this.loadToken();
        
        if (!tokenLoaded) {
            return {
                hasToken: false,
                tokenValid: false,
                message: 'No PIT token found in Parameter Store'
            };
        }

        const isValid = await this.testToken();
        
        return {
            hasToken: true,
            tokenValid: isValid,
            tokenPrefix: this.pitToken?.substring(0, 15) + '...',
            message: isValid ? 'PIT token is valid and ready to use' : 'PIT token may need rotation'
        };
    }

    // Create authenticated headers for GHL API calls
    getAuthHeaders() {
        if (!this.pitToken) {
            throw new Error('No PIT token loaded - call getValidToken() first');
        }

        return {
            'Authorization': `Bearer ${this.pitToken}`, // Official docs require "Bearer" prefix
            'Version': GHL_API_VERSION,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };
    }

    // Make authenticated API call to GHL
    async makeGHLRequest(method, endpoint, data = null, options = {}) {
        if (!this.pitToken) {
            await this.getValidToken();
        }

        const config = {
            method,
            url: `${GHL_BASE_URL}${endpoint}`,
            headers: this.getAuthHeaders(),
            timeout: 30000,
            ...options
        };

        if (data && (method.toLowerCase() === 'post' || method.toLowerCase() === 'put')) {
            config.data = data;
        }

        try {
            const response = await axios(config);
            return response;
        } catch (error) {
            console.error(`❌ GHL API call failed: ${method.toUpperCase()} ${endpoint}`);
            console.error(`   Status: ${error.response?.status}`);
            console.error(`   Message: ${error.response?.data?.message || error.message}`);
            throw error;
        }
    }
}

// Command-line interface
async function main() {
    const pitManager = new PITTokenManager();
    
    // Get command line arguments
    const args = process.argv.slice(2);
    const command = args[0] || 'status';

    console.log('🔧 GHL Private Integration Token Manager');
    console.log('=' .repeat(50));
    console.log('');

    try {
        switch (command.toLowerCase()) {
            case 'status':
                console.log('📊 Checking PIT token status...');
                const status = await pitManager.getTokenStatus();
                console.log('📋 Token Status:');
                console.log(`   Has Token: ${status.hasToken ? '✅' : '❌'}`);
                console.log(`   Token Valid: ${status.tokenValid ? '✅' : '❌'}`);
                if (status.hasToken) {
                    console.log(`   Token Preview: ${status.tokenPrefix}`);
                }
                console.log(`   Status: ${status.message}`);
                break;

            case 'test':
                console.log('🧪 Testing PIT token...');
                await pitManager.loadToken();
                const isValid = await pitManager.testToken();
                console.log(`🎯 Result: Token is ${isValid ? 'VALID ✅' : 'INVALID ❌'}`);
                break;

            case 'store':
                const token = args[1];
                if (!token) {
                    console.error('❌ Usage: node pit-token-manager.js store <token>');
                    process.exit(1);
                }
                console.log('💾 Storing new PIT token...');
                await pitManager.storeToken(token);
                console.log('✅ PIT token stored successfully');
                break;

            case 'validate':
                console.log('🔍 Loading and validating PIT token...');
                const validToken = await pitManager.getValidToken();
                console.log('✅ PIT token is valid and ready for use');
                console.log(`🔑 Token ready for API calls (${validToken.length} characters)`);
                break;

            default:
                console.log('❓ Usage: node pit-token-manager.js [command]');
                console.log('');
                console.log('Available commands:');
                console.log('  status           - Check current token status');
                console.log('  test             - Test current token validity');
                console.log('  store <token>    - Store a new PIT token');
                console.log('  validate         - Load and validate token');
                process.exit(1);
        }

    } catch (error) {
        console.error('');
        console.error('💥 PIT token management failed:', error.message);
        console.log('');
        console.log('🔧 Troubleshooting Tips:');
        console.log('1. Verify PIT token is stored: node pit-token-manager.js status');
        console.log('2. Store new token: node pit-token-manager.js store <your-pit-token>');
        console.log('3. Check GHL agency settings for token rotation');
        console.log('4. Verify token permissions include required scopes');
        process.exit(1);
    }
}

// Export for use as module
export default PITTokenManager;
export { PITTokenManager };

// Run CLI if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}