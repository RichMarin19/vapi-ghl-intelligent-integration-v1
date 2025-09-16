#!/usr/bin/env node

// Debug field extraction to see why patterns aren't matching
import { IntelligentFieldMapper } from './intelligent-field-mapper.js';

const MICHAEL_JORDAN_SUMMARY = `Olivia, a real estate assistant, called Michael Jordan, an FSBO seller, to understand his situation and offer assistance. Michael, frustrated by agent calls, is looking to sell his home for $1.6 million by February to move to San Francisco, and is open to an agent if the buyer pays the commission. They scheduled a 10-minute preview with Rich Murren for tomorrow, September 17th, at 11:30 AM.`;

async function debugExtraction() {
    console.log('🔍 DEBUGGING FIELD EXTRACTION');
    console.log('================================================================================');
    console.log('📝 Call Summary:', MICHAEL_JORDAN_SUMMARY);
    console.log('');
    
    const mapper = new IntelligentFieldMapper();
    
    // Test each field individually
    const fieldsToTest = ['motivation', 'nextDestination', 'concerns', 'Openness to Re-list'];
    
    for (const fieldName of fieldsToTest) {
        console.log(`🧪 Testing field: ${fieldName}`);
        
        const mapping = mapper.fieldMappings.get(fieldName);
        if (!mapping) {
            console.log(`❌ No mapping found for ${fieldName}`);
            continue;
        }
        
        const text = MICHAEL_JORDAN_SUMMARY.toLowerCase();
        console.log(`📄 Text being searched: "${text.substring(0, 100)}..."`);
        
        // Test the extraction directly
        const result = mapper.extractFieldValue(fieldName, mapping, text, MICHAEL_JORDAN_SUMMARY, {});
        
        if (result) {
            console.log(`✅ Result: "${result.value}" (${result.confidence}% confidence)`);
        } else {
            console.log(`❌ No result - checking patterns manually...`);
            
            console.log(`🔍 Pattern count: ${mapping.patterns.length}`);
            for (let i = 0; i < mapping.patterns.length; i++) {
                const pattern = mapping.patterns[i];
                const matches = [...text.matchAll(pattern)];
                console.log(`   Pattern ${i + 1}: ${matches.length} matches`);
                if (matches.length > 0) {
                    console.log(`      First match: "${matches[0][0]}"`);
                }
            }
            
            // Test business logic directly
            if (mapping.businessLogic) {
                console.log('🧠 Testing business logic directly...');
                const directResult = mapping.businessLogic('', { originalSummary: MICHAEL_JORDAN_SUMMARY, callData: {} });
                console.log(`   Direct business logic result: "${directResult}"`);
            }
        }
        
        console.log('');
    }
}

debugExtraction();