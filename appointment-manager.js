// Appointment Management Module for VAPI-GHL Integration

import { PITTokenManager } from './pit-token-manager.js';
import axios from 'axios';

// Function to analyze transcript for appointment confirmations and extract datetime
function analyzeTranscriptForAppointments(callData) {
    const { call, message } = callData;
    
    console.log('🔍 Analyzing transcript for appointment confirmations and specific times...');
    
    const transcript = call?.transcript || '';
    const summary = message?.summary || call?.analysis?.summary || '';
    const fullText = (transcript + ' ' + summary).toLowerCase();
    
    console.log('📝 Analyzing text:', fullText.substring(0, 200) + '...');
    
    // Check for appointment confirmation phrases from AI assistant
    const confirmationPhrases = [
        'i\'ve scheduled you for',
        'your appointment is booked for',
        'i\'ve booked you for',
        'appointment scheduled for',
        'see you on',
        'you\'re all set for',
        'confirmed your appointment for',
        'appointment confirmed for'
    ];
    
    let appointmentConfirmed = false;
    let confirmationPhrase = '';
    
    for (const phrase of confirmationPhrases) {
        if (fullText.includes(phrase)) {
            appointmentConfirmed = true;
            confirmationPhrase = phrase;
            console.log(`✅ Found appointment confirmation: "${phrase}"`);
            break;
        }
    }
    
    // Extract specific dates and times mentioned
    const dateTimeInfo = extractDateTimeFromText(fullText);
    
    return {
        confirmed: appointmentConfirmed,
        confirmationPhrase: confirmationPhrase,
        extractedDateTime: dateTimeInfo,
        fullTranscript: fullText
    };
}

// Function to extract date/time information from text
function extractDateTimeFromText(text) {
    const dateTimePatterns = {
        // Days of week
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        // Times
        times: /(\d{1,2}):?(\d{2})?\s*(am|pm|a\.m\.|p\.m\.)/gi,
        // Dates
        dates: /(\d{1,2})\/(\d{1,2})\/(\d{2,4})|(\w+)\s+(\d{1,2}),?\s+(\d{4})|(\d{1,2})\s+(st|nd|rd|th)/gi,
        // Relative dates
        relative: /(tomorrow|next\s+week|next\s+\w+day|today)/gi
    };
    
    const extracted = {
        day: null,
        time: null,
        date: null,
        relative: null
    };
    
    // Extract day of week
    for (const day of dateTimePatterns.days) {
        if (text.includes(day)) {
            extracted.day = day;
            console.log(`📅 Found day: ${day}`);
            break;
        }
    }
    
    // Extract time
    const timeMatch = text.match(dateTimePatterns.times);
    if (timeMatch && timeMatch[0]) {
        extracted.time = timeMatch[0];
        console.log(`🕐 Found time: ${timeMatch[0]}`);
    }
    
    // Extract relative dates
    const relativeMatch = text.match(dateTimePatterns.relative);
    if (relativeMatch && relativeMatch[0]) {
        extracted.relative = relativeMatch[0];
        console.log(`📆 Found relative date: ${relativeMatch[0]}`);
    }
    
    return extracted;
}

// Function to detect appointment requests in call data (enhanced)
export function detectAppointmentRequest(callData, extractedData) {
    const { call, message } = callData;
    
    console.log('🗓️ Enhanced appointment detection starting...');
    
    // First, check for appointment confirmations in transcript
    const transcriptAnalysis = analyzeTranscriptForAppointments(callData);
    
    if (transcriptAnalysis.confirmed) {
        console.log('✅ Appointment confirmation found in transcript!');
        return {
            requested: true,
            confirmed: true,
            keywords: [transcriptAnalysis.confirmationPhrase],
            reason: 'transcript_confirmation',
            dateTimeInfo: transcriptAnalysis.extractedDateTime,
            confirmationPhrase: transcriptAnalysis.confirmationPhrase
        };
    }
    
    // Fallback to keyword detection
    const transcript = call?.transcript || '';
    const summary = message?.summary || call?.analysis?.summary || '';
    
    const appointmentKeywords = [
        'appointment', 'meeting', 'schedule', 'book', 'consultation',
        'visit', 'follow-up', 'follow up', 'call back', 'callback'
    ];
    
    const textToCheck = (transcript + ' ' + summary).toLowerCase();
    const foundKeywords = appointmentKeywords.filter(keyword => 
        textToCheck.includes(keyword)
    );
    
    // Check structured data for appointment request
    const structuredAppointmentRequest = extractedData?.appointmentRequested || 
                                       call?.analysis?.structuredData?.appointmentRequested ||
                                       call?.analysis?.structuredData?.needsFollowUp;
    
    const hasAppointmentRequest = foundKeywords.length > 0 || structuredAppointmentRequest;
    
    if (hasAppointmentRequest) {
        console.log('✅ Appointment request detected via keywords:', foundKeywords.length > 0 ? foundKeywords : 'structured data');
        return {
            requested: true,
            confirmed: false,
            keywords: foundKeywords,
            reason: foundKeywords.length > 0 ? 'transcript_keywords' : 'structured_data',
            dateTimeInfo: transcriptAnalysis.extractedDateTime
        };
    }
    
    console.log('❌ No appointment request detected');
    return { requested: false };
}

