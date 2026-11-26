const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const LOG_FILE = path.join(__dirname, 'whatsapp_messages.log');
const JSON_FILE = path.join(__dirname, 'whatsapp_messages.json');
const FORWARD_STATUS_FILE = path.join(__dirname, 'forward_status.json');

// WhatsApp API config
const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v25.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const FORWARD_TO_NUMBER = process.env.FORWARD_TO_NUMBER; // Destination phone number (e.g., '1234567890')
const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'your_secure_webhook_token_123';

// Initialize JSON files
if (!fs.existsSync(JSON_FILE)) {
  fs.writeFileSync(JSON_FILE, '[]', 'utf8');
}
if (!fs.existsSync(FORWARD_STATUS_FILE)) {
  fs.writeFileSync(FORWARD_STATUS_FILE, '[]', 'utf8');
}

// Root
app.get('/', (req, res) => {
  res.send('✅ WhatsApp Webhook Server Running');
});

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Forward message to another number via WhatsApp API
async function forwardMessage(senderName, phoneFrom, messageText) {
  if (!FORWARD_TO_NUMBER || !ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    console.log('⚠️ Forwarding disabled: Missing FORWARD_TO_NUMBER, ACCESS_TOKEN, or PHONE_NUMBER_ID');
    return null;
  }

  try {
    const forwardText = `📨 New message from ${senderName} (${phoneFrom}):\n\n"${messageText}"`;
    
    const response = await axios.post(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: FORWARD_TO_NUMBER,
        type: 'text',
        text: { body: forwardText }
      },
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const status = {
      timestamp: new Date().toISOString(),
      from: phoneFrom,
      senderName,
      messageText: messageText.substring(0, 100),
      forwardedTo: FORWARD_TO_NUMBER,
      status: 'sent',
      messageId: response.data.messages?.[0]?.id
    };

    // Log forward status
    try {
      const existing = JSON.parse(fs.readFileSync(FORWARD_STATUS_FILE, 'utf8'));
      existing.push(status);
      fs.writeFileSync(FORWARD_STATUS_FILE, JSON.stringify(existing, null, 2), 'utf8');
    } catch (e) {
      fs.writeFileSync(FORWARD_STATUS_FILE, JSON.stringify([status], null, 2), 'utf8');
    }

    console.log(`✅ Forwarded message to ${FORWARD_TO_NUMBER}`);
    return status;
  } catch (error) {
    console.error('❌ Forward error:', error.response?.data || error.message);
    return null;
  }
}

// Verify webhook (GET)
app.get('/webhook', (req, res) => {
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  if (token === WEBHOOK_VERIFY_TOKEN) {
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
  
  try {
    const entry = req.body.entry?.[0];
    if (!entry) return;

    const changes = entry.changes?.[0];
    if (!changes) return;

    const value = changes.value;
    
    // Process messages
    if (value.messages) {
      const messages = value.messages;
      const contacts = value.contacts?.[0];
      const phone = value.metadata?.display_phone_number;

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

        console.log(`📨 Message from ${msgData.sender_name}: ${msgData.text.substring(0, 50)}`);
        
        // Forward message to another number
        forwardMessage(msgData.sender_name, msgData.from, msgData.text);
      });
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

// View forward status
app.get('/forward-status', (req, res) => {
  try {
    if (!fs.existsSync(FORWARD_STATUS_FILE)) {
      return res.json({ forwards: [] });
    }
    const forwards = JSON.parse(fs.readFileSync(FORWARD_STATUS_FILE, 'utf8'));
    res.json({ total: forwards.length, forwards });
  } catch (e) {
    res.json({ forwards: [] });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Webhook server on port ${PORT}`);
  console.log(`📍 URL: https://wa-web-hook-1.onrender.com/webhook`);
});
