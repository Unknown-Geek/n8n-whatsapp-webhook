FROM node:18-slim

# Install basic dependencies including binutils for ar command
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    curl \
    binutils \
    && rm -rf /var/lib/apt/lists/*

# Install Chrome runtime dependencies from packages.txt
COPY packages.txt ./
RUN apt-get update && \
    (cat packages.txt | xargs apt-get install -y --no-install-recommends || true) && \
    apt-get install -y --no-install-recommends \
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

# Install dependencies
RUN npm ci --only=production

# Copy app source
COPY . .

# Install Chrome locally in the container (as root before user switch)
RUN chmod +x ./install-chrome.sh && ./install-chrome.sh

# Create directory for session storage
RUN mkdir -p session && chmod 777 session

# Add non-root user for security
RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
    && mkdir -p /home/pptruser/Downloads /home/pptruser/.local/share \
    && chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /usr/src/app

# Switch to non-root user
USER pptruser

# Set environment variables for Chrome
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV GOOGLE_CHROME_BIN=/usr/bin/google-chrome-stable
ENV CHROME_PATH=/usr/bin/google-chrome-stable

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

# Start the application
CMD ["node", "server.js"]