// Function to check if appointment already exists in calendar
async function checkExistingAppointments(contactId, calendarId, pitTokenManager, expectedDateTime = null) {
    try {
        console.log('🔍 Checking existing appointments for contact:', contactId);
        
        // Try to get appointments for this contact
        const endpoints = [
            `/contacts/${contactId}/appointments`,
            `/calendars/${calendarId}/events`,
            `/calendars/events?contactId=${contactId}`,
            `/appointments?contactId=${contactId}`
        ];
        
        for (const endpoint of endpoints) {
            try {
                console.log(`🔄 Trying appointments endpoint: ${endpoint}`);
                const response = await pitTokenManager.makeGHLRequest('GET', endpoint);
                
                if (response.data && (response.data.appointments || response.data.events || response.data.length > 0)) {
                    console.log('✅ Found existing appointments endpoint:', endpoint);
                    const appointments = response.data.appointments || response.data.events || response.data;
                    
                    if (Array.isArray(appointments) && appointments.length > 0) {
                        console.log(`📅 Found ${appointments.length} existing appointments`);
                        
                        // If we have expected date/time, check for matches
                        if (expectedDateTime) {
                            const matchingAppointment = appointments.find(apt => {
                                const aptDate = new Date(apt.startTime || apt.dateTime);
                                return Math.abs(aptDate - expectedDateTime) < 2 * 60 * 60 * 1000; // Within 2 hours
                            });
                            
                            if (matchingAppointment) {
                                console.log('✅ Found matching appointment for expected time:', matchingAppointment);
                                return { exists: true, appointment: matchingAppointment };
                            }
                        }
                        
                        return { exists: true, appointments: appointments };
                    }
                }
            } catch (endpointError) {
                console.log(`❌ Endpoint ${endpoint} failed: ${endpointError.response?.status}`);
                continue;
            }
        }
        
        console.log('📅 No existing appointments found');
        return { exists: false };
        
    } catch (error) {
        console.log('⚠️ Error checking existing appointments:', error.message);
        return { exists: false, error: error.message };
    }
}

// Function to generate smart time slots based on user preferences
function generateSmartTimeSlots(dateTimeInfo, maxSlots = 4) {
    console.log('🧠 Generating smart time slots based on preferences:', dateTimeInfo);
    
    const timeSlots = [];
    const now = new Date();
    
    // Parse user preferences
    let preferredTime = null;
    let preferredDay = null;
    let targetDate = null;
    
    if (dateTimeInfo?.time) {
        preferredTime = parseTime(dateTimeInfo.time);
        console.log('🕐 Preferred time parsed:', preferredTime);
    }
    
    if (dateTimeInfo?.day) {
        preferredDay = dateTimeInfo.day;
        console.log('📅 Preferred day:', preferredDay);
    }
    
    if (dateTimeInfo?.relative === 'tomorrow') {
        targetDate = new Date(now);
        targetDate.setDate(now.getDate() + 1);
        console.log('📆 Target date (tomorrow):', targetDate);
    }
    
    // Default times if no preference specified
    const defaultTimes = [14, 15, 16, 17]; // 2 PM, 3 PM, 4 PM, 5 PM
    const timesToTry = preferredTime ? [preferredTime, preferredTime + 1, preferredTime - 1, preferredTime + 2] : defaultTimes;
    
    // Generate slots for next 2 days, max 2 slots per day
    for (let dayOffset = 1; dayOffset <= 2 && timeSlots.length < maxSlots; dayOffset++) {
        const slotDate = targetDate || new Date(now);
        if (!targetDate) {
            slotDate.setDate(now.getDate() + dayOffset);
        }
        
        // Skip weekends
        const dayOfWeek = slotDate.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;
        
        let slotsForDay = 0;
        for (const hour of timesToTry) {
            if (slotsForDay >= 2 || timeSlots.length >= maxSlots) break;
            
            if (hour >= 10 && hour <= 18) { // Within business hours
                const slotStart = new Date(slotDate);
                slotStart.setUTCHours(hour, 0, 0, 0);
                const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
                
                timeSlots.push({
                    startTime: slotStart.toISOString(),
                    endTime: slotEnd.toISOString(),
                    description: `${slotStart.toLocaleDateString()} at ${slotStart.toLocaleTimeString()}`,
                    priority: preferredTime === hour ? 'high' : 'normal'
                });
                
                slotsForDay++;
            }
        }
        
        // If we found slots for target date, break (don't continue to day 2)
        if (targetDate && timeSlots.length > 0) break;
    }
    
    // Sort by priority (high first)
    timeSlots.sort((a, b) => a.priority === 'high' ? -1 : 1);
    
    console.log(`🎯 Generated ${timeSlots.length} smart time slots`);
    return timeSlots;
}

