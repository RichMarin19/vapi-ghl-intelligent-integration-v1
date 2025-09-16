// custom-fields-manager.js - Manages custom field updates using AI-extracted data
// Integrates AI transcript extraction with GoHighLevel V2 API

import { TranscriptAIExtractor } from './transcript-ai-extractor.js';
import { PITTokenManager } from './pit-token-manager.js';
import axios from 'axios';

const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-07-28';
const GHL_LOCATION_ID = 'Tty8tmfsIBN4DdOVzgVa'; // Known location ID

class CustomFieldsManager {
    constructor() {
        this.pitTokenManager = new PITTokenManager();
        this.aiExtractor = new TranscriptAIExtractor();
        this.customFieldMappings = null;
        this.fieldCache = new Map();
    }

    // Initialize the manager by loading custom field mappings
    async initialize() {
        try {
            console.log('🔧 Initializing Custom Fields Manager...');
            
            // Ensure valid access token
            await this.pitTokenManager.getValidToken();
            
            // Load custom field mappings
            await this.loadCustomFieldMappings();
            
            console.log('✅ Custom Fields Manager initialized successfully');
            return true;
            
        } catch (error) {
            console.error('❌ Failed to initialize Custom Fields Manager:', error.message);
            return false;
        }
    }

    // Load custom field mappings from GoHighLevel
    async loadCustomFieldMappings() {
        try {
            console.log('📋 Loading custom field mappings...');
            
            const response = await axios.get(`${GHL_BASE_URL}/locations/${GHL_LOCATION_ID}/customFields`, {
                headers: {
                    'Authorization': `Bearer ${this.pitTokenManager.pitToken}`,
                    'Version': GHL_API_VERSION,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            });

            const customFields = response.data.customFields || [];
            console.log(`📊 Retrieved ${customFields.length} custom fields from GoHighLevel`);

            // Create field mapping lookup
            this.customFieldMappings = {};
            
            customFields.forEach(field => {
                // Map field names to their IDs and properties
                const normalizedName = this.normalizeFieldName(field.name);
                this.customFieldMappings[normalizedName] = {
                    fieldId: field.id,
                    fieldName: field.name,
                    dataType: field.dataType,
                    isRequired: field.isRequired || false,
                    options: field.options || []
                };
                
                console.log(`🔗 Mapped field: "${field.name}" -> ${field.id} (${field.dataType})`);
            });

            console.log(`✅ Custom field mappings loaded: ${Object.keys(this.customFieldMappings).length} fields mapped`);
            return this.customFieldMappings;
            
        } catch (error) {
            console.error('❌ Failed to load custom field mappings:', error.message);
            throw error;
        }
    }

    // Normalize field names for consistent mapping
    normalizeFieldName(fieldName) {
        return fieldName
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '') // Remove special characters
            .replace(/\s+/g, ''); // Remove spaces
    }

    // Create field name aliases for better AI mapping
    getFieldNameAliases() {
        return {
            'askingprice': 'expectations', // Map asking price to expectations field
            'propertytype': 'latestcalltranscript', // No specific property type field, use transcript
            'pricerange': 'expectations', // Map price range to expectations field  
            'currentsituation': 'latestcalltranscript', // Current situation -> transcript
            'appointmentbooked': 'appointmentbooked', // Direct mapping
            'callattemptcounter': 'callattemptcounter' // Direct mapping
        };
    }

