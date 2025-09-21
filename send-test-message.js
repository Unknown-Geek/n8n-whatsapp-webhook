#!/usr/bin/env node

// Test script to send a message via the WhatsApp bot
const axios = require('axios');

const sendMessage = async () => {
    const phoneNumber = '+919074691700';
    const message = 'Hello! This is a test message from your WhatsApp bot. The QR code generation and Chrome setup is now working successfully! 🎉';

    try {
        console.log(`Sending message to ${phoneNumber}...`);
        
        const response = await axios.post('https://n8n-whatsapp-webhook-production.up.railway.app/send', {
            to: phoneNumber,
            message: message
        });
        
        console.log('Message sent successfully:', response.data);
    } catch (error) {
        if (error.response) {
            console.error('Error sending message:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
};

// Check if bot is ready first
const checkStatus = async () => {
    try {
        const response = await axios.get('https://n8n-whatsapp-webhook-production.up.railway.app/');
        console.log('Bot status:', response.data);
        
        if (response.data.client_ready && response.data.whatsapp_status === 'authenticated') {
            await sendMessage();
        } else {
            console.log('Bot is not ready yet. Please scan the QR code first.');
            console.log('QR Code available at: https://n8n-whatsapp-webhook-production.up.railway.app/qr');
            console.log(`Current status: ${response.data.whatsapp_status}, Ready: ${response.data.client_ready}`);
        }
    } catch (error) {
        console.error('Error checking bot status:', error.message);
    }
};

checkStatus();