// Helper function to parse time strings like "2pm", "14:00"
function parseTime(timeStr) {
    const timeString = timeStr.toLowerCase().trim();
    
    if (timeString.includes('pm')) {
        const hour = parseInt(timeString);
        return hour === 12 ? 12 : hour + 12;
    } else if (timeString.includes('am')) {
        const hour = parseInt(timeString);
        return hour === 12 ? 0 : hour;
    } else if (timeString.includes(':')) {
        return parseInt(timeString.split(':')[0]);
    } else {
        // Assume 24-hour format
        return parseInt(timeString);
    }
}

// Function to create appointment in GHL (enhanced)
export async function createAppointment(contactData, appointmentRequest, pitTokenManager) {
    try {
        console.log('📅 Creating appointment for contact:', contactData.id);
        
        // Ensure we have a valid PIT token
        if (!pitTokenManager.pitToken) {
            await pitTokenManager.getValidToken();
        }
        
        // Check if GHL_CALENDAR_ID is available - use provided calendar ID as fallback
        const calendarId = process.env.GHL_CALENDAR_ID || 'voWnlupYGcaswG4ZoCzQ';
        console.log('📅 Using calendar ID:', calendarId);
        
        // Create appointment data using GHL API structure
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
        
        // Base appointment data
        const appointmentData = {
            calendarId: calendarId,
            contactId: contactData.id,
            selectedSlot: tomorrow.toISOString(),
            selectedTimezone: 'America/New_York',
            title: `Follow-up Call - ${contactData.firstName} ${contactData.lastName}`,
            notes: `Scheduled follow-up based on VAPI call. Keywords detected: ${appointmentRequest.keywords?.join(', ') || 'structured data'}`,
            // Alternative fields for different API versions
            startTime: tomorrow.toISOString(),
            endTime: new Date(tomorrow.getTime() + 30 * 60 * 1000).toISOString(),
            description: `Scheduled follow-up based on VAPI call. Keywords detected: ${appointmentRequest.keywords?.join(', ') || 'structured data'}`
        };
        
        console.log('📋 Appointment details:', {
            contactId: appointmentData.contactId,
            title: appointmentData.title,
            selectedSlot: appointmentData.selectedSlot
        });
        
        // Check if appointment already exists if transcript confirmed it
        if (appointmentRequest.confirmed && appointmentRequest.dateTimeInfo) {
            console.log('🔍 Appointment was confirmed in transcript - checking if it exists in calendar...');
            
            const expectedDateTime = appointmentRequest.dateTimeInfo.time ? 
                new Date(appointmentRequest.dateTimeInfo.time) : null;
            
            const existingCheck = await checkExistingAppointments(
                contactData.id, 
                calendarId, 
                pitTokenManager, 
                expectedDateTime
            );
            
            if (existingCheck.exists && existingCheck.appointment) {
                console.log('✅ Confirmed appointment already exists in calendar!');
                return {
                    success: true,
                    appointmentId: existingCheck.appointment.id,
                    reason: 'appointment_already_exists',
                    existingAppointment: existingCheck.appointment
                };
            }
            
            if (existingCheck.exists) {
                console.log('⚠️ Some appointments exist but not the expected one - will create new appointment');
            } else {
                console.log('❌ Confirmed appointment not found in calendar - will create it');
            }
        }
        
        // Use smart time slot generation (max 4 attempts)
        console.log('🔄 Using official V2 appointment endpoint: POST /calendars/events/appointments');
        const timeSlots = generateSmartTimeSlots(appointmentRequest.dateTimeInfo, 4);
        
        if (timeSlots.length === 0) {
            console.log('❌ No valid time slots could be generated');
            return { 
                success: false, 
                reason: 'No valid time slots available',
                dateTimeInfo: appointmentRequest.dateTimeInfo 
            };
        }
        
        let appointmentCreated = false;
        let finalError = null;
        let response = null;
        
        for (let i = 0; i < timeSlots.length && !appointmentCreated; i++) {
            const slot = timeSlots[i];
            
            const v2AppointmentData = {
                calendarId: calendarId,
                contactId: contactData.id,
                locationId: 'Tty8tmfsIBN4DdOVzgVa', // From calendar data
                startTime: slot.startTime,
                endTime: slot.endTime,
                title: `Follow-up Call - ${contactData.firstName} ${contactData.lastName}`,
                notes: `Scheduled based on VAPI call. ${appointmentRequest.confirmed ? 'Confirmed in transcript: ' + appointmentRequest.confirmationPhrase : 'Keywords detected: ' + (appointmentRequest.keywords?.join(', ') || 'structured data')}`
            };
            
            try {
                const priority = slot.priority === 'high' ? '🎯 HIGH PRIORITY' : '📅 Standard';
                console.log(`🔄 Attempting slot ${i + 1}/${timeSlots.length} (${priority}): ${slot.description}`);
                response = await pitTokenManager.makeGHLRequest('POST', '/calendars/events/appointments', v2AppointmentData);
                console.log('✅ Smart appointment created successfully!');
                console.log('📊 Appointment details:', {
                    id: response.data?.id,
                    status: response.data?.status,
                    startTime: slot.startTime,
                    priority: slot.priority
                });
                appointmentCreated = true;
                break;
            } catch (slotError) {
                console.log(`❌ Slot ${i + 1} failed: ${slotError.response?.data?.message || slotError.message}`);
                finalError = slotError;
                
                // If it's not a time slot issue, break early
                if (slotError.response?.data?.message !== 'The slot you have selected is no longer available.') {
                    console.log('❌ Non-availability error encountered, stopping attempts');
                    break;
                }
            }
        }
        
        if (!appointmentCreated) {
            console.log('❌ All time slots failed. This might indicate:');
            console.log('   - Calendar requires specific booking restrictions');
            console.log('   - Time slots must be further in the future'); 
            console.log('   - Calendar may have custom availability rules');
            console.log('🔧 For now, will log appointment request instead of failing completely');
            
            // Instead of failing, log the appointment request for manual follow-up
            console.log('📝 Logging appointment request for manual follow-up...');
            return {
                success: false,
                reason: 'No available time slots found - logged for manual follow-up',
                appointmentRequest: {
                    contactId: contactData.id,
                    contactName: `${contactData.firstName} ${contactData.lastName}`,
                    requestedService: appointmentRequest.keywords?.join(', ') || 'consultation',
                    detectedFrom: appointmentRequest.reason,
                    timeSlotsTried: timeSlots.length
                }
            };
        }
        
        console.log('✅ Appointment created successfully:', response.data?.appointment?.id || response.data?.id || 'ID not returned');
        return { 
            success: true, 
            appointmentId: response.data?.appointment?.id || response.data?.id,
            appointmentData 
        };
        
    } catch (error) {
        console.error('❌ Error creating appointment:', error.response?.data || error.message);
        return { 
            success: false, 
            error: error.message,
            details: error.response?.data 
        };
    }
}

// Function to process appointment requests (main entry point)
export async function processAppointmentRequest(callData, contactData, extractedData, pitTokenManager) {
    console.log('🗓️ Processing appointment request...');
    
    // Detect if appointment was requested
    const appointmentRequest = detectAppointmentRequest(callData, extractedData);
    
    if (!appointmentRequest.requested) {
        return { processed: false, reason: 'No appointment requested' };
    }
    
    // Create the appointment
    const appointmentResult = await createAppointment(contactData, appointmentRequest, pitTokenManager);
    
    if (appointmentResult.success) {
        console.log('✅ Appointment processing completed successfully');
        return {
            processed: true,
            success: true,
            appointmentId: appointmentResult.appointmentId,
            reason: appointmentRequest.reason
        };
    } else {
        console.log('❌ Appointment creation failed:', appointmentResult.reason || appointmentResult.error);
        return {
            processed: true,
            success: false,
            error: appointmentResult.error,
            reason: appointmentResult.reason
        };
    }
}

// Export for backward compatibility
export default { detectAppointmentRequest, createAppointment, processAppointmentRequest };