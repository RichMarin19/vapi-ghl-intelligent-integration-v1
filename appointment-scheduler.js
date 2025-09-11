// appointment-scheduler.js - Handles GHL appointment/calendar operations
import axios from 'axios';

const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-07-28';

// Function to create appointment in GHL
export async function createAppointment(appointmentData, accessToken) {
    try {
        const response = await axios.post(`${GHL_BASE_URL}/calendars/events`, appointmentData, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Version': GHL_API_VERSION,
                'Content-Type': 'application/json'
            }
        });
        
        return response.data;
    } catch (error) {
        console.error('Error creating appointment:', error.response?.data || error.message);
        throw error;
    }
}

// Function to get available calendar slots
export async function getCalendarSlots(calendarId, startDate, endDate, accessToken) {
    try {
        const response = await axios.get(`${GHL_BASE_URL}/calendars/${calendarId}/free-slots`, {
            params: {
                startDate,
                endDate
            },
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Version': GHL_API_VERSION,
                'Content-Type': 'application/json'
            }
        });
        
        return response.data;
    } catch (error) {
        console.error('Error getting calendar slots:', error.response?.data || error.message);
        throw error;
    }
}

// Function to process appointment request from VAPI call
export async function processAppointmentRequest(callData, contactId, accessToken) {
    try {
        // Extract appointment details from call data
        const appointmentInfo = extractAppointmentInfo(callData);
        
        if (!appointmentInfo.requested) {
            console.log('No appointment requested in this call');
            return null;
        }
        
        console.log('Appointment requested:', appointmentInfo);
        
        // Here you would create the appointment using createAppointment
        // For now, just log what would be scheduled
        console.log(`Would schedule appointment for contact ${contactId}:`, appointmentInfo);
        
        return {
            message: 'Appointment request processed',
            details: appointmentInfo
        };
        
    } catch (error) {
        console.error('Error processing appointment request:', error.message);
        throw error;
    }
}

// Function to extract appointment information from call data
function extractAppointmentInfo(callData) {
    const { call } = callData;
    
    const appointmentInfo = {
        requested: false,
        date: null,
        time: null,
        type: null,
        notes: null
    };
    
    // Check if appointment was requested in structured data
    if (call?.analysis?.structuredData?.appointment_requested) {
        appointmentInfo.requested = true;
        appointmentInfo.date = call.analysis.structuredData.appointment_date || null;
        appointmentInfo.time = call.analysis.structuredData.appointment_time || null;
        appointmentInfo.type = call.analysis.structuredData.appointment_type || 'consultation';
    }
    
    // Check assistant overrides for appointment time
    if (call?.assistantOverrides?.variableValues?.time) {
        appointmentInfo.requested = true;
        appointmentInfo.date = call.assistantOverrides.variableValues.time;
    }
    
    // Look for appointment keywords in transcript
    const transcript = call?.transcript || '';
    if (transcript.toLowerCase().includes('appointment') || 
        transcript.toLowerCase().includes('schedule') ||
        transcript.toLowerCase().includes('meeting')) {
        appointmentInfo.requested = true;
        appointmentInfo.notes = 'Appointment mentioned in call transcript';
    }
    
    return appointmentInfo;
}