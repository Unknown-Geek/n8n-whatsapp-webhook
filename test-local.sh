#!/bin/bash

# Local testing script for WhatsApp Bot
# Run this to test the bot locally before deploying to GCP

set -e

echo "🧪 Testing WhatsApp Bot locally..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Build the Docker image locally
echo "📦 Building Docker image locally..."
docker build -t whatsapp-bot-test .

echo ""
echo "🚀 Starting container..."
echo "The bot will be available at: http://localhost:3000"
echo "QR Code page: http://localhost:3000/qr"
echo ""
echo "Press Ctrl+C to stop the container"
echo ""

# Run the container with proper environment variables
docker run --rm -p 3000:3000 \
  -e NODE_ENV=development \
  -e PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
  -e GOOGLE_CHROME_BIN=/usr/bin/google-chrome-stable \
  --name whatsapp-bot-test \
  whatsapp-bot-test