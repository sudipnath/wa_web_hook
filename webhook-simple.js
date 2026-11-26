const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const LOG_FILE = path.join(__dirname, 'whatsapp_messages.log');
const JSON_FILE = path.join(__dirname, 'whatsapp_messages.json');
const DEBUG_FILE = path.join(__dirname, 'webhook_debug.log');

// Initialize JSON file
if (!fs.existsSync(JSON_FILE)) {
  fs.writeFileSync(JSON_FILE, '[]', 'utf8');
}

// Root
app.get('/', (req, res) => {
  res.send('✅ WhatsApp Webhook Server Running');
});

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Debug endpoint - view all webhook requests
app.get('/debug', (req, res) => {
  try {
    if (!fs.existsSync(DEBUG_FILE)) {
      return res.json({ debug_logs: [] });
    }
    const logs = fs.readFileSync(DEBUG_FILE, 'utf8').split('\n').filter(l => l).map(l => JSON.parse(l)).slice(-50);
    res.json({ total: logs.length, logs });
  } catch (e) {
    res.json({ error: e.message });
  }
});

// Verify webhook (GET)
app.get('/webhook', (req, res) => {
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  console.log('🔐 Verification request:', { token, challenge });
  fs.appendFileSync(DEBUG_FILE, JSON.stringify({
    type: 'verification',
    timestamp: new Date().toISOString(),
    token,
    success: token === 'whatsapp_token'
  }) + '\n');
  
  if (token === 'whatsapp_token') {
    console.log('✅ Webhook verified');
    res.send(challenge);
  } else {
    res.status(403).send('Invalid token');
  }
});

// Receive messages (POST)
app.post('/webhook', (req, res) => {
  // Always respond 200 immediately
  res.status(200).send('ok');
  
  console.log('📨 Webhook POST received');
  console.log('Body:', JSON.stringify(req.body, null, 2));
  
  // Log raw request
  fs.appendFileSync(DEBUG_FILE, JSON.stringify({
    type: 'webhook_post',
    timestamp: new Date().toISOString(),
    body: req.body
  }) + '\n');
  
  try {
    const entry = req.body.entry?.[0];
    if (!entry) {
      console.log('No entry found');
      return;
    }

    const changes = entry.changes?.[0];
    if (!changes) {
      console.log('No changes found');
      return;
    }

    const value = changes.value;
    console.log('Value:', JSON.stringify(value, null, 2));
    
    // Process messages
    if (value.messages) {
      const messages = value.messages;
      const contacts = value.contacts?.[0];
      const phone = value.metadata?.display_phone_number;

      console.log(`Processing ${messages.length} messages`);

      messages.forEach(msg => {
        const msgData = {
          id: msg.id,
          timestamp: new Date(parseInt(msg.timestamp) * 1000).toISOString(),
          from: msg.from,
          type: msg.type,
          text: msg.text?.body || msg.caption || '[media]',
          sender_name: contacts?.profile?.name || 'Unknown',
          phone_number: phone
        };

        // Log to file
        fs.appendFileSync(LOG_FILE, JSON.stringify(msgData) + '\n', 'utf8');
        
        // Add to JSON
        try {
          const existing = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
          existing.push(msgData);
          fs.writeFileSync(JSON_FILE, JSON.stringify(existing, null, 2), 'utf8');
        } catch (e) {
          fs.writeFileSync(JSON_FILE, JSON.stringify([msgData], null, 2), 'utf8');
        }

        console.log(`✅ Message saved: ${msgData.sender_name}: ${msgData.text.substring(0, 50)}`);
      });
    } else {
      console.log('No messages in webhook');
    }
    
    // Process status updates
    if (value.statuses) {
      console.log('Status update received:', value.statuses);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
});

// View messages
app.get('/messages', (req, res) => {
  try {
    if (!fs.existsSync(JSON_FILE)) {
      return res.json({ messages: [] });
    }
    const messages = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
    res.json({ total: messages.length, messages });
  } catch (e) {
    res.json({ messages: [] });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Webhook server on port ${PORT}`);
  console.log(`📍 Webhook URL: https://wa-web-hook-1.onrender.com/webhook`);
  console.log(`📋 Messages: https://wa-web-hook-1.onrender.com/messages`);
  console.log(`🐛 Debug: https://wa-web-hook-1.onrender.com/debug`);
});
