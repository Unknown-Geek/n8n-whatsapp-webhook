#!/bin/bash

# Chrome Installation Script for WhatsApp Bot
# This script downloads and installs Chrome in the project directory

set -e

CHROME_DIR="./chrome"
CHROME_URL="https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb"
CHROME_DEB="google-chrome-stable.deb"

echo "🔍 Setting up Chrome installation..."

# Create chrome directory if it doesn't exist
mkdir -p $CHROME_DIR

# Check if Chrome is already installed locally
if [ -f "$CHROME_DIR/opt/google/chrome/chrome" ]; then
    echo "✅ Chrome already installed locally"
    exit 0
fi

echo "📥 Downloading Chrome..."
wget -q -O $CHROME_DEB $CHROME_URL

echo "📦 Extracting Chrome..."
# Extract the .deb file
ar x $CHROME_DEB
tar -xf data.tar.xz -C $CHROME_DIR

# Clean up temporary files
rm -f $CHROME_DEB debian-binary control.tar.* data.tar.*

# Make chrome executable
chmod +x $CHROME_DIR/opt/google/chrome/chrome

echo "✅ Chrome installed successfully in $CHROME_DIR"
echo "📍 Chrome path: $(pwd)/$CHROME_DIR/opt/google/chrome/chrome"

# Install required system dependencies if on Linux
if command -v apt-get >/dev/null 2>&1; then
    echo "📦 Installing Chrome dependencies..."
    # Use sudo only if not in Docker (check if we're root)
    if [ "$EUID" -eq 0 ]; then
        apt-get update -qq
        apt-get install -y \
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
            >/dev/null 2>&1
    else
        sudo apt-get update -qq
        sudo apt-get install -y \
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
            >/dev/null 2>&1
    fi
fi

echo "🎉 Chrome setup complete!"