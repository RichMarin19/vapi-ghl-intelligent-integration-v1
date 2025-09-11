// vapi-handler.js - Handles VAPI call operations
import axios from 'axios';

const VAPI_API_BASE_URL = 'https://api.vapi.ai';

// Function to create outbound call via VAPI
export async function createVapiCall(phoneNumber, assistantId, assistantOverrides = null, vapiApiKey) {
    if (!vapiApiKey) {
        throw new Error('VAPI API key is required');
    }
    
    const callPayload = {
        phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
        assistantId: assistantId,
        customer: {
            number: phoneNumber
        }
    };
    
    // Include assistant overrides if provided
    if (assistantOverrides) {
        callPayload.assistantOverrides = assistantOverrides;
    }
    
    try {
        const response = await axios.post(`${VAPI_API_BASE_URL}/call`, callPayload, {
            headers: {
                'Authorization': `Bearer ${vapiApiKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        return response.data;
    } catch (error) {
        console.error('Error creating VAPI call:', error.response?.data || error.message);
        throw error;
    }
}

// Function to analyze VAPI call data
export function analyzeVapiCall(callData) {
    const { call } = callData;
    
    const analysis = {
        callId: call?.id || 'unknown',
        duration: calculateCallDuration(call),
        status: call?.status || 'unknown',
        endReason: call?.endedReason || 'unknown',
        customerInfo: {
            name: call?.customer?.name || null,
            number: call?.customer?.number || null
        },
        hasTranscript: !!(call?.transcript || hasArtifactMessages(call)),
        hasStructuredData: !!(call?.analysis?.structuredData),
        contactId: extractContactId(call)
    };
    
    return analysis;
}

// Function to extract contact ID from various sources in VAPI call data
export function extractContactId(call) {
    // 1. Try assistant overrides first (most reliable for test cases)
    if (call?.assistantOverrides?.variableValues?.contactId) {
        const contactId = call.assistantOverrides.variableValues.contactId;
        console.log(`Using contact ID from assistant overrides: ${contactId}`);
        return contactId;
    }
    
    // 2. Extract from artifact tool calls (real VAPI calls)
    if (call?.artifact?.messages && Array.isArray(call.artifact.messages)) {
        for (const message of call.artifact.messages) {
            if (message.role === 'tool_call_result' && message.result) {
                try {
                    const resultData = typeof message.result === 'string' 
                        ? JSON.parse(message.result) 
                        : message.result;
                    
                    // Also check for direct id field in create_contact responses
                    if (resultData.id && message.name === 'create_contact') {
                        const contactId = resultData.id;
                        console.log(`Using contact ID from create_contact result: ${contactId}`);
                        return contactId;
                    }
                } catch (e) {
                    // Skip invalid JSON
                    continue;
                }
            }
        }
    }
    
    // 3. If still not found, extract from most recent create_contact tool call
    if (call?.artifact?.messages && Array.isArray(call.artifact.messages)) {
        // Search backwards for the most recent create_contact result
        for (let i = call.artifact.messages.length - 1; i >= 0; i--) {
            const message = call.artifact.messages[i];
            if (message.role === 'tool_call_result' && message.name === 'create_contact' && message.result) {
                try {
                    const resultData = typeof message.result === 'string' 
                        ? JSON.parse(message.result) 
                        : message.result;
                    
                    if (resultData.contact && resultData.contact.id) {
                        const contactId = resultData.contact.id;
                        console.log(`Using most recent create_contact ID: ${contactId}`);
                        return contactId;
                    }
                } catch (e) {
                    console.log(`Error parsing create_contact result: ${e.message}`);
                }
            }
        }
    }
    
    console.log('No contact ID found in VAPI call data');
    return null;
}

// Helper function to calculate call duration
function calculateCallDuration(call) {
    if (!call?.startedAt || !call?.endedAt) {
        return 'Unknown';
    }
    
    const start = new Date(call.startedAt);
    const end = new Date(call.endedAt);
    const durationMs = end - start;
    const durationMinutes = Math.round(durationMs / 60000);
    return `${durationMinutes} minutes`;
}

// Helper function to check if call has artifact messages
function hasArtifactMessages(call) {
    return call?.artifact?.messages && 
           Array.isArray(call.artifact.messages) && 
           call.artifact.messages.length > 0;
}