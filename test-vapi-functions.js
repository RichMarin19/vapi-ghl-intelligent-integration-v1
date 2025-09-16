#!/usr/bin/env node

// Test VAPI function calling for appointment booking
import { vapiFunctions } from './vapi-functions.js';

async function testVapiFunctions() {
    console.log('🧪 TESTING VAPI FUNCTION CALLS');
    console.log('================================================================================');
    
    const testContactId = 'jjYOawhhinftLJSQG3J2'; // Known working contact
    
    console.log('📅 Step 1: Testing ghl_check_availability...');
    console.log('▔'.repeat(60));
    
    try {
        const availabilityResult = await vapiFunctions.ghl_check_availability({ 
            contactId: testContactId 
        });
        
        console.log('📊 AVAILABILITY CHECK RESULT:');
        console.log(`   Success: ${availabilityResult.success ? '✅' : '❌'}`);
        console.log(`   Message: ${availabilityResult.message}`);
        
        if (availabilityResult.success && availabilityResult.slots) {
            console.log(`   Available Slots: ${availabilityResult.slots.length}`);
            console.log(`   Calendar: ${availabilityResult.calendarName}`);
            
            // Show first few slots
            console.log('');
            console.log('📋 First 3 Available Slots:');
            availabilityResult.slots.slice(0, 3).forEach((slot, index) => {
                console.log(`   ${index + 1}. ${slot.description}`);
                console.log(`      Start: ${slot.startTime}`);
                console.log(`      End: ${slot.endTime}`);
            });
            
            // Test appointment creation with first slot
            if (availabilityResult.slots.length > 0) {
                console.log('');
                console.log('📝 Step 2: Testing ghl_create_event...');
                console.log('▔'.repeat(60));
                
                const firstSlot = availabilityResult.slots[0];
                const appointmentResult = await vapiFunctions.ghl_create_event({
                    contactId: testContactId,
                    slotId: firstSlot.id,
                    startTime: firstSlot.startTime,
                    endTime: firstSlot.endTime,
                    title: 'Test Preview Appointment',
                    description: 'Test appointment created via VAPI function call'
                });
                
                console.log('📊 APPOINTMENT CREATION RESULT:');
                console.log(`   Success: ${appointmentResult.success ? '✅' : '❌'}`);
                console.log(`   Message: ${appointmentResult.message}`);
                
                if (appointmentResult.success) {
                    console.log(`   Appointment ID: ${appointmentResult.appointmentId}`);
                    console.log(`   Date: ${appointmentResult.appointmentDate}`);
                    console.log(`   Time: ${appointmentResult.appointmentTime}`);
                    console.log(`   Calendar: ${appointmentResult.calendarName}`);
                } else {
                    console.log(`   Error: ${appointmentResult.error}`);
                }
            } else {
                console.log('⚠️ No available slots to test appointment creation');
            }
            
        } else {
            console.log(`   Error: ${availabilityResult.error || 'Unknown error'}`);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

console.log('🚀 Starting VAPI Functions Test...');
testVapiFunctions().then(() => {
    console.log('');
    console.log('✅ VAPI Functions Test Complete');
}).catch(error => {
    console.error('❌ Test failed:', error.message);
});