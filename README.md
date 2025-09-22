# WhatsApp Bot with n8n Integration 🚀

A Node.js WhatsApp bot that provides a REST API for sending messages and forwards received messages to n8n webhooks.

## 🚀 Quick Setup

### Docker Deployment (Recommended)

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd n8n-whatsapp-webhook
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your n8n webhook URL
   ```

3. **Deploy with Docker**
   ```bash
   # Build and start
   docker-compose up -d --build
   
   # Check logs
   docker-compose logs -f
   ```

4. **Authenticate WhatsApp**
   - Visit: `http://YOUR_SERVER_IP:3000/qr`
   - Scan QR code with WhatsApp (Settings > Linked Devices > Link a Device)
   - Wait for "WhatsApp Web client is ready!" message

## 📡 API Usage

### Send Message
```bash
curl -X POST http://YOUR_SERVER_IP:3000/send \
  -H "Content-Type: application/json" \
  -d '{
  "to": "+1234567890", "message": "Hello from WhatsApp Bot! 🚀"
  }'
```

### Check Status
```bash
curl http://YOUR_SERVER_IP:3000/status
```

## 🔧 Configuration

Edit `.env` file:
```env
PORT=3000
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/whatsapp
```

## 📋 Endpoints

- `GET /` - Health check
- `GET /qr` - QR code for authentication  
- `GET /status` - Bot status
- `POST /send` - Send message `{"to": "+1234567890", "message": "text"}`

## 🐳 Docker Commands

```bash
# Build and start
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## 📱 Test Script
