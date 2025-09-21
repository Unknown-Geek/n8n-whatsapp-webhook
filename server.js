const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const QRCode = require('qrcode');
const axios = require('axios');
require('dotenv').config();

// Configuration
const PORT = process.env.PORT || 3000;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

// Initialize Express app
const app = express();
app.use(express.json());

// Global variables
let client;
let qrCodeString = '';
let isClientReady = false;
let authenticationStatus = 'initializing';

// Logging utility
const log = (message, level = 'info') => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
};

// Initialize WhatsApp client
const initializeWhatsAppClient = () => {
    log('Initializing WhatsApp Web client...');
    
    const puppeteerConfig = {
        headless: true,
        timeout: 180000, // 3 minutes timeout for Cloud Run
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=TranslateUI,VizDisplayCompositor',
            '--disable-ipc-flooding-protection',
            '--disable-software-rasterizer',
            '--disable-web-security',
            '--no-default-browser-check',
            '--no-pings',
            '--ignore-certificate-errors',
            '--ignore-ssl-errors',
            '--ignore-certificate-errors-spki-list',
            '--ignore-ssl-errors-list',
            '--memory-pressure-off',
            '--max_old_space_size=4096',
            '--disable-extensions',
            '--disable-plugins',
            '--disable-default-apps',
            '--disable-background-networking',
            '--disable-sync',
            '--metrics-recording-only',
            '--no-crash-upload',
            '--disable-component-update',
            '--disable-blink-features=AutomationControlled'
        ],
        handleSIGINT: false,
        handleSIGTERM: false,
        handleSIGHUP: false,
        executablePath: process.env.GOOGLE_CHROME_BIN || '/usr/bin/google-chrome-stable'
    };

    log(`Using Chrome executable: ${puppeteerConfig.executablePath}`);
    
    client = new Client({
        authStrategy: new LocalAuth({
            dataPath: './session'
        }),
        puppeteer: puppeteerConfig
    });

    // QR Code generation
    client.on('qr', (qr) => {
        log('QR Code received, generating QR code string...');
        qrCodeString = qr;
        authenticationStatus = 'qr_ready';
        QRCode.toString(qr, { type: 'terminal' }, (err, url) => {
            if (!err) {
                console.log('\n=== WhatsApp QR Code ===');
                console.log(url);
                console.log('========================\n');
                log('QR Code displayed in terminal. Also available at http://localhost:' + PORT + '/qr');
            }
        });
    });

    // Client ready
    client.on('ready', () => {
        log('WhatsApp Web client is ready!');
        isClientReady = true;
        authenticationStatus = 'authenticated';
    });

    // Authentication success
    client.on('authenticated', () => {
        log('WhatsApp authentication successful');
        authenticationStatus = 'authenticated';
    });

    // Authentication failure
    client.on('auth_failure', (msg) => {
        log(`Authentication failed: ${msg}`, 'error');
        authenticationStatus = 'auth_failed';
    });

    // Client disconnected
    client.on('disconnected', (reason) => {
        log(`Client disconnected: ${reason}`, 'warn');
        isClientReady = false;
        authenticationStatus = 'disconnected';
    });

    // Loading screen event
    client.on('loading_screen', (percent, message) => {
        log(`Loading... ${percent}% - ${message}`, 'info');
    });

    // Error handling
    client.on('error', (error) => {
        log(`WhatsApp client error: ${error.message}`, 'error');
        console.error('Full error:', error);
        authenticationStatus = 'error';
    });

    // Initialize client with error handling
    client.initialize().catch(error => {
        log(`Failed to initialize WhatsApp client: ${error.message}`, 'error');
        console.error('Initialization error:', error);
        authenticationStatus = 'init_failed';
    });
    client.on('message', async (message) => {
        try {
            log(`Received message from ${message.from}: ${message.body}`);
            
            // Forward to n8n webhook if configured
            if (N8N_WEBHOOK_URL) {
                const webhookPayload = {
                    from: message.from,
                    body: message.body,
                    timestamp: message.timestamp,
                    id: message.id.id,
                    hasMedia: message.hasMedia,
                    type: message.type,
                    isGroup: message.from.includes('@g.us')
                };

                await axios.post(N8N_WEBHOOK_URL, webhookPayload, {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 5000
                });

                log(`Message forwarded to n8n webhook: ${N8N_WEBHOOK_URL}`);
            } else {
                log('No N8N_WEBHOOK_URL configured, message not forwarded', 'warn');
            }
        } catch (error) {
            log(`Error handling incoming message: ${error.message}`, 'error');
        }
    });
};

// Routes

// Health check
app.get('/', (req, res) => {
    res.json({
        status: 'running',
        timestamp: new Date().toISOString(),
        whatsapp_status: authenticationStatus,
        client_ready: isClientReady
    });
});

