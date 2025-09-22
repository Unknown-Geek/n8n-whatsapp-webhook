# WhatsApp Bot with n8n Integration 🚀

A Node.js WhatsApp bot using `whatsapp-web.js` that provides a REST API for sending messages and forwards received messages to n8n webhooks. Features a simple web UI for QR code authentication. **Optimized for GitHub Codespaces development!**

## ✨ Features

- **🔐 QR Code Authentication**: Simple web-based WhatsApp login via QR code
- **📤 Send Messages**: REST API endpoint for sending WhatsApp messages
- **📥 Receive Messages**: Automatically forward incoming messages to n8n webhooks
- **🔄 Session Persistence**: Maintains login session across restarts
- **☁️ Codespace Ready**: Fully configured for GitHub Codespaces development
- **🐳 Docker Support**: Easy deployment with Docker and Docker Compose
- **📊 Status Monitoring**: Health check and status endpoints
- **🔧 Environment Configuration**: Easy setup with environment variables

## 🛠️ Tech Stack

- **Node.js** with Express.js
- **whatsapp-web.js** for WhatsApp Web automation
- **QR Code generation** for web-based authentication
- **Axios** for webhook integration
- **Docker** for containerization
- **GitHub Codespaces** for cloud development

## 🚀 Quick Start

### 🌟 GitHub Codespaces (Recommended)

The easiest way to get started is with GitHub Codespaces - everything is pre-configured!

1. **Open in Codespace**
   - Click the "Code" button on GitHub
   - Select "Codespaces" tab
   - Click "Create codespace on main"
   - Wait for the environment to setup (this takes ~2-3 minutes)

2. **Start the Bot**
   ```bash
   npm start
   ```
   
3. **Configure Environment** (Optional)
   ```bash
   # Edit .env file to add your n8n webhook URL
   cp .env.example .env
   # Edit .env with your settings
   ```

4. **Authenticate with WhatsApp**
   - The server will automatically start on port 3000
   - Codespace will show a popup with the forwarded URL
   - Open the forwarded URL and add `/qr` to authenticate
   - Scan the QR code with WhatsApp on your phone

### 💻 Local Development

For local development outside of Codespaces:

1. **Prerequisites**
   - Node.js 18+
   - Linux/macOS (Windows requires WSL)
   - A phone with WhatsApp installed

2. **Clone and Setup**
   ```bash
   git clone https://github.com/Unknown-Geek/n8n-whatsapp-webhook.git
   cd n8n-whatsapp-webhook
   npm run setup
   ```

3. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your n8n webhook URL
   ```

4. **Start the Server**
   ```bash
   npm start
   ```

5. **Authenticate**
   - Open http://localhost:3000/qr
   - Scan QR code with WhatsApp

### 🐳 Docker Deployment

For production deployments:

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

1. **Create a new workflow in n8n**
2. **Add a Webhook trigger node**
3. **Configure the webhook URL**:
   
   **For GitHub Codespaces:**
   - Use your Codespace's forwarded URL: `https://your-codespace-url.github.dev/webhook/test`
   - Or set up n8n to send webhooks to your bot: Configure your n8n webhook to receive from the Codespace URL

   **For local development:**
   - Use ngrok or similar: `https://abc123.ngrok.io`
   - Or use your domain if deployed

