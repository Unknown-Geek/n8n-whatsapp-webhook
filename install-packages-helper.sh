#!/bin/bash

# WhatsApp Bot Docker Package Installation Helper
# This script shows how to install packages for different environments

echo "🐳 WhatsApp Bot Package Installation Helper"
echo "============================================"

echo
echo "📋 Available package lists:"
echo "• packages.txt - Ubuntu 24.04 packages (with t64 suffix)"
echo "• packages-docker.txt - Debian packages (Docker compatible)"

echo
echo "🛠️ Installation methods:"

echo
echo "1. Direct installation in Dockerfile (current approach):"
echo "   RUN apt-get update && apt-get install -y \\"
echo "       libatk1.0-0 \\"
echo "       libatk-bridge2.0-0 \\"
echo "       [... other packages] \\"
echo "       --no-install-recommends"

echo
echo "2. From packages file (alternative approach):"
echo "   COPY packages-docker.txt ./"
echo "   RUN apt-get update && \\"
echo "       xargs -a packages-docker.txt apt-get install -y --no-install-recommends && \\"
echo "       rm -rf /var/lib/apt/lists/* && rm packages-docker.txt"

echo
echo "3. For local Ubuntu development:"
echo "   sudo apt-get update"
echo "   xargs -a packages.txt sudo apt-get install -y"

echo
echo "📝 Package lists:"
echo
echo "packages.txt (Ubuntu 24.04):"
cat packages.txt | sed 's/^/   • /'

echo
echo "packages-docker.txt (Debian/Docker):"
cat packages-docker.txt | sed 's/^/   • /'

echo
echo "✅ Current Dockerfile uses direct installation for better compatibility"