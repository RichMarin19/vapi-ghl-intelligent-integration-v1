
// Enhanced payload handling for VAPI webhooks - handles both test and live structures
function parseVAPIWebhookPayload(event) {
    console.log('🔍 ENHANCED: Parsing VAPI webhook payload...');
    console.log('📦 Raw event type:', typeof event);
    console.log('📦 Raw event keys:', Object.keys(event));
    
    let payload;
    
    // Handle different Lambda event structures
    if (typeof event.body === 'string') {
        // Lambda Function URL or API Gateway with string body
        console.log('📦 Parsing string event.body (length:', event.body.length, ')');
        try {
            payload = JSON.parse(event.body);
        } catch (parseError) {
            console.error('❌ Failed to parse event.body as JSON:', parseError);
            throw new Error('Invalid JSON in request body');
        }
    } else if (event.body && typeof event.body === 'object') {
        // Lambda with object body
        console.log('📦 Using object event.body');
        payload = event.body;
    } else if (event.message?.type) {
        // Direct VAPI webhook (test scenarios)
        console.log('📦 Using direct event (test scenario)');
        payload = event;
    } else {
        console.log('📦 Unknown event structure, using event as payload');
        payload = event;
    }
    
    console.log('✅ Payload parsed, keys:', Object.keys(payload));
    return payload;
}

// Enhanced transcript extraction that works with all VAPI payload variants
function extractTranscriptFromVAPIPayload(payload) {
    console.log('🔍 ENHANCED: Extracting transcript from VAPI payload...');
    
    // List all possible transcript locations based on VAPI documentation and real examples
    const transcriptLocations = [
        // Standard locations
        { path: 'message.call.transcript', desc: 'Standard VAPI call transcript' },
        { path: 'call.transcript', desc: 'Direct call transcript' },
        
        // Analysis locations
        { path: 'message.call.analysis.transcript', desc: 'Analysis transcript' },
        { path: 'message.analysis.transcript', desc: 'Message analysis transcript' },
        { path: 'call.analysis.transcript', desc: 'Call analysis transcript' },
        
        // Artifact locations (VAPI sometimes stores data here)
        { path: 'message.call.artifact.transcript', desc: 'Artifact transcript' },
        { path: 'call.artifact.transcript', desc: 'Call artifact transcript' },
        
        // Alternative locations
        { path: 'message.transcript', desc: 'Message level transcript' },
        { path: 'transcript', desc: 'Root level transcript' },
        
        // Structured data locations
        { path: 'message.call.analysis.structuredData.transcript', desc: 'Structured data transcript' },
        { path: 'message.analysis.structuredData.transcript', desc: 'Message structured transcript' }
    ];
    
    // Helper function to get nested property
    const getNestedValue = (obj, path) => {
        return path.split('.').reduce((current, key) => 
            current && current[key] !== undefined ? current[key] : null, obj);
    };
    
    // Try each location
    for (const location of transcriptLocations) {
        const transcript = getNestedValue(payload, location.path);
        console.log(`🔍 Checking ${location.path}: ${transcript ? `✅ Found (${transcript.length} chars)` : '❌ Not found'}`);
        
        if (transcript && typeof transcript === 'string' && transcript.trim().length > 0) {
            console.log(`✅ Using transcript from: ${location.path}`);
            console.log(`📄 Transcript preview: "${transcript.substring(0, 100)}..."`);
            return transcript.trim();
        }
    }
    
    // Check for transcript in artifact messages array (VAPI 2024+ sometimes uses this)
    const artifactMessages = getNestedValue(payload, 'message.call.artifact.messages') || 
                            getNestedValue(payload, 'call.artifact.messages');
    
    if (Array.isArray(artifactMessages)) {
        console.log('🔍 Checking artifact messages array for transcript...');
        for (const message of artifactMessages) {
            if (message.content && typeof message.content === 'string' && 
                (message.role === 'assistant' || message.type === 'transcript')) {
                console.log('✅ Found transcript in artifact messages');
                return message.content.trim();
            }
        }
    }
    
    // Last resort: look for any string field containing conversational content
    console.log('🔍 Last resort: searching for conversational content...');
    const searchForConversation = (obj, path = '') => {
        if (typeof obj === 'string' && obj.length > 50 && 
            (obj.includes('Hello') || obj.includes('Hi') || obj.includes('?') || obj.includes('I am'))) {
            console.log(`✅ Found potential transcript at: ${path}`);
            return obj.trim();
        }
        
        if (typeof obj === 'object' && obj !== null) {
            for (const [key, value] of Object.entries(obj)) {
                const result = searchForConversation(value, path ? `${path}.${key}` : key);
                if (result) return result;
            }
        }
        
        return null;
    };
    
    const foundTranscript = searchForConversation(payload);
    if (foundTranscript) return foundTranscript;
    
    console.log('❌ No transcript found in any location');
    console.log('📊 Available payload structure (first 500 chars):');
    console.log(JSON.stringify(payload, null, 2).substring(0, 500) + '...');
    
    return null;
}

// Export the enhanced functions
export { parseVAPIWebhookPayload, extractTranscriptFromVAPIPayload };
