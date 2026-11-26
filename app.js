const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const LOG_FILE = path.join(__dirname, 'whatsapp_messages.log');
const JSON_FILE = path.join(__dirname, 'whatsapp_messages.json');

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

// Verify webhook (GET)
app.get('/webhook', (req, res) => {
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  if (token === 'your_secure_webhook_token_123') {
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

app.listen(PORT, () => {
  console.log(`🚀 Webhook server on port ${PORT}`);
  console.log(`📍 URL: https://wa-web-hook-1.onrender.com/webhook`);
});
