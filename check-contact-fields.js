#!/usr/bin/env node

// Check the current field values in GoHighLevel contact
import { CustomFieldsManager } from './custom-fields-manager.js';
import axios from 'axios';

async function checkContactFields() {
    console.log('🔍 CHECKING CURRENT CONTACT FIELD VALUES');
    console.log('================================================================================');
    
    try {
        const manager = new CustomFieldsManager();
        await manager.initialize();
        
        const contactId = 'jjYOawhhinftLJSQG3J2';
        
        // Get the current contact data from GoHighLevel
        const response = await axios.get(`https://services.leadconnectorhq.com/contacts/${contactId}`, {
            headers: {
                'Authorization': `Bearer ${manager.pitToken}`,
                'Version': '2021-07-28'
            }
        });
        
        const contact = response.data.contact;
        
        console.log(`👤 Contact: ${contact.firstName} ${contact.lastName}`);
        console.log(`📞 Phone: ${contact.phone}`);
        console.log('');
        console.log('🎯 CURRENT FIELD VALUES (What is actually stored in GHL):');
        console.log('');
        
        if (contact.customFields && contact.customFields.length > 0) {
            // Sort by field name for easier reading
            const sortedFields = contact.customFields
                .filter(field => field.value && field.value.trim() !== '')
                .sort((a, b) => a.name.localeCompare(b.name));
            
            if (sortedFields.length > 0) {
                sortedFields.forEach(field => {
                    const value = field.value;
                    const truncated = value.length > 60 ? value.substring(0, 60) + '...' : value;
                    console.log(`📌 ${field.name}: "${truncated}"`);
                });
                
                console.log('');
                console.log('✅ Field analysis:');
                
                // Check specific fields we care about
                const checkFields = [
                    'Motivation', 'Expectations', 'Timeline', 
                    'Disappointments', 'Concerns', 'Openness to Re-list',
                    'Latest Call Summary', 'Voice Memory', 'Last Contact'
                ];
                
                checkFields.forEach(fieldName => {
                    const field = sortedFields.find(f => f.name === fieldName);
                    if (field && field.value && field.value.trim() !== '') {
                        const status = validateField(fieldName, field.value);
                        console.log(`   ${fieldName}: ${status}`);
                    } else {
                        console.log(`   ${fieldName}: ❌ EMPTY or NOT SET`);
                    }
                });
                
            } else {
                console.log('❌ No fields with values found');
            }
        } else {
            console.log('❌ No custom fields found on contact');
        }
        
    } catch (error) {
        console.error('❌ Error checking contact fields:', error.response?.data || error.message);
    }
}

function validateField(fieldName, value) {
    const lowerValue = value.toLowerCase();
    
    switch (fieldName) {
        case 'Motivation':
            if (lowerValue.includes('commission') && lowerValue.includes('money')) return '✅ CORRECT (has commission + money)';
            if (lowerValue.includes('commission') || lowerValue.includes('money')) return '⚠️ PARTIAL (has one element)';
            return '❌ INCORRECT (missing expected content)';
            
        case 'Expectations':
            if (lowerValue.includes('1.05') || lowerValue.includes('million')) return '✅ CORRECT (has price)';
            if (lowerValue.includes('money') || lowerValue.includes('dollar')) return '⚠️ PARTIAL (has value concept)';
            if (lowerValue.includes('fair market value')) return '❌ FALLBACK VALUE';
            return '❌ INCORRECT';
            
        case 'Timeline':
            if (lowerValue.includes('year') || lowerValue.includes('end')) return '✅ CORRECT';
            return '❌ INCORRECT';
            
        case 'Disappointments':
            if (lowerValue.includes('buyer') && lowerValue.includes('quality')) return '✅ CORRECT';
            if (lowerValue.includes('market conditions')) return '❌ FALLBACK VALUE';
            return '❌ INCORRECT';
            
        case 'Concerns':
            if (lowerValue.includes('buyer') && lowerValue.includes('quality')) return '✅ CORRECT';
            return '❌ INCORRECT';
            
        case 'Openness to Re-list':
            if (lowerValue.includes('yes') && lowerValue.includes('commission')) return '✅ CORRECT';
            if (lowerValue.includes('not discussed')) return '❌ FALLBACK VALUE';
            return '❌ INCORRECT';
            
        case 'Voice Memory':
            if (value.includes('[')) return '✅ TIMESTAMPED (appending format)';
            return '⚠️ NOT TIMESTAMPED (old format)';
            
        case 'Latest Call Summary':
            if (value.length > 100) return '✅ POPULATED';
            return '❌ TOO SHORT';
            
        case 'Last Contact':
            if (value.match(/\d{4}-\d{2}-\d{2}/)) return '✅ DATE FORMAT';
            return '❌ INCORRECT FORMAT';
            
        default:
            return '➖ OTHER';
    }
}

checkContactFields();