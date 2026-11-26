#!/usr/bin/env node

/**
 * Test Webhook Message Reception
 * Sends a mock WhatsApp message to your webhook to verify it's working
 */

const https = require('https');

const WEBHOOK_URL = 'https://wa-web-hook-1.onrender.com/webhook';
const VERIFY_TOKEN = 'your_secure_webhook_token_123';

// Mock WhatsApp webhook payload
const mockMessage = {
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "123456789",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "17347474539",
              "phone_number_id": "1476377585555034"
            },
            "contacts": [
              {
                "profile": {
                  "name": "Test User"
                },
                "wa_id": "17343683706"
              }
            ],
            "messages": [
              {
                "from": "17343683706",
                "id": "wamid.test123456",
                "timestamp": "1234567890",
                "type": "text",
                "text": {
                  "body": "Hello! This is a test message 🎉"
                }
              }
            ]
          },
          "field": "messages"
        }
      ],
      "time": 1234567890
    }
  ]
};

function sendTestMessage() {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(mockMessage);
    
    const options = {
      hostname: 'wa-web-hook-1.onrender.com',
      path: '/webhook',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', chunk => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
          body: data
        });
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function testWebhook() {
  console.log('\n🧪 Testing WhatsApp Webhook\n');
  console.log('📍 Webhook URL: ' + WEBHOOK_URL);
  console.log('📱 Test Message: "Hello! This is a test message 🎉"');
  console.log('👤 From: Test User (+17343683706)\n');
  
  try {
    console.log('⏳ Sending test message...\n');
    const response = await sendTestMessage();
    
    console.log(`✅ Response: ${response.statusCode} ${response.statusMessage}`);
    console.log(`📝 Body: ${response.body}\n`);
    
    if (response.statusCode === 200) {
      console.log('✅ Webhook received the message!');
      console.log('\n🔍 Check your messages at:');
      console.log('   https://wa-web-hook-1.onrender.com/messages\n');
      
      console.log('⏳ Waiting 3 seconds for message to be logged...\n');
      await new Promise(r => setTimeout(r, 3000));
      
      // Try to fetch messages
      console.log('📊 Checking logged messages...');
      return fetchMessages();
    } else {
      console.log('❌ Webhook returned unexpected status code');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

function fetchMessages() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'wa-web-hook-1.onrender.com',
      path: '/api/messages',
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    };

    https.get(options, (res) => {
      let data = '';
      
      res.on('data', chunk => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.messages && json.messages.length > 0) {
            console.log(`\n✅ Found ${json.total} total messages!\n`);
            const latest = json.messages[json.messages.length - 1];
            console.log('📨 Latest message:');
            console.log(`   From: ${latest.sender}`);
            console.log(`   Phone: ${latest.phone}`);
            console.log(`   Text: ${latest.text}`);
            console.log(`   Time: ${latest.timestamp}\n`);
          } else {
            console.log('\n⚠️ No messages logged yet. This might indicate:');
            console.log('   1. Webhook server is still deploying');
            console.log('   2. Webhook endpoint not responding correctly');
            console.log('   3. Message not being saved to file\n');
          }
        } catch (e) {
          console.log('\n❌ Could not parse response as JSON');
          console.log('Response:', data.substring(0, 200));
        }
        resolve();
      });
    }).on('error', (e) => {
      console.error('Error fetching messages:', e.message);
      resolve();
    });
  });
}

testWebhook();
