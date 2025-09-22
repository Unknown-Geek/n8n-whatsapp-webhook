#!/bin/bash

echo "🚀 Setting up WhatsApp Bot development environment..."

# Install Chrome dependencies
sudo apt-get update -qq
sudo apt-get install -y \
    wget \
    ca-certificates \
    curl \
    binutils \
    xz-utils \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libxss1 \
    libasound2 \
    libatspi2.0-0 \
    libgtk-3-0 \
    libatk1.0-0 \
    libcups2 \
    fonts-liberation \
    fonts-freefont-ttf \
    --no-install-recommends

# Install Google Chrome stable
wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
sudo apt-get update -qq
sudo apt-get install -y google-chrome-stable

# Install Node.js dependencies with Puppeteer skip
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm install

# Create session directory
mkdir -p whatsapp-session
chmod 755 whatsapp-session

# Copy environment template
if [ ! -f .env ]; then
    cp .env.example .env
    echo "📝 Created .env file from template. Please update it with your configuration."
fi

echo "✅ Setup complete! Run 'npm start' to start the WhatsApp bot."
echo "🌐 The development server will be available at http://localhost:3000"
echo "📱 Visit http://localhost:3000/qr to authenticate with WhatsApp"