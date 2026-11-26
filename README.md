# WhatsApp Webhook Server

Receive incoming WhatsApp messages via Meta's Cloud API webhook.

## Quick Start

```bash
npm install
PORT=3000 node webhook-simple.js
```

## Configuration

1. Set environment variables in `.env`:
   - `PORT` - Server port (default: 3000)
   - `WEBHOOK_VERIFY_TOKEN` - Token from WhatsApp Business Manager

2. Register webhook in WhatsApp Business Manager:
   - Webhook URL: `https://your-domain.com/webhook`
   - Verify Token: `your_secure_webhook_token_123`

## Endpoints

- `GET /` - Health check
- `GET /health` - JSON health status
- `GET /webhook` - Webhook verification (Meta calls this)
- `POST /webhook` - Receives incoming messages from WhatsApp
- `GET /messages` - View received messages (JSON)

## Message Storage

- **Log file:** `whatsapp_messages.log` - Line-delimited JSON
- **JSON file:** `whatsapp_messages.json` - Array format

## Testing

```bash
# Send test message
node test-webhook-send.js

# View messages
curl http://localhost:3000/messages
```

## Deployment

### Render

1. Connect GitHub repo to Render
2. Set build command: `npm install`
3. Set start command: `node webhook-simple.js`
4. Deploy

### Local with Ngrok

```bash
npm install -g ngrok
ngrok http 3000
# Update webhook URL in WhatsApp Business Manager with ngrok URL
```

## Files

- `webhook-simple.js` - Main server
- `package.json` - Dependencies
- `test-webhook-send.js` - Test utility
- `.env` - Configuration (not in git)
