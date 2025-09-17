# WhatsApp Bot with n8n Integration 🚀

A Node.js WhatsApp bot using `whatsapp-web.js` that provides a REST API for sending messages and forwards received messages to n8n webhooks. Features a simple web UI for QR code authentication.

## ✨ Features

- **🔐 QR Code Authentication**: Simple web-based WhatsApp login via QR code
- **📤 Send Messages**: REST API endpoint for sending WhatsApp messages
- **📥 Receive Messages**: Automatically forward incoming messages to n8n webhooks
- **🔄 Session Persistence**: Maintains login session across restarts
- **🐳 Docker Support**: Easy deployment with Docker and Docker Compose
- **📊 Status Monitoring**: Health check and status endpoints
- **🔧 Environment Configuration**: Easy setup with environment variables

## 🛠️ Tech Stack

- **Node.js** with Express.js
- **whatsapp-web.js** for WhatsApp Web automation
- **QR Code generation** for web-based authentication
- **Axios** for webhook integration
- **Docker** for containerization

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ or Docker
- A phone with WhatsApp installed

### Local Development

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd n8n-whatsapp-webhook
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file:
   ```env
   PORT=3000
   N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/whatsapp
   ```

3. **Start the Server**
   ```bash
   npm start
   ```

4. **Authenticate with WhatsApp**
   - Open http://localhost:3000/qr in your browser
   - Scan the QR code with WhatsApp on your phone
   - Go to WhatsApp Settings → Linked Devices → Link a Device

### Docker Deployment

1. **Using Docker Compose (Recommended)**
   ```bash
   # Set your n8n webhook URL
   export N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/whatsapp
   
   docker-compose up -d
   ```

2. **Using Docker directly**
   ```bash
   docker build -t whatsapp-bot .
   docker run -p 3000:3000 -e N8N_WEBHOOK_URL=your-webhook-url whatsapp-bot
   ```

## 📡 API Endpoints

### Authentication & Status

- **`GET /`** - Health check and basic status
- **`GET /qr`** - Web UI for QR code authentication
- **`GET /status`** - Detailed client status

### Messaging

- **`POST /send`** - Send WhatsApp message
  ```json
  {
    "to": "+1234567890",
    "message": "Hello from n8n!"
  }
  ```

### Testing

- **`POST /webhook/test`** - Test webhook endpoint (for debugging)

## 🔧 API Usage Examples

### Send a Message

```bash
curl -X POST http://localhost:3000/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+1234567890",
    "message": "Hello from WhatsApp Bot!"
  }'
```

### Check Status

```bash
curl http://localhost:3000/status
```

Response:
```json
{
  "client_ready": true,
  "authentication_status": "authenticated",
  "has_qr": false,
  "n8n_webhook_configured": true,
  "timestamp": "2025-09-17T10:30:00.000Z"
}
```

## 📥 Incoming Message Webhook

When someone sends a message to your WhatsApp, the bot forwards it to your n8n webhook with this payload:

```json
{
  "from": "1234567890@c.us",
  "body": "Hello bot!",
  "timestamp": 1694860000,
  "id": "message_id_here",
  "hasMedia": false,
  "type": "chat",
  "isGroup": false
}
```

## 🔧 n8n Integration

### Setting up the Webhook in n8n

1. Create a new workflow in n8n
2. Add a **Webhook** trigger node
3. Set the webhook URL in your `.env` file
4. Configure your workflow to process incoming WhatsApp messages

### Example n8n Workflow

```json
{
  "nodes": [
    {
      "name": "WhatsApp Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "whatsapp",
        "httpMethod": "POST"
      }
    },
    {
      "name": "Process Message",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "// Process incoming WhatsApp message\nconst message = items[0].json;\n\nreturn {\n  sender: message.from,\n  text: message.body,\n  timestamp: new Date(message.timestamp * 1000)\n};"
      }
    }
  ]
}
```

## 🌐 Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | `3000` | No |
| `N8N_WEBHOOK_URL` | n8n webhook endpoint | - | No* |

*Required if you want to forward incoming messages to n8n

## 📁 Project Structure

```
├── server.js                    # Main application file
├── package.json                 # Node.js dependencies
├── .env.example                 # Environment variables template
├── .env                         # Environment variables (local)
├── packages.txt                 # Ubuntu system packages (for local dev)
├── packages-docker.txt          # Debian system packages (for Docker)
├── Dockerfile                   # Docker configuration
├── docker-compose.yml           # Docker Compose setup
├── .dockerignore               # Docker ignore file
├── test-api.sh                 # API testing script
├── install-packages-helper.sh  # Package installation helper
└── session/                    # WhatsApp session data (auto-created)
```

## 🔒 Security Considerations

- **Session Storage**: WhatsApp session data is stored locally in the `session/` directory
- **Environment Variables**: Never commit your `.env` file with real credentials
- **Network Security**: Use HTTPS webhooks in production
- **Docker Security**: The Docker container runs as a non-root user

## 🐛 Troubleshooting

### Common Issues

1. **QR Code not showing**
   - Wait a few seconds for the client to initialize
   - Check browser console for errors
   - Refresh the `/qr` page

2. **Authentication fails**
   - Clear the `session/` directory and restart
   - Ensure your phone has a stable internet connection
   - Try scanning the QR code again

3. **Messages not being forwarded**
   - Check that `N8N_WEBHOOK_URL` is correctly set
   - Verify n8n webhook is accessible
   - Check server logs for error messages

4. **Docker deployment issues**
   - Ensure Docker has enough resources allocated
   - Check that port 3000 is available
   - Verify volume mounts for session persistence

### Debugging

Enable verbose logging by checking the console output. The application logs all important events:

- Authentication status changes
- Incoming and outgoing messages
- Webhook forwarding attempts
- Error conditions

## 🔄 Development

### Local Development Setup

```bash
# Install dependencies
npm install

# Start in development mode
npm run dev

# View logs
tail -f logs/app.log  # If logging to file
```

### Testing Webhooks Locally

Use ngrok or similar tools to expose your local server:

```bash
# Install ngrok
npm install -g ngrok

# Expose local server
ngrok http 3000

# Use the ngrok URL as your N8N_WEBHOOK_URL
```

## 📝 License

ISC License

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Troubleshooting](#-troubleshooting) section
2. Review the server logs for error messages
3. Ensure all dependencies are properly installed
4. Verify your environment configuration

---

**⚡ Note**: This bot uses WhatsApp Web (not the Business API), so it requires an active WhatsApp account and regular re-authentication via QR code scanning. Perfect for personal automation, prototypes, and hackathons!