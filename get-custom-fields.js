#!/usr/bin/env node

// Utility script to fetch custom field IDs from GoHighLevel V2 API
// This helps identify field IDs needed for the AI extraction system

import axios from 'axios';
import { PITTokenManager } from './pit-token-manager.js';

const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-07-28';

class CustomFieldsFetcher {
    constructor() {
        this.pitTokenManager = new PITTokenManager();
    }

    // Get all custom fields for the location
    async getCustomFields(locationId) {
        try {
            console.log(`🔍 Fetching custom fields for location: ${locationId}`);
            
            const response = await axios.get(`${GHL_BASE_URL}/locations/${locationId}/customFields`, {
                headers: {
                    'Authorization': `Bearer ${this.pitTokenManager.pitToken}`,
                    'Version': GHL_API_VERSION,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            });

            console.log(`✅ Successfully retrieved ${response.data.customFields?.length || 0} custom fields`);
            return response.data.customFields || [];

        } catch (error) {
            console.error('❌ Error fetching custom fields:', error.message);
            if (error.response?.status === 401) {
                console.log('🔑 Authentication failed. Checking token validity...');
                throw new Error('Invalid or expired access token');
            }
            if (error.response?.status === 404) {
                console.log('🏢 Location not found. Please verify the location ID.');
                throw new Error('Location not found');
            }
            throw error;
        }
    }

    // Display custom fields in a formatted way
    displayCustomFields(customFields) {
        console.log('\n📋 Custom Fields Analysis:');
        console.log('=' .repeat(80));
        
        if (!customFields || customFields.length === 0) {
            console.log('❌ No custom fields found for this location.');
            return;
        }

        // Group by field type for better organization
        const fieldsByType = {};
        
        customFields.forEach(field => {
            const fieldType = field.dataType || 'unknown';
            if (!fieldsByType[fieldType]) {
                fieldsByType[fieldType] = [];
            }
            fieldsByType[fieldType].push(field);
        });

        console.log(`📊 Total Fields Found: ${customFields.length}`);
        console.log(`🏷️  Field Types: ${Object.keys(fieldsByType).join(', ')}`);
        console.log('');

        // Display fields by type
        Object.entries(fieldsByType).forEach(([type, fields]) => {
            console.log(`🔖 ${type.toUpperCase()} Fields (${fields.length}):`);
            console.log('-'.repeat(50));
            
            fields.forEach(field => {
                console.log(`   📝 Name: "${field.name}"`);
                console.log(`   🆔 ID: "${field.id}"`);
                console.log(`   📱 Data Type: ${field.dataType}`);
                
                if (field.options && field.options.length > 0) {
                    console.log(`   🎯 Options: ${field.options.map(opt => `"${opt.name}"`).join(', ')}`);
                }
                
                if (field.isRequired) {
                    console.log(`   ⚠️  Required: Yes`);
                }
                
                console.log('');
            });
        });
    }

    // Generate field mapping for AI extraction
    generateFieldMapping(customFields) {
        console.log('\n🤖 AI Extraction Field Mapping:');
        console.log('=' .repeat(80));
        
        const mapping = customFields.map(field => {
            let extractionHint = '';
            
            // Generate extraction hints based on field name and type
            const fieldName = field.name.toLowerCase();
            
            if (fieldName.includes('motivation') || fieldName.includes('why')) {
                extractionHint = 'Extract customer motivation, pain points, or reasons for interest';
            } else if (fieldName.includes('timeline') || fieldName.includes('time')) {
                extractionHint = 'Extract timeframe, deadlines, or when they need results';
            } else if (fieldName.includes('budget') || fieldName.includes('price')) {
                extractionHint = 'Extract budget information or price range mentioned';
            } else if (fieldName.includes('destination') || fieldName.includes('location')) {
                extractionHint = 'Extract location, destination, or geographic information';
            } else if (fieldName.includes('expectation') || fieldName.includes('expect')) {
                extractionHint = 'Extract customer expectations or desired outcomes';
            } else if (fieldName.includes('disappointment') || fieldName.includes('concern')) {
                extractionHint = 'Extract concerns, disappointments, or negative experiences';
            } else if (fieldName.includes('family') || fieldName.includes('household')) {
                extractionHint = 'Extract family size, household information, or family-related details';
            } else if (fieldName.includes('property') || fieldName.includes('home')) {
                extractionHint = 'Extract property details, home information, or real estate specifics';
            } else {
                extractionHint = `Extract information related to: ${field.name}`;
            }

            return {
                fieldId: field.id,
                fieldName: field.name,
                dataType: field.dataType,
                extractionHint: extractionHint,
                isRequired: field.isRequired || false,
                options: field.options || []
            };
        });

        console.log(JSON.stringify(mapping, null, 2));
        
        return mapping;
    }

    // Main function to fetch and analyze custom fields
    async fetchAndAnalyzeFields() {
        try {
            // Initialize token manager
            console.log('🔧 Initializing GHL token manager...');
            const tokenValid = await this.pitTokenManager.getValidToken();
            
            if (!tokenValid) {
                throw new Error('Failed to get valid access token');
            }

            // Get location ID from environment or use the known location ID
            const locationId = process.env.GHL_LOCATION_ID || 'Tty8tmfsIBN4DdOVzgVa';
            console.log('💡 Using configured location ID from system');

            console.log(`🏢 Using location ID: ${locationId}`);

            // Fetch custom fields
            const customFields = await this.getCustomFields(locationId);
            
            // Display analysis
            this.displayCustomFields(customFields);
            
            // Generate AI mapping
            const mapping = this.generateFieldMapping(customFields);
            
            console.log('\n🎯 Next Steps:');
            console.log('1. Review the field mapping above');
            console.log('2. The AI extraction system will use these mappings');
            console.log('3. Custom field IDs will be used to update contact records');
            
            return {
                customFields,
                mapping,
                locationId
            };

        } catch (error) {
            console.error('\n💥 Failed to fetch custom fields:', error.message);
            console.log('\n🔧 Troubleshooting Tips:');
            console.log('1. Verify GHL_LOCATION_ID is set correctly');
            console.log('2. Check that your Private Integration Token is valid');
            console.log('3. Ensure the location has custom fields configured');
            console.log('4. Run: node pit-token-manager.js status');
            throw error;
        }
    }
}

// Command line interface
async function main() {
    console.log('🔍 GoHighLevel Custom Fields Fetcher');
    console.log('=' .repeat(50));
    console.log('');

    const fetcher = new CustomFieldsFetcher();
    await fetcher.fetchAndAnalyzeFields();
}

// Export for use as module
export default CustomFieldsFetcher;
export { CustomFieldsFetcher };

// Run CLI if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}