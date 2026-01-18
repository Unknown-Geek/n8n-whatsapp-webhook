FROM node:18-slim

# Install basic dependencies including binutils for ar command and xz-utils for tar extraction
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    curl \
    binutils \
    xz-utils \
    && rm -rf /var/lib/apt/lists/*

# Install Chrome runtime dependencies from packages.txt
COPY packages.txt ./
RUN apt-get update && \
    (cat packages.txt | xargs apt-get install -y --no-install-recommends || true) && \
    apt-get install -y --no-install-recommends \
        chromium \
        libatk1.0-0 \
        libatk-bridge2.0-0 \
        libcups2 \
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
        libnss3 \
        fonts-liberation \
        fonts-freefont-ttf \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Set environment variable to skip Puppeteer download (we'll use system Chromium)
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Install dependencies (use npm install to update lock file)
RUN npm install --omit=dev

# Copy app source
COPY . .

# Create directory for session storage with proper ownership and permissions
RUN mkdir -p whatsapp-session && chmod -R 777 whatsapp-session

# Set environment variables for Chrome/Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV CHROME_PATH=/usr/bin/chromium

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

# Start the application
CMD ["node", "server.js"]