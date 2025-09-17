#!/bin/bash

# WhatsApp Bot Test Script
# This script demonstrates how to use the WhatsApp bot APIs

echo "🚀 WhatsApp Bot API Test Script"
echo "================================="

BASE_URL="http://localhost:3000"

echo
echo "1. Testing health check endpoint..."
curl -s "$BASE_URL/" | jq .

echo
echo "2. Testing status endpoint..."
curl -s "$BASE_URL/status" | jq .

echo
echo "3. Testing send message endpoint (with test data)..."
echo "   Note: This will fail until WhatsApp is authenticated"

curl -X POST "$BASE_URL/send" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+1234567890",
    "message": "Hello from WhatsApp Bot! This is a test message."
  }' | jq .

echo
echo "4. Testing webhook endpoint (for debugging)..."
curl -X POST "$BASE_URL/webhook/test" \
  -H "Content-Type: application/json" \
  -d '{
    "test": "data",
    "message": "This is a test webhook payload"
  }' | jq .

echo
echo "✅ API testing complete!"
echo
echo "🔗 Access points:"
echo "   • QR Code UI: $BASE_URL/qr"
echo "   • Health Check: $BASE_URL/"
echo "   • Status: $BASE_URL/status"
echo "   • Send Message: POST $BASE_URL/send"
echo
echo "📝 Next steps:"
echo "   1. Visit $BASE_URL/qr to scan QR code with WhatsApp"
echo "   2. Set N8N_WEBHOOK_URL in .env file"
echo "   3. Use POST $BASE_URL/send to send messages"