4. **Update your .env file** with the webhook URL
5. **Test the integration** using the `/send` API endpoint

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
        "functionCode": "// Process incoming WhatsApp message\nconst message = items[0].json;\n\nreturn {\n  sender: message.from,\n  text: message.body,\n  timestamp: new Date(message.timestamp * 1000),\n  isGroup: message.isGroup\n};"
      }
    },
    {
      "name": "Send Response",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "POST",
        "url": "{{ $env.CODESPACE_URL || 'http://localhost:3000' }}/send",
        "jsonParameters": true,
        "options": {
          "body": {
            "to": "{{ $json.sender }}",
            "message": "Thanks for your message: {{ $json.text }}"
          }
        }
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
├── .devcontainer/               # GitHub Codespaces configuration
│   ├── devcontainer.json       # Dev container settings
│   └── setup.sh                # Codespace setup script
├── server.js                   # Main application file
├── package.json                # Node.js dependencies & scripts
├── .env.example                # Environment variables template
├── .env                        # Environment variables (create from template)
├── packages.txt                # System packages for local development
├── Dockerfile                  # Docker configuration
├── docker-compose.yml          # Docker Compose setup
├── .dockerignore              # Docker ignore file
├── install-chrome.sh           # Chrome installation script (local dev)
├── send-test-message.js        # Testing utility
└── whatsapp-session/          # WhatsApp session data (auto-created)
```

## 🔒 Security Considerations

- **Session Storage**: WhatsApp session data is stored in `whatsapp-session/` directory
- **Environment Variables**: Never commit your `.env` file with real credentials
- **Network Security**: Use HTTPS webhooks in production
- **Codespace Security**: Session data persists in Codespace storage
- **Docker Security**: The Docker container runs with proper user permissions

## 🐛 Troubleshooting

### GitHub Codespaces Issues

1. **Port not forwarding automatically**
   - Go to Ports tab in VS Code
   - Make sure port 3000 is forwarded
   - Set visibility to "Public" for external access

2. **Codespace setup fails**
   - Wait for the postCreateCommand to complete
   - Check terminal for setup script output
   - Manually run: `bash .devcontainer/setup.sh`

3. **Chrome/Puppeteer issues in Codespace**
   - The setup automatically handles Chrome installation
   - If issues persist, restart the Codespace

### Common Issues (All Environments)

1. **QR Code not showing**
   - Wait a few seconds for the client to initialize
   - Check browser console for errors
   - Refresh the `/qr` page

2. **Authentication fails**
   - Clear the `whatsapp-session/` directory and restart
   - Ensure your phone has a stable internet connection
   - Try scanning the QR code again

3. **Messages not being forwarded**
   - Check that `N8N_WEBHOOK_URL` is correctly set in `.env`
   - Verify n8n webhook is accessible from your environment
   - Check server logs for error messages

4. **Local development setup issues**
   - Ensure you have Node.js 18+ installed
   - Run `npm run setup` to install all dependencies
   - Check that Chrome is properly installed

### Debugging

The application logs all important events to the console:

- Authentication status changes
- Incoming and outgoing messages
- Webhook forwarding attempts
- Error conditions

For Codespaces, check the integrated terminal for logs.

## 🔄 Development

### GitHub Codespaces Development (Recommended)

The project is fully configured for GitHub Codespaces with:

- **Automatic setup**: Chrome, dependencies, and environment auto-configured
- **Port forwarding**: Port 3000 automatically forwarded and labeled
- **VS Code extensions**: Pre-installed helpful extensions
- **Development server**: Ready to run with `npm start`

**Codespace Development Workflow:**
```bash
# Codespace is already set up, just start developing!
npm start                    # Start the development server
npm run create-env          # Create .env from template if needed

# The server will be available at the forwarded URL
# Add /qr to the URL to authenticate with WhatsApp
```

### Local Development Setup

If you prefer local development:

```bash
# Full setup (installs Chrome and all dependencies)
npm run setup

# Or Codespace-compatible setup (skips Chrome download)
npm run setup-codespace

# Start in development mode
npm start

# Manual Chrome installation (if needed)
./install-chrome.sh
```

### Testing Webhooks

#### Using Codespace Port Forwarding
Your n8n webhook URL can be the forwarded Codespace URL:
```
https://your-codespace-url.github.dev/webhook/whatsapp
```

#### Using ngrok (Local Development)
```bash
# Install ngrok
npm install -g ngrok

# Expose local server
ngrok http 3000

# Use the ngrok URL as your N8N_WEBHOOK_URL
```

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | `3000` | No |
| `N8N_WEBHOOK_URL` | n8n webhook endpoint | - | No* |
| `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` | Skip Puppeteer Chrome download | `true` | Codespace only |
| `GOOGLE_CHROME_BIN` | Chrome executable path | `/usr/bin/google-chrome-stable` | Codespace only |

*Required if you want to forward incoming messages to n8n

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

**☁️ Codespace Optimized**: This project is fully configured for GitHub Codespaces with automatic setup, port forwarding, and Chrome installation. Simply open in Codespace and run `npm start`!