// QR Code display
app.get('/qr', (req, res) => {
    if (authenticationStatus === 'authenticated') {
        res.send(`
            <html>
                <head>
                    <title>WhatsApp Bot - Already Authenticated</title>
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
                        .container { max-width: 500px; margin: 0 auto; padding: 20px; }
                        .status { color: green; font-size: 18px; margin-bottom: 20px; }
                        .info { color: #666; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>WhatsApp Bot</h1>
                        <div class="status">✅ Already Authenticated</div>
                        <div class="info">
                            <p>Your WhatsApp bot is connected and ready to use!</p>
                            <p><strong>Send messages:</strong> POST /send</p>
                            <p><strong>Status:</strong> GET /</p>
                        </div>
                    </div>
                </body>
            </html>
        `);
        return;
    }

    if (authenticationStatus === 'qr_ready' && qrCodeString) {
        QRCode.toDataURL(qrCodeString, (err, url) => {
            if (err) {
                res.status(500).json({ error: 'Failed to generate QR code' });
                return;
            }
            
            res.send(`
                <html>
                    <head>
                        <title>WhatsApp Bot - QR Code</title>
                        <meta http-equiv="refresh" content="5">
                        <style>
                            body { 
                                font-family: Arial, sans-serif; 
                                text-align: center; 
                                margin-top: 50px;
                                background: #f5f5f5;
                            }
                            .container { 
                                max-width: 500px; 
                                margin: 0 auto; 
                                padding: 20px;
                                background: white;
                                border-radius: 10px;
                                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                            }
                            .qr-code { margin: 20px 0; }
                            .instructions { color: #666; margin-top: 20px; }
                            .status { color: orange; font-size: 16px; margin-bottom: 10px; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h1>WhatsApp Bot Setup</h1>
                            <div class="status">📱 Waiting for QR Code Scan</div>
                            <div class="qr-code">
                                <img src="${url}" alt="WhatsApp QR Code" style="max-width: 300px;" />
                            </div>
                            <div class="instructions">
                                <p><strong>Instructions:</strong></p>
                                <ol style="text-align: left; display: inline-block;">
                                    <li>Open WhatsApp on your phone</li>
                                    <li>Go to Settings > Linked Devices</li>
                                    <li>Tap "Link a Device"</li>
                                    <li>Scan this QR code</li>
                                </ol>
                                <p><small>Page refreshes every 5 seconds</small></p>
                            </div>
                        </div>
                    </body>
                </html>
            `);
        });
    } else {
        // Show current status with more details
        const statusMessage = {
            'initializing': '🔄 Initializing WhatsApp client...',
            'init_failed': '❌ Initialization failed - check logs',
            'error': '❌ Client error occurred - check logs',
            'loading': '⏳ Loading WhatsApp Web...'
        }[authenticationStatus] || '🔄 Starting up...';

        res.send(`
            <html>
                <head>
                    <title>WhatsApp Bot - ${authenticationStatus}</title>
                    <meta http-equiv="refresh" content="5">
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
                        .container { max-width: 500px; margin: 0 auto; padding: 20px; }
                        .status { color: ${authenticationStatus.includes('failed') || authenticationStatus.includes('error') ? 'red' : 'blue'}; font-size: 18px; }
                        .debug { background: #f5f5f5; padding: 10px; margin: 20px 0; border-radius: 5px; font-family: monospace; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>WhatsApp Bot</h1>
                        <div class="status">${statusMessage}</div>
                        <p>Please wait while the WhatsApp client starts up.</p>
                        <div class="debug">
                            <strong>Debug Info:</strong><br>
                            Status: ${authenticationStatus}<br>
                            Client Ready: ${isClientReady}<br>
                            Has QR: ${!!qrCodeString}<br>
                            Timestamp: ${new Date().toISOString()}
                        </div>
                        <p><small>Page will refresh automatically every 5 seconds</small></p>
                    </div>
                </body>
            </html>
        `);
    }
});

// Send message endpoint
app.post('/send', async (req, res) => {
    try {
        const { to, message } = req.body;

        if (!to || !message) {
            return res.status(400).json({
                error: 'Missing required fields: to, message'
            });
        }

        if (!isClientReady) {
            return res.status(503).json({
                error: 'WhatsApp client is not ready',
                status: authenticationStatus
            });
        }

        // Format phone number (ensure it includes country code)
        let phoneNumber = to.replace(/\D/g, ''); // Remove all non-digits
        if (!phoneNumber.includes('@c.us')) {
            phoneNumber = phoneNumber + '@c.us';
        }

        log(`Sending message to ${phoneNumber}: ${message}`);
        
        await client.sendMessage(phoneNumber, message);
        
        log(`Message sent successfully to ${phoneNumber}`);
        res.json({
            success: true,
            message: 'Message sent successfully',
            to: phoneNumber,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        log(`Error sending message: ${error.message}`, 'error');
        res.status(500).json({
            error: 'Failed to send message',
            details: error.message
        });
    }
});

// Get client status
app.get('/status', (req, res) => {
    res.json({
        client_ready: isClientReady,
        authentication_status: authenticationStatus,
        has_qr: !!qrCodeString,
        n8n_webhook_configured: !!N8N_WEBHOOK_URL,
        timestamp: new Date().toISOString()
    });
});

// Webhook endpoint for testing (optional)
app.post('/webhook/test', (req, res) => {
    log(`Test webhook received: ${JSON.stringify(req.body, null, 2)}`);
    res.json({ received: true, timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error, req, res, next) => {
    log(`Express error: ${error.message}`, 'error');
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    log(`Server starting on port ${PORT}`);
    log(`QR Code will be available at: http://localhost:${PORT}/qr`);
    log(`Health check available at: http://localhost:${PORT}/`);
    
    if (N8N_WEBHOOK_URL) {
        log(`n8n webhook configured: ${N8N_WEBHOOK_URL}`);
    } else {
        log('No n8n webhook URL configured (set N8N_WEBHOOK_URL in .env)', 'warn');
    }
    
    // Initialize WhatsApp client
    initializeWhatsAppClient();
});

// Graceful shutdown
process.on('SIGINT', async () => {
    log('Received SIGINT, shutting down gracefully...');
    if (client) {
        await client.destroy();
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    log('Received SIGTERM, shutting down gracefully...');
    if (client) {
        await client.destroy();
    }
    process.exit(0);
});