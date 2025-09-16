#!/usr/bin/env node

// Debug field mapping issues - check why system fields aren't populating

import { CustomFieldsManager } from './custom-fields-manager.js';
import { TranscriptAIExtractor } from './transcript-ai-extractor.js';

async function debugFieldMapping() {
    console.log('🔍 DEBUGGING FIELD MAPPING ISSUES');
    console.log('================================================================================');
    
    try {
        // Initialize components
        const customFieldsManager = new CustomFieldsManager();
        const aiExtractor = new TranscriptAIExtractor();
        
        console.log('📋 Initializing Custom Fields Manager...');
        await customFieldsManager.initialize();
        
        // Test AI extraction
        console.log('🤖 Testing AI extraction...');
        const testSummary = `The caller mentioned the connection as their motivation. Moving to Missouri by February.`;
        const testCallData = {
            message: { summary: testSummary },
            call: { startedAt: new Date().toISOString() }
        };
        
        const extractedData = await aiExtractor.extractDataFromTranscript('', testCallData);
        
        console.log('🎯 EXTRACTED FIELDS FROM AI:');
        const extractedFields = Object.keys(extractedData).filter(key => !key.startsWith('_'));
        extractedFields.forEach(field => {
            const data = extractedData[field];
            console.log(`   • "${field}": "${data.value}" (${data.confidence}% confidence)`);
        });
        
        console.log('');
        console.log('🔗 FIELD MAPPING ANALYSIS:');
        console.log('   Available GHL fields:', Object.keys(customFieldsManager.customFieldMappings).length);
        
        // Check each extracted field against the mapping
        for (const fieldName of extractedFields) {
            const normalizedName = customFieldsManager.normalizeFieldName(fieldName);
            const directMapping = customFieldsManager.customFieldMappings[normalizedName];
            
            console.log(`\n   Field: "${fieldName}"`);
            console.log(`   Normalized: "${normalizedName}"`);
            console.log(`   Direct mapping: ${directMapping ? '✅ FOUND' : '❌ MISSING'}`);
            
            if (directMapping) {
                console.log(`   Maps to: "${directMapping.fieldName}" (${directMapping.fieldId})`);
            } else {
                // Check aliases
                const aliases = customFieldsManager.getFieldNameAliases();
                const aliasName = aliases[normalizedName];
                if (aliasName) {
                    const aliasNormalized = customFieldsManager.normalizeFieldName(aliasName);
                    const aliasMapping = customFieldsManager.customFieldMappings[aliasNormalized];
                    console.log(`   Alias found: "${aliasName}" -> "${aliasNormalized}"`);
                    console.log(`   Alias mapping: ${aliasMapping ? '✅ FOUND' : '❌ MISSING'}`);
                } else {
                    console.log(`   No alias found`);
                }
            }
        }
        
        console.log('');
        console.log('🎯 SPECIFIC PROBLEM FIELDS CHECK:');
        const problemFields = ['Last Contact', 'latest Call Summary', 'Voice Memory', 'Openness to Re-list'];
        
        for (const field of problemFields) {
            const normalizedName = customFieldsManager.normalizeFieldName(field);
            const mapping = customFieldsManager.customFieldMappings[normalizedName];
            
            console.log(`\n   Problem Field: "${field}"`);
            console.log(`   Normalized to: "${normalizedName}"`);
            console.log(`   Mapping exists: ${mapping ? '✅ YES' : '❌ NO'}`);
            
            if (!mapping) {
                // Check if the exact field name exists in GHL
                const exactMatch = Object.values(customFieldsManager.customFieldMappings)
                    .find(m => m.fieldName === field);
                console.log(`   Exact name in GHL: ${exactMatch ? '✅ YES' : '❌ NO'}`);
                if (exactMatch) {
                    console.log(`   Exact mapping key needed: "${field.toLowerCase()}"`);
                }
            }
        }
        
        console.log('');
        console.log('🔧 RECOMMENDED FIXES:');
        console.log('   1. System fields not mapping due to normalization removing spaces');
        console.log('   2. Need to preserve exact field names for system fields');
        console.log('   3. Field aliases need to be updated for exact GoHighLevel field names');
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
        console.error(error.stack);
    }
}

debugFieldMapping();