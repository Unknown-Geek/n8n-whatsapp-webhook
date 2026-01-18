const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const QRCode = require('qrcode');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuration
const PORT = process.env.PORT || 3000;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

// Chrome path detection
const getChromePath = () => {
    // Local Chrome installation paths to try
    const localChromePaths = [
        path.join(__dirname, 'chrome', 'opt', 'google', 'chrome', 'chrome'),
        path.join(__dirname, 'chrome', 'opt', 'google', 'chrome', 'google-chrome'),
    ];
    
    // System Chrome paths to try
    const systemChromePaths = [
        process.env.GOOGLE_CHROME_BIN,
        '/usr/bin/google-chrome-stable',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium'
    ].filter(Boolean);
    
    // Try local Chrome first
    for (const chromePath of localChromePaths) {
        if (fs.existsSync(chromePath)) {
            return chromePath;
        }
    }
    
    // Try system Chrome
    for (const chromePath of systemChromePaths) {
        if (fs.existsSync(chromePath)) {
            return chromePath;
        }
    }
    
    // Return null to use bundled Chromium
    return null;
};

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
    
    const chromePath = getChromePath();
    
    const puppeteerConfig = {
        headless: 'new', // Use new headless mode for Chrome 112+
        timeout: 180000, // 3 minutes timeout for Cloud Run
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=TranslateUI,VizDisplayCompositor,site-per-process,Translate,BackForwardCache,AutomationControlled',
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
            '--max_old_space_size=2048',
            '--disable-extensions',
            '--disable-plugins',
            '--disable-default-apps',
            '--disable-background-networking',
            '--disable-sync',
            '--metrics-recording-only',
            '--no-crash-upload',
            '--disable-component-update',
            '--disable-popup-blocking',
            '--disable-translate',
            '--disable-client-side-phishing-detection',
            '--disable-hang-monitor',
            '--disable-prompt-on-repost',
            '--disable-infobars',
            '--window-size=1280,800',
            '--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
            '--no-process-per-tab',
            '--disable-process-per-site',
            '--disable-site-isolation-trials',
            '--user-data-dir=/tmp/chrome-profile-' + Date.now()
        ],
        handleSIGINT: false,
        handleSIGTERM: false,
        handleSIGHUP: false
    };

    if (chromePath) {
        puppeteerConfig.executablePath = chromePath;
        log(`Using Chrome executable: ${chromePath}`);
    } else {
        log('Using bundled Chromium (Chrome not found)');
    }
    
    try {
        log('Creating WhatsApp client with Puppeteer config...');
        client = new Client({
            authStrategy: new LocalAuth({
                dataPath: './whatsapp-session'
            }),
            puppeteer: puppeteerConfig
        });

        // Add initialization timeout
        const initTimeout = setTimeout(() => {
            log('ERROR: WhatsApp client initialization timed out after 60 seconds');
            authenticationStatus = 'timeout';
        }, 60000);

        // QR Code generation
        client.on('qr', (qr) => {
            clearTimeout(initTimeout);
            log('✅ QR Code received, generating QR code string...');
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
    } catch (error) {
        log(`ERROR: Failed to create WhatsApp client: ${error.message}`, 'error');
        authenticationStatus = 'error';
    }
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
                status: authenticationStatus,
                client_state: client ? 'exists' : 'null'
            });
        }

        // Double-check client state
        if (!client) {
            return res.status(503).json({
                error: 'WhatsApp client is null',
                status: authenticationStatus
            });
        }

        // Check if client is actually connected
        try {
            const state = await client.getState();
            log(`Client state: ${state}`);
            
            if (state !== 'CONNECTED') {
                return res.status(503).json({
                    error: 'WhatsApp client is not connected',
                    status: authenticationStatus,
                    client_state: state
                });
            }
        } catch (stateError) {
            log(`Error getting client state: ${stateError.message}`, 'error');
            return res.status(503).json({
                error: 'Cannot verify client state',
                details: stateError.message
            });
        }

        // Format phone number (ensure it includes country code)
        let phoneNumber = to.replace(/\D/g, ''); // Remove all non-digits
        if (!phoneNumber.includes('@c.us')) {
            phoneNumber = phoneNumber + '@c.us';
        }

        log(`Sending message to ${phoneNumber}: ${message}`);
        
        // Add timeout for message sending
        const sendMessageWithTimeout = async () => {
            return Promise.race([
                // Pass sendSeen: false to workaround WhatsApp Web API change (markedUnread error)
                // See: https://github.com/pedroslopez/whatsapp-web.js/issues/5718
                client.sendMessage(phoneNumber, message, { sendSeen: false }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Message send timeout after 30 seconds')), 30000)
                )
            ]);
        };
        
        // Send the message and wait for completion
        const result = await sendMessageWithTimeout();
        
        log(`Message sent successfully to ${phoneNumber}. Result ID: ${result.id || 'N/A'}`);
        res.json({
            success: true,
            message: 'Message sent successfully',
            to: phoneNumber,
            result: { id: result.id, ack: result.ack },
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

// Get all chats (including groups and channels)
app.get('/chats', async (req, res) => {
    try {
        if (!isClientReady) {
            return res.status(503).json({
                error: 'WhatsApp client is not ready',
                status: authenticationStatus
            });
        }

        const chats = await client.getChats();
        
        const chatList = chats.map(chat => ({
            id: chat.id._serialized,
            name: chat.name,
            isGroup: chat.isGroup,
            timestamp: chat.timestamp,
            unreadCount: chat.unreadCount
        }));

        res.json({
            success: true,
            count: chatList.length,
            chats: chatList
        });

    } catch (error) {
        log(`Error fetching chats: ${error.message}`, 'error');
        res.status(500).json({
            error: 'Failed to fetch chats',
            details: error.message
        });
    }
});

// Get all groups
app.get('/groups', async (req, res) => {
    try {
        if (!isClientReady) {
            return res.status(503).json({
                error: 'WhatsApp client is not ready',
                status: authenticationStatus
            });
        }

        const chats = await client.getChats();
        const groups = chats.filter(chat => chat.isGroup);
        
        const groupList = groups.map(group => ({
            id: group.id._serialized,
            name: group.name,
            timestamp: group.timestamp,
            participantsCount: group.participants ? group.participants.length : 0
        }));

        res.json({
            success: true,
            count: groupList.length,
            groups: groupList
        });

    } catch (error) {
        log(`Error fetching groups: ${error.message}`, 'error');
        res.status(500).json({
            error: 'Failed to fetch groups',
            details: error.message
        });
    }
});

// Send message to channel/newsletter (if you're an admin)
app.post('/send-to-channel', async (req, res) => {
    try {
        const { channelId, message } = req.body;

        if (!channelId || !message) {
            return res.status(400).json({
                error: 'Missing required fields: channelId, message',
                example: {
                    channelId: '1234567890@newsletter',
                    message: 'Your message here'
                }
            });
        }

        if (!isClientReady) {
            return res.status(503).json({
                error: 'WhatsApp client is not ready',
                status: authenticationStatus
            });
        }

        // Ensure proper channel ID format
        let formattedChannelId = channelId;
        if (!channelId.includes('@newsletter')) {
            formattedChannelId = channelId + '@newsletter';
        }

        log(`Sending message to channel ${formattedChannelId}: ${message}`);
        
        const result = await client.sendMessage(formattedChannelId, message);
        
        log(`Message sent to channel successfully. Result ID: ${result.id || 'N/A'}`);
        res.json({
            success: true,
            message: 'Message sent to channel successfully',
            channelId: formattedChannelId,
            result: { id: result.id, ack: result.ack },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        log(`Error sending message to channel: ${error.message}`, 'error');
        res.status(500).json({
            error: 'Failed to send message to channel',
            details: error.message,
            note: 'Make sure you are an admin of the channel and the channel ID is correct'
        });
    }
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