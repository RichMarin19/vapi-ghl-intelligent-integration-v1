#!/usr/bin/env node
// Helper script to fetch available calendars from GoHighLevel

import { PITTokenManager } from './pit-token-manager.js';

async function getCalendars() {
    console.log('🗓️ Fetching available calendars from GoHighLevel...');
    
    try {
        // Initialize PIT token manager
        const pitTokenManager = new PITTokenManager();
        await pitTokenManager.getValidToken();
        
        // Fetch calendars using the correct endpoint
        console.log('📡 Making API request to fetch calendars...');
        const response = await pitTokenManager.makeGHLRequest('GET', '/calendars');
        
        console.log('✅ Calendars fetched successfully');
        console.log('📋 Available calendars:');
        
        if (response.data?.calendars && response.data.calendars.length > 0) {
            response.data.calendars.forEach((calendar, index) => {
                console.log(`\n${index + 1}. ${calendar.name}`);
                console.log(`   ID: ${calendar.id}`);
                console.log(`   Status: ${calendar.status || 'active'}`);
                console.log(`   Timezone: ${calendar.timezone || 'Not specified'}`);
            });
            
            console.log('\n🎯 To use a calendar for appointments, set this environment variable:');
            console.log('export GHL_CALENDAR_ID="<calendar-id>"');
            console.log('\nOr add it to your Lambda function environment variables.');
        } else {
            console.log('❌ No calendars found in your GoHighLevel account');
            console.log('💡 You may need to create a calendar in GHL first');
        }
        
    } catch (error) {
        console.error('❌ Error fetching calendars:', error.response?.data || error.message);
        
        if (error.response?.status === 401) {
            console.log('🔑 Authentication failed - check your PIT token configuration');
        } else if (error.response?.status === 403) {
            console.log('🔒 Access denied - your PIT token may not have calendar permissions');
            console.log('💡 Make sure your GHL Private Integration has calendar.read and calendar.write scopes');
        }
        
        process.exit(1);
    }
}

// Run the script
getCalendars();