    // Process VAPI call and update custom fields
    async processVAPICall(callData, contactId) {
        try {
            console.log('🎯 Processing VAPI call for custom fields update...');
            console.log(`📞 Call ID: ${callData.call?.id || 'unknown'}`);
            console.log(`👤 Contact ID: ${contactId}`);

            if (!contactId) {
                throw new Error('Contact ID is required for custom fields update');
            }

            // Initialize if needed
            if (!this.customFieldMappings) {
                const initialized = await this.initialize();
                if (!initialized) {
                    throw new Error('Failed to initialize Custom Fields Manager');
                }
            }

            // Extract transcript from call data
            const transcript = this.extractTranscript(callData);
            if (!transcript) {
                console.log('⚠️ No transcript available for AI extraction');
                return {
                    success: false,
                    message: 'No transcript available',
                    fieldsUpdated: 0
                };
            }

            console.log(`📄 Transcript found (${transcript.length} characters)`);

            // Get existing field data for appending (especially Voice Memory)
            const existingFieldData = await this.getExistingFieldData(contactId);

            // Use AI to extract data from transcript
            const extractedData = await this.aiExtractor.extractDataFromTranscript(transcript, callData, existingFieldData);
            const fieldsToExtract = Object.keys(extractedData).filter(key => !key.startsWith('_'));
            
            console.log(`🤖 AI extraction completed: ${fieldsToExtract.length} fields extracted`);

            if (fieldsToExtract.length === 0) {
                console.log('ℹ️ No relevant data extracted from transcript');
                return {
                    success: true,
                    message: 'No relevant data found in transcript',
                    fieldsUpdated: 0,
                    extractedData: extractedData
                };
            }

            // Map extracted data to custom fields and update contact
            const updateResult = await this.updateContactCustomFields(contactId, extractedData);
            
            // Check if appointment was booked and increment call counter
            const additionalUpdates = await this.processAdditionalFields(callData, contactId);
            
            console.log(`✅ Custom fields update completed: ${updateResult.fieldsUpdated} fields updated`);
            
            return {
                success: true,
                message: `Successfully updated ${updateResult.fieldsUpdated + additionalUpdates.fieldsUpdated} custom fields`,
                fieldsUpdated: updateResult.fieldsUpdated + additionalUpdates.fieldsUpdated,
                updatedFields: [...updateResult.updatedFields, ...additionalUpdates.updatedFields],
                extractedData: extractedData,
                warnings: [...updateResult.warnings, ...additionalUpdates.warnings]
            };
            
        } catch (error) {
            console.error('❌ Failed to process VAPI call for custom fields:', error.message);
            return {
                success: false,
                message: error.message,
                fieldsUpdated: 0,
                error: error.message
            };
        }
    }

    // Process additional fields like appointment booked and call counter
    async processAdditionalFields(callData, contactId) {
        const additionalUpdates = {
            fieldsUpdated: 0,
            updatedFields: [],
            warnings: []
        };

        try {
            console.log('🔍 Processing additional fields (appointment booked, call counter)...');

            // Check if an appointment was booked during this call
            const appointmentBooked = this.wasAppointmentBooked(callData);
            
            // Get current call counter and increment
            const currentCounter = await this.getCurrentCallCounter(contactId);
            const newCounter = currentCounter + 1;

            // Prepare additional field updates
            const additionalFields = {};
            
            if (appointmentBooked) {
                additionalFields['appointmentbooked'] = { value: 'true', confidence: 100 };
                console.log('✅ Appointment was booked - marking field as true');
            }
            
            additionalFields['callattemptcounter'] = { value: newCounter.toString(), confidence: 100 };
            console.log(`✅ Incrementing call counter: ${currentCounter} -> ${newCounter}`);

            // Update these fields if mappings exist
            const additionalUpdateResult = await this.updateContactCustomFields(contactId, additionalFields);
            
            return {
                fieldsUpdated: additionalUpdateResult.fieldsUpdated,
                updatedFields: additionalUpdateResult.updatedFields,
                warnings: additionalUpdateResult.warnings
            };

        } catch (error) {
            console.error('⚠️ Error processing additional fields:', error.message);
            additionalUpdates.warnings.push(`Failed to process additional fields: ${error.message}`);
            return additionalUpdates;
        }
    }

    // Check if appointment was booked during the call
    wasAppointmentBooked(callData) {
        // Look for appointment booking indicators in the call transcript or structure
        const transcript = callData.message?.transcript || '';
        const summary = callData.message?.analysis?.summary || '';
        
        // Check for appointment-related keywords
        const appointmentKeywords = [
            'appointment',
            'schedule',
            'booked',
            'calendar',
            'preview',
            'meeting',
            'visit',
            'stopping by'
        ];

        const textToCheck = (transcript + ' ' + summary).toLowerCase();
        const hasAppointmentKeywords = appointmentKeywords.some(keyword => textToCheck.includes(keyword));
        
        // Look for successful appointment creation in VAPI artifact messages
        if (callData.message?.artifact?.messages) {
            for (const message of callData.message.artifact.messages) {
                if (message.role === 'tool_call_result' && message.name === 'create_appointment') {
                    try {
                        const result = typeof message.result === 'string' ? JSON.parse(message.result) : message.result;
                        if (result.id || result.status === 'booked') {
                            console.log('🎯 Found successful appointment creation in tool call results');
                            return true;
                        }
                    } catch (e) {
                        // Continue checking other indicators
                    }
                }
            }
        }

        return hasAppointmentKeywords;
    }

    // Get existing field data for appending (especially Voice Memory)
    async getExistingFieldData(contactId) {
        try {
            console.log('📋 Retrieving existing field data for appending...');
            
            // Get current contact data
            const response = await axios.get(`${GHL_BASE_URL}/contacts/${contactId}`, {
                headers: {
                    'Authorization': `Bearer ${this.pitTokenManager.pitToken}`,
                    'Version': GHL_API_VERSION,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            });

            const contact = response.data.contact || response.data;
            const customFields = contact.customFields || [];
            
            const existingData = {};
            
            // Extract Voice Memory and other fields that might need appending
            const voiceMemoryMapping = this.customFieldMappings['voice memory'];
            if (voiceMemoryMapping) {
                const voiceMemoryField = customFields.find(field => field.id === voiceMemoryMapping.fieldId);
                if (voiceMemoryField && voiceMemoryField.value) {
                    existingData['Voice Memory'] = voiceMemoryField.value;
                    console.log(`📝 Found existing Voice Memory: ${voiceMemoryField.value.substring(0, 100)}...`);
                }
            }

            return existingData;

        } catch (error) {
            console.error('⚠️ Failed to get existing field data:', error.message);
            return {}; // Return empty object if we can't get existing data
        }
    }

    // Get current call attempt counter value
    async getCurrentCallCounter(contactId) {
        try {
            // Get current contact data to check existing counter
            const response = await axios.get(`${GHL_BASE_URL}/contacts/${contactId}`, {
                headers: {
                    'Authorization': `Bearer ${this.pitTokenManager.pitToken}`,
                    'Version': GHL_API_VERSION,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            });

            const contact = response.data.contact || response.data;
            const customFields = contact.customFields || [];
            
            // Find the call counter field
            const counterMapping = this.customFieldMappings['callattemptcounter'];
            if (counterMapping) {
                const counterField = customFields.find(field => field.id === counterMapping.fieldId);
                if (counterField && counterField.value) {
                    const currentValue = parseInt(counterField.value) || 0;
                    console.log(`📊 Current call counter: ${currentValue}`);
                    return currentValue;
                }
            }

            console.log('📊 No existing call counter found, starting from 0');
            return 0;

        } catch (error) {
            console.error('⚠️ Failed to get current call counter:', error.message);
            return 0; // Default to 0 if we can't get current value
        }
    }

    // Extract transcript from VAPI call data with comprehensive location checking
    extractTranscript(callData) {
        console.log('🔍 Custom Fields Manager - Extracting transcript...');
        console.log('📦 CallData structure:', {
            hasCall: !!callData.call,
            hasMessage: !!callData.message,
            callDataKeys: Object.keys(callData),
            callKeys: callData.call ? Object.keys(callData.call) : null,
            messageKeys: callData.message ? Object.keys(callData.message) : null
        });

        // Try multiple sources for transcript in order of likelihood
        const transcriptSources = [
            {
                path: 'call.transcript',
                value: callData.call?.transcript,
                description: 'Direct call transcript'
            },
            {
                path: 'message.call.transcript', 
                value: callData.message?.call?.transcript,
                description: 'Message call transcript'
            },
            {
                path: 'call.analysis.transcript',
                value: callData.call?.analysis?.transcript,
                description: 'Call analysis transcript'
            },
            {
                path: 'message.call.analysis.transcript',
                value: callData.message?.call?.analysis?.transcript,
                description: 'Message call analysis transcript'
            },
            {
                path: 'call.artifact.transcript',
                value: callData.call?.artifact?.transcript,
                description: 'Call artifact transcript'
            },
            {
                path: 'message.transcript',
                value: callData.message?.transcript,
                description: 'Direct message transcript'
            },
            {
                path: 'call.analysis.structuredData.transcript',
                value: callData.call?.analysis?.structuredData?.transcript,
                description: 'Structured data transcript'
            }
        ];

        for (const source of transcriptSources) {
            console.log(`🔍 Checking ${source.path}: ${source.value ? `✅ Found (${source.value.length} chars)` : '❌ Not found'}`);
            
            if (source.value && typeof source.value === 'string' && source.value.length > 0) {
                console.log(`✅ Using transcript from: ${source.path} (${source.description})`);
                console.log(`📄 Transcript preview: "${source.value.substring(0, 150)}..."`);
                return source.value;
            }
        }

        // Check for transcript in artifact messages (VAPI sometimes puts it here)
        if (callData.call?.artifact?.messages && Array.isArray(callData.call.artifact.messages)) {
            console.log('🔍 Checking artifact messages for transcript...');
            for (const message of callData.call.artifact.messages) {
                if (message.content && typeof message.content === 'string' && message.content.includes('transcript')) {
                    console.log('✅ Found potential transcript in artifact messages');
                    return message.content;
                }
            }
        }

        console.log('❌ No transcript found in any expected location');
        console.log('📊 Available data structure:');
        console.log(JSON.stringify(callData, null, 2).substring(0, 1000) + '...');
        
        return null;
    }

    // Update contact custom fields with extracted data
    async updateContactCustomFields(contactId, extractedData) {
        try {
            const warnings = [];
            
            console.log('🔄 Mapping extracted data to custom fields...');

            // Track field conflicts to prevent duplicates
            const fieldUpdates = new Map();
            
            // Map extracted data to actual custom field IDs
            for (const [fieldName, fieldData] of Object.entries(extractedData)) {
                if (fieldName.startsWith('_')) continue; // Skip metadata
                
                // Skip invalid or garbage values - COMPREHENSIVE CHECK
                // Exception for numerical fields like call attempt counter
                const isNumericalField = fieldName.toLowerCase().includes('counter') || 
                                       fieldName.toLowerCase().includes('count') ||
                                       fieldName.toLowerCase().includes('number');
                
                const isGarbageValue = !fieldData.value || 
                                     (!isNumericalField && fieldData.value.length < 2) || 
                                     fieldData.value.match(/^\d+\s*m$/) ||
                                     fieldData.value.match(/^[,\s]+$/) ||
                                     fieldData.value.match(/^[a-z]\s*m$/) ||
                                     fieldData.value.trim() === '';
                                     
                if (isGarbageValue) {
                    console.warn(`⚠️ Skipping garbage value for ${fieldName}: "${fieldData.value}"`);
                    continue;
                }
                
                let normalizedName = this.normalizeFieldName(fieldName);
                let fieldMapping = this.customFieldMappings[normalizedName];
                
                // Try field aliases if direct mapping not found
                if (!fieldMapping) {
                    const aliases = this.getFieldNameAliases();
                    const aliasName = aliases[normalizedName];
                    if (aliasName) {
                        const aliasNormalized = this.normalizeFieldName(aliasName);
                        fieldMapping = this.customFieldMappings[aliasNormalized];
                        if (fieldMapping) {
                            console.log(`🔗 Using field alias: ${fieldName} -> ${aliasName}`);
                        }
                    }
                }
                
                if (!fieldMapping) {
                    console.warn(`⚠️ No mapping found for extracted field: ${fieldName}`);
                    warnings.push(`No mapping found for field: ${fieldName}`);
                    continue;
                }

                // Validate and format the value for the field type
                const formattedValue = this.formatValueForField(fieldData.value, fieldMapping);
                
                if (formattedValue === null) {
                    console.warn(`⚠️ Invalid value for field ${fieldName}: "${fieldData.value}"`);
                    warnings.push(`Invalid value for field ${fieldName}: "${fieldData.value}"`);
                    continue;
                }

                // Check for conflicts - prioritize higher confidence values BUT block garbage
                const fieldId = fieldMapping.fieldId;
                if (fieldUpdates.has(fieldId)) {
                    const existing = fieldUpdates.get(fieldId);
                    
                    // Never replace good values with garbage, regardless of confidence
                    const currentIsGarbage = /^\d+\s*m$|^[,\s]+$|^[a-z]\s*m$/.test(formattedValue);
                    const existingIsGarbage = /^\d+\s*m$|^[,\s]+$|^[a-z]\s*m$/.test(existing.value);
                    
                    if (currentIsGarbage && !existingIsGarbage) {
                        console.log(`⚠️ Blocking garbage value "${formattedValue}" from replacing good value "${existing.value}"`);
                        continue;
                    } else if (!currentIsGarbage && existingIsGarbage) {
                        console.log(`🔄 Replacing garbage value "${existing.value}" with good value "${formattedValue}"`);
                    } else if ((fieldData.confidence || 0) <= existing.confidence) {
                        console.log(`⚠️ Skipping duplicate field ${fieldName} (lower confidence than ${existing.fieldName})`);
                        continue;
                    } else {
                        console.log(`🔄 Replacing ${existing.fieldName} with ${fieldName} (higher confidence)`);
                    }
                }

                fieldUpdates.set(fieldId, {
                    id: fieldMapping.fieldId,
                    value: formattedValue,
                    fieldName: fieldMapping.fieldName,
                    confidence: fieldData.confidence || 0
                });
                
                console.log(`📝 Prepared update: ${fieldMapping.fieldName} = "${formattedValue}" (${fieldData.confidence}% confidence)`);
            }
            
            if (fieldUpdates.size === 0) {
                console.log('ℹ️ No valid fields to update after mapping');
                return {
                    fieldsUpdated: 0,
                    updatedFields: [],
                    warnings: warnings
                };
            }

            // Convert map to array for API call
            const fieldsToUpdate = Array.from(fieldUpdates.values());

            // Update contact via GoHighLevel V2 API
            const updatePayload = {
                customFields: fieldsToUpdate.map(field => ({
                    id: field.id,
                    value: field.value
                }))
            };

            console.log(`🚀 Updating contact ${contactId} with ${fieldsToUpdate.length} custom fields...`);
            console.log('📦 API Payload:', JSON.stringify(updatePayload, null, 2));

            const response = await axios.put(`${GHL_BASE_URL}/contacts/${contactId}`, updatePayload, {
                headers: {
                    'Authorization': `Bearer ${this.pitTokenManager.pitToken}`,
                    'Version': GHL_API_VERSION,
                    'Content-Type': 'application/json'
                },
                timeout: 20000
            });

            console.log(`✅ Contact updated successfully (Status: ${response.status})`);

            return {
                fieldsUpdated: fieldsToUpdate.length,
                updatedFields: fieldsToUpdate.map(field => ({
                    fieldName: field.fieldName,
                    value: field.value,
                    confidence: field.confidence
                })),
                warnings: warnings
            };
            
        } catch (error) {
            console.error('❌ Failed to update contact custom fields:', error.message);
            
            // Log detailed API error response
            if (error.response) {
                console.error('🔍 API Error Details:');
                console.error(`   Status: ${error.response.status}`);
                console.error(`   Status Text: ${error.response.statusText}`);
                console.error(`   Response Data:`, JSON.stringify(error.response.data, null, 2));
                console.error(`   Response Headers:`, JSON.stringify(error.response.headers, null, 2));
            }
            
            if (error.response?.status === 404) {
                throw new Error(`Contact not found: ${contactId}`);
            }
            if (error.response?.status === 401) {
                throw new Error('Authentication failed - token may be expired');
            }
            if (error.response?.status === 422) {
                console.error('Validation error details:', error.response.data);
                throw new Error(`Validation error: ${JSON.stringify(error.response.data)}`);
            }
            
            throw error;
        }
    }

    // Format value according to field type requirements
    formatValueForField(value, fieldMapping) {
        if (!value || value === '') {
            return null;
        }

        switch (fieldMapping.dataType?.toLowerCase()) {
            case 'text':
            case 'textarea':
                // Limit text fields to reasonable length
                return value.toString().substring(0, 5000).trim();
                
            case 'number':
                const num = parseFloat(value.toString().replace(/[^\d.-]/g, ''));
                return isNaN(num) ? null : num.toString();
                
            case 'select':
            case 'radio':
                // For select fields, try to match against available options
                if (fieldMapping.options && fieldMapping.options.length > 0) {
                    const matchedOption = this.findMatchingOption(value, fieldMapping.options);
                    return matchedOption ? matchedOption.name : null;
                }
                return value.toString().trim();
                
            case 'checkbox':
                // Convert to boolean-like values
                const lowerValue = value.toString().toLowerCase();
                if (['true', 'yes', '1', 'on', 'checked'].includes(lowerValue)) {
                    return 'true';
                } else if (['false', 'no', '0', 'off', 'unchecked'].includes(lowerValue)) {
                    return 'false';
                }
                return null;
                
            case 'date':
            case 'datetime':
                // Try to parse and format date
                try {
                    const date = new Date(value);
                    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
                } catch {
                    return null;
                }
                
            case 'url':
                // Basic URL validation
                const urlValue = value.toString().trim();
                if (urlValue.startsWith('http://') || urlValue.startsWith('https://')) {
                    return urlValue;
                }
                return `https://${urlValue}`;
                
            case 'email':
                // Basic email validation
                const emailValue = value.toString().trim().toLowerCase();
                if (emailValue.includes('@') && emailValue.includes('.')) {
                    return emailValue;
                }
                return null;
                
            case 'phone':
                // Basic phone formatting
                const phoneValue = value.toString().replace(/[^\d+()-\s]/g, '');
                return phoneValue.trim() || null;
                
            default:
                return value.toString().trim();
        }
    }

    // Find matching option for select fields
    findMatchingOption(value, options) {
        const lowerValue = value.toString().toLowerCase();
        
        // Try exact match first
        let match = options.find(opt => opt.name.toLowerCase() === lowerValue);
        if (match) return match;
        
        // Try partial match
        match = options.find(opt => 
            opt.name.toLowerCase().includes(lowerValue) || 
            lowerValue.includes(opt.name.toLowerCase())
        );
        if (match) return match;
        
        return null;
    }

    // Get processing summary
    getProcessingSummary(result) {
        return {
            success: result.success,
            fieldsUpdated: result.fieldsUpdated || 0,
            extractedFieldsCount: result.extractedData ? 
                Object.keys(result.extractedData).filter(key => !key.startsWith('_')).length : 0,
            warnings: result.warnings || [],
            message: result.message || 'No processing result'
        };
    }

    // Test the custom fields system
    async testCustomFieldsSystem(testTranscript = null) {
        try {
            console.log('🧪 Testing Custom Fields System...');
            
            // Initialize system
            const initialized = await this.initialize();
            if (!initialized) {
                throw new Error('Failed to initialize system');
            }

            // Use test transcript or default
            const transcript = testTranscript || `
                Hello, my name is John and I'm looking to sell my house because we need to relocate to Austin, Texas. 
                I'm hoping to move within 3 months. We currently live in a 3 bedroom, 2 bathroom house. 
                Our budget for the new place is around $500,000. We're a family of 4 with 2 kids. 
                I've been disappointed with other real estate agents who haven't been responsive.
                We need to find something quickly because my job is relocating.
            `;

            // Test AI extraction
            const extractedData = await this.aiExtractor.extractDataFromTranscript(transcript);
            
            console.log('🎯 Test Results:');
            console.log('================');
            console.log(`📊 Custom Fields Available: ${Object.keys(this.customFieldMappings).length}`);
            console.log(`🤖 Fields Extracted: ${Object.keys(extractedData).filter(key => !key.startsWith('_')).length}`);
            
            // Show extracted data
            for (const [fieldName, fieldData] of Object.entries(extractedData)) {
                if (!fieldName.startsWith('_')) {
                    console.log(`   • ${fieldName}: "${fieldData.value}" (${fieldData.confidence}% confidence)`);
                }
            }

            return {
                success: true,
                extractedFieldsCount: Object.keys(extractedData).filter(key => !key.startsWith('_')).length,
                availableFieldsCount: Object.keys(this.customFieldMappings).length,
                extractedData: extractedData
            };
            
        } catch (error) {
            console.error('❌ Custom Fields System test failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Export the class
export default CustomFieldsManager;
export { CustomFieldsManager };