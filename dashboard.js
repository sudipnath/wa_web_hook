const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const MESSAGES_FILE = path.join(__dirname, 'whatsapp_messages.json');

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (req.url === '/') {
    // Read messages
    let messages = [];
    try {
      if (fs.existsSync(MESSAGES_FILE)) {
        messages = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8'));
      }
    } catch (e) {
      console.error('Error reading messages:', e.message);
    }

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>WhatsApp Messages Dashboard</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 20px;
        }
        .container { 
          max-width: 800px; 
          margin: 0 auto;
        }
        .header {
          background: white;
          padding: 30px;
          border-radius: 12px;
          margin-bottom: 20px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        h1 { 
          color: #333;
          margin-bottom: 10px;
          font-size: 28px;
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
          margin-top: 20px;
        }
        .stat {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
          border-left: 4px solid #667eea;
        }
        .stat-label { 
          font-size: 12px; 
          color: #666; 
          text-transform: uppercase;
          margin-bottom: 5px;
        }
        .stat-value { 
          font-size: 24px; 
          font-weight: bold; 
          color: #333;
        }
        .messages-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .message {
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          border-left: 4px solid #667eea;
        }
        .message.received {
          border-left-color: #25D366;
        }
        .message.sent {
          border-left-color: #667eea;
        }
        .message-time {
          font-size: 12px;
          color: #999;
          margin-bottom: 8px;
        }
        .message-sender {
          font-weight: 600;
          color: #333;
          margin-bottom: 5px;
        }
        .message-phone {
          font-size: 12px;
          color: #666;
        }
        .message-text {
          margin-top: 12px;
          color: #333;
          line-height: 1.5;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .message-type {
          display: inline-block;
          font-size: 11px;
          background: #f0f0f0;
          padding: 4px 8px;
          border-radius: 4px;
          margin-top: 10px;
        }
        .empty {
          text-align: center;
          padding: 60px 20px;
          color: white;
        }
        .empty-icon { font-size: 48px; margin-bottom: 20px; }
        .refresh-info {
          text-align: center;
          color: rgba(255,255,255,0.8);
          font-size: 12px;
          margin-top: 20px;
        }
      </style>
      <meta http-equiv="refresh" content="5">
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📱 WhatsApp Messages</h1>
          <div class="stats">
            <div class="stat">
              <div class="stat-label">Total Messages</div>
              <div class="stat-value">${messages.length}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Last Updated</div>
              <div class="stat-value">${new Date().toLocaleTimeString()}</div>
            </div>
          </div>
        </div>

        ${messages.length === 0 ? `
          <div class="empty">
            <div class="empty-icon">💬</div>
            <p>No messages yet</p>
            <p style="font-size: 14px; margin-top: 10px;">Messages will appear here as they arrive</p>
          </div>
        ` : `
          <div class="messages-container">
            ${messages.slice().reverse().map((msg, i) => `
              <div class="message ${msg.status || 'received'}">
                <div class="message-time">${new Date(msg.timestamp).toLocaleString()}</div>
                <div class="message-sender">${msg.sender_name || 'Unknown'}</div>
                <div class="message-phone">📱 ${msg.from || msg.phone_number || 'Unknown'}</div>
                <div class="message-text">${escapeHtml(msg.text || '[No text]')}</div>
                <div class="message-type">${msg.type || 'text'}</div>
              </div>
            `).join('')}
          </div>
        `}

        <div class="refresh-info">
          🔄 Auto-refreshing every 5 seconds
        </div>
      </div>
    </body>
    </html>
    `;

    res.writeHead(200);
    res.end(html);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

server.listen(PORT, () => {
  console.log(`\n🌐 Dashboard running at http://localhost:${PORT}`);
  console.log(`📍 Messages from: https://wa-web-hook-1.onrender.com/messages\n`);
});
