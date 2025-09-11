// contact-manager.js - Handles all GHL contact operations
import axios from 'axios';
import jwt from 'jsonwebtoken';

const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-07-28';

// Function to extract location ID from JWT access token
function getLocationIdFromToken(accessToken) {
    try {
        const decoded = jwt.decode(accessToken);
        const locationId = decoded?.authClassId || decoded?.primaryAuthClassId;
        if (locationId) {
            console.log('Extracted location ID from token:', locationId);
            return locationId;
        }
        console.error('No location ID found in token');
        return null;
    } catch (error) {
        console.error('Error decoding access token:', error.message);
        return null;
    }
}

// Function to get contact by ID from GHL
export async function getContactById(contactId, accessToken) {
    try {
        const response = await axios.get(`${GHL_BASE_URL}/contacts/${contactId}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Version': GHL_API_VERSION,
                'Content-Type': 'application/json'
            }
        });
        
        return response.data.contact;
    } catch (error) {
        console.error('Error getting contact by ID:', error.response?.data || error.message);
        throw error;
    }
}

// Function to search for contact by phone number in GHL
export async function findContactByPhone(phoneNumber, accessToken) {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const locationId = getLocationIdFromToken(accessToken);
    
    try {
        const response = await axios.get(`${GHL_BASE_URL}/contacts/`, {
            params: {
                locationId: locationId,
                query: normalizedPhone,
                limit: 1
            },
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Version': GHL_API_VERSION,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.data.contacts && response.data.contacts.length > 0) {
            return response.data.contacts[0]; // Return first match
        }
        
        return null; // No contact found
    } catch (error) {
        console.error('Error searching for contact by phone:', error.response?.data || error.message);
        throw error;
    }
}

// Function to update contact in GHL
export async function updateContact(contactId, updateData, accessToken) {
    // For contact updates, do NOT include locationId - it's already known from the contact
    const payload = {
        ...updateData
    };
    
    try {
        const response = await axios.put(`${GHL_BASE_URL}/contacts/${contactId}`, payload, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Version': GHL_API_VERSION,
                'Content-Type': 'application/json'
            }
        });
        
        return response.data;
    } catch (error) {
        console.error('Error updating contact:', error.response?.data || error.message);
        throw error;
    }
}

// Function to create new contact in GHL
export async function createContact(contactData, accessToken) {
    const locationId = getLocationIdFromToken(accessToken);
    
    const payload = {
        locationId: locationId,
        ...contactData
    };
    
    try {
        const response = await axios.post(`${GHL_BASE_URL}/contacts/`, payload, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Version': GHL_API_VERSION,
                'Content-Type': 'application/json'
            }
        });
        
        return response.data;
    } catch (error) {
        console.error('Error creating contact:', error.response?.data || error.message);
        throw error;
    }
}

// Function to normalize phone numbers for matching
function normalizePhoneNumber(phone) {
    if (!phone) return null;
    
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Handle US phone numbers
    if (cleaned.length === 10) {
        return `+1${cleaned}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
        return `+${cleaned}`;
    }
    
    return `+${cleaned}`;
}