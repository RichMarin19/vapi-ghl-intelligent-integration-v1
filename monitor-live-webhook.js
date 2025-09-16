#!/usr/bin/env node

// Live webhook monitoring script to verify custom fields are working
// Monitors CloudWatch logs in real-time and validates custom fields updates

import { spawn } from 'child_process';
import { CustomFieldsFetcher } from './get-custom-fields.js';

class LiveWebhookMonitor {
    constructor() {
        this.customFieldsFetcher = new CustomFieldsFetcher();
        this.isMonitoring = false;
        this.logTail = null;
    }

    // Start monitoring CloudWatch logs in real-time
    async startMonitoring() {
        console.log('🔍 Starting Live VAPI Webhook Monitor');
        console.log('=' .repeat(60));
        console.log('');
        
        console.log('📊 Monitoring CloudWatch logs for custom fields activity...');
        console.log('🎯 Looking for these key indicators:');
        console.log('  • Custom fields manager initialization');
        console.log('  • AI transcript extraction');
        console.log('  • Custom fields updates');
        console.log('  • GoHighLevel V2 API calls');
        console.log('');
        console.log('💡 Make a live VAPI call now to see real-time processing...');
        console.log('');
        
        this.isMonitoring = true;
        
        // Start tailing CloudWatch logs
        this.logTail = spawn('aws', [
            'logs', 'tail', '/aws/lambda/vapi-ghl-integration',
            '--follow',
            '--region', 'us-east-2',
            '--format', 'short'
        ]);

        let buffer = '';
        
        this.logTail.stdout.on('data', (data) => {
            buffer += data.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop(); // Keep incomplete line in buffer
            
            lines.forEach(line => {
                if (line.trim()) {
                    this.processLogLine(line);
                }
            });
        });

        this.logTail.stderr.on('data', (data) => {
            console.error('AWS CLI Error:', data.toString());
        });

        this.logTail.on('close', (code) => {
            console.log(`\n📊 Monitoring stopped (exit code: ${code})`);
            this.isMonitoring = false;
        });

        // Handle graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n⏹️ Stopping monitor...');
            this.stopMonitoring();
        });
    }

    // Process each log line and highlight important events
    processLogLine(line) {
        const timestamp = new Date().toLocaleTimeString();
        
        // Highlight custom fields related activity
        if (line.includes('Custom Fields Manager')) {
            console.log(`🔧 [${timestamp}] CUSTOM FIELDS: ${line}`);
        }
        else if (line.includes('AI transcript extraction') || line.includes('extractDataFromTranscript')) {
            console.log(`🤖 [${timestamp}] AI EXTRACTION: ${line}`);
        }
        else if (line.includes('updateContactCustomFields') || line.includes('Updated custom field')) {
            console.log(`✅ [${timestamp}] FIELD UPDATE: ${line}`);
        }
        else if (line.includes('GoHighLevel V2 API') || line.includes('Bearer') && line.includes('customFields')) {
            console.log(`🌐 [${timestamp}] GHL API: ${line}`);
        }
        else if (line.includes('ERROR') || line.includes('❌')) {
            console.log(`🚨 [${timestamp}] ERROR: ${line}`);
        }
        else if (line.includes('VAPI webhook received') || line.includes('end-of-call-report')) {
            console.log(`📞 [${timestamp}] WEBHOOK: ${line}`);
        }
        else if (line.includes('PIT token') || line.includes('pitToken')) {
            console.log(`🔑 [${timestamp}] TOKEN: ${line}`);
        }
        else if (line.includes('transcript') && (line.includes('found') || line.includes('extracted'))) {
            console.log(`📄 [${timestamp}] TRANSCRIPT: ${line}`);
        }
        // Show other significant log entries
        else if (line.includes('✅') || line.includes('SUCCESS') || line.includes('completed')) {
            console.log(`✨ [${timestamp}] SUCCESS: ${line}`);
        }
    }

    // Stop monitoring
    stopMonitoring() {
        this.isMonitoring = false;
        if (this.logTail) {
            this.logTail.kill();
        }
    }

    // Validate that a contact's custom fields were updated
    async validateCustomFieldsUpdate(contactId) {
        console.log(`\n🔍 Validating custom fields for contact: ${contactId}`);
        console.log('-' .repeat(50));
        
        try {
            // Initialize custom fields fetcher
            await this.customFieldsFetcher.initialize();
            
            // Get contact details including custom fields
            const contactDetails = await this.customFieldsFetcher.getContactDetails(contactId);
            
            if (contactDetails && contactDetails.customFields) {
                console.log(`✅ Contact found with ${Object.keys(contactDetails.customFields).length} custom fields`);
                
                // Show recently updated fields (those with values)
                const populatedFields = Object.entries(contactDetails.customFields)
                    .filter(([key, value]) => value && value.toString().trim() !== '');
                
                if (populatedFields.length > 0) {
                    console.log('\n📊 Populated Custom Fields:');
                    populatedFields.forEach(([fieldName, value]) => {
                        console.log(`   • ${fieldName}: "${value}"`);
                    });
                } else {
                    console.log('⚠️ No populated custom fields found');
                }
                
                return {
                    success: true,
                    totalFields: Object.keys(contactDetails.customFields).length,
                    populatedFields: populatedFields.length,
                    fields: contactDetails.customFields
                };
            } else {
                console.log('❌ No custom fields found for contact');
                return { success: false, error: 'No custom fields found' };
            }
            
        } catch (error) {
            console.error('❌ Validation error:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Generate live monitoring report
    generateReport() {
        console.log('\n📋 Live Webhook Monitoring Summary');
        console.log('=' .repeat(60));
        console.log('\n🎯 What to Look For in Live Calls:');
        console.log('1. "VAPI webhook received" - Confirms webhook is working');
        console.log('2. "Custom Fields Manager initialized" - System is ready');
        console.log('3. "AI transcript extraction" - AI is processing transcript');
        console.log('4. "Updated custom field" - Fields are being updated');
        console.log('5. "GoHighLevel V2 API" - API calls are successful');
        console.log('\n✅ Success Indicators:');
        console.log('• No OAuth/token refresh errors');
        console.log('• Custom fields manager processes transcript');
        console.log('• GHL V2 API calls return 200 status');
        console.log('• Contact custom fields show extracted data');
        console.log('\n🚨 Failure Indicators to Watch For:');
        console.log('• "refreshGhlToken" or "getValidGhlToken" errors (old system)');
        console.log('• "Custom fields manager not initialized" warnings');
        console.log('• "No transcript found" messages');
        console.log('• HTTP 401/403 errors from GoHighLevel API');
    }
}

// Command line interface
async function main() {
    const monitor = new LiveWebhookMonitor();
    
    // Check command line arguments
    const command = process.argv[2];
    const contactId = process.argv[3];
    
    if (command === 'validate' && contactId) {
        // Validate specific contact
        await monitor.validateCustomFieldsUpdate(contactId);
    } else if (command === 'report') {
        // Show monitoring guide
        monitor.generateReport();
    } else {
        // Default: start live monitoring
        console.log('🚀 VAPI-GHL Custom Fields Live Monitor');
        console.log('');
        console.log('Commands:');
        console.log('  node monitor-live-webhook.js          - Start live monitoring');
        console.log('  node monitor-live-webhook.js validate CONTACT_ID - Validate contact fields');
        console.log('  node monitor-live-webhook.js report   - Show monitoring guide');
        console.log('');
        
        await monitor.startMonitoring();
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export default LiveWebhookMonitor;