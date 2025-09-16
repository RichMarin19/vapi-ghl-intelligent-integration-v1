#!/usr/bin/env node

// Test the actual deployed Lambda function with a real webhook payload
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const REAL_WEBHOOK_PAYLOAD = {
    body: JSON.stringify({
        message: {
            type: 'end-of-call-report',
            summary: `The AI called Jack Mello, a For Sale By Owner, to understand his selling motivations, which include saving commission, getting the most money, and selling by year-end for $1.05M. Jack expressed concerns about buyer quality and was open to working with an agent if the buyer paid the commission. The call concluded with scheduling an in-person preview with "Rich" for September 16th at 1 PM to offer feedback and explore potential buyers.`,
            call: {
                id: 'test-real-lambda-' + Date.now(),
                transcript: `Jack: I want to save commission and get the most money for my house. I need to sell by year-end for $1.05M. I'm concerned about buyer quality. If a buyer pays the commission, I'd work with an agent.`,
                customer: { number: '+15551234567' },
                startedAt: new Date(Date.now() - 600000).toISOString(),
                endedAt: new Date().toISOString(),
                phoneNumberId: '480686f7-a658-42d7-a3d2-eef8860c6768'
            }
        },
        // Simulate contact lookup result
        contactId: 'jjYOawhhinftLJSQG3J2'
    }),
    headers: {
        'Content-Type': 'application/json'
    }
};

async function testRealLambda() {
    console.log('🚀 TESTING REAL DEPLOYED LAMBDA FUNCTION');
    console.log('================================================================================');
    
    try {
        const lambda = new LambdaClient({ region: 'us-east-2' });
        
        console.log('📞 Invoking Lambda function: vapi-ghl-integration');
        console.log('📝 Payload includes Jack Mello call with expected field values:');
        console.log('   • Motivation: "Save commission, get the most money"');
        console.log('   • Expectations: "$1.05M"');
        console.log('   • Timeline: "Year-end"');
        console.log('   • Disappointments: "Quality of buyers"');
        console.log('   • Concerns: "Buyer quality"');
        console.log('   • Openness to Re-list: "Yes, if buyer pays commission"');
        console.log('');

        const command = new InvokeCommand({
            FunctionName: 'vapi-ghl-integration',
            Payload: JSON.stringify(REAL_WEBHOOK_PAYLOAD),
            LogType: 'Tail'
        });

        const start = Date.now();
        const response = await lambda.send(command);
        const duration = Date.now() - start;

        console.log(`⏱️ Lambda execution completed in ${duration}ms`);
        console.log('');

        // Parse the response
        const payload = JSON.parse(new TextDecoder().decode(response.Payload));
        
        console.log('📊 LAMBDA RESPONSE:');
        console.log(`   Status Code: ${payload.statusCode}`);
        console.log(`   Success: ${payload.statusCode === 200 ? '✅' : '❌'}`);
        
        if (payload.body) {
            const body = JSON.parse(payload.body);
            console.log(`   Message: ${body.message || body.error || 'No message'}`);
            
            if (body.fieldsUpdated) {
                console.log(`   Fields Updated: ${body.fieldsUpdated}`);
            }
        }

        // Show logs if available
        if (response.LogResult) {
            const logs = Buffer.from(response.LogResult, 'base64').toString();
            console.log('');
            console.log('📋 LAMBDA EXECUTION LOGS (last 50 lines):');
            console.log('▔'.repeat(80));
            const logLines = logs.split('\n');
            const lastLines = logLines.slice(-50);
            lastLines.forEach(line => {
                if (line.trim()) console.log(line);
            });
        }

        return payload.statusCode === 200;

    } catch (error) {
        console.error('❌ Lambda invocation failed:', error.message);
        return false;
    }
}

testRealLambda().then(success => {
    if (success) {
        console.log('');
        console.log('🎯 Next step: Check CloudWatch logs and verify GoHighLevel contact update');
    } else {
        console.log('');
        console.log('⚠️ Lambda test failed - need to investigate');
    }
});