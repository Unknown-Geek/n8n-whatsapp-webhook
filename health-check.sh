#!/bin/bash

# WhatsApp Bot Health Check Script
# Restarts the container if the client is not ready or has errors

LOG_FILE="/home/ubuntu/n8n-whatsapp-webhook/health-check.log"
COMPOSE_DIR="/home/ubuntu/n8n-whatsapp-webhook"
MAX_LOG_SIZE=1048576  # 1MB

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Rotate log if too large
if [ -f "$LOG_FILE" ] && [ $(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null) -gt $MAX_LOG_SIZE ]; then
    mv "$LOG_FILE" "${LOG_FILE}.old"
    log "Log rotated"
fi

# Check status endpoint
RESPONSE=$(curl -s --connect-timeout 10 --max-time 15 http://localhost:3000/status 2>&1)
CURL_EXIT=$?

if [ $CURL_EXIT -ne 0 ]; then
    log "ERROR: Cannot reach status endpoint (exit code: $CURL_EXIT). Restarting container..."
    cd "$COMPOSE_DIR" && docker compose restart
    sleep 30
    exit 1
fi

# Check if client is ready
CLIENT_READY=$(echo "$RESPONSE" | grep -o '"client_ready":[^,]*' | cut -d':' -f2)

if [ "$CLIENT_READY" != "true" ]; then
    log "WARNING: Client not ready (client_ready=$CLIENT_READY). Waiting..."
    # Give it some time on first check, don't immediately restart
    sleep 60
    
    # Check again
    RESPONSE=$(curl -s --connect-timeout 10 --max-time 15 http://localhost:3000/status 2>&1)
    CLIENT_READY=$(echo "$RESPONSE" | grep -o '"client_ready":[^,]*' | cut -d':' -f2)
    
    if [ "$CLIENT_READY" != "true" ]; then
        log "ERROR: Client still not ready after waiting. Restarting container..."
        cd "$COMPOSE_DIR" && docker compose restart
        sleep 30
        exit 1
    fi
fi

# Test actual message sending capability (dry run check)
# Send a test request to check for "detached Frame" or similar errors
TEST_RESPONSE=$(curl -s --connect-timeout 10 --max-time 30 \
    -X POST http://localhost:3000/send \
    -H "Content-Type: application/json" \
    -d '{"to": "test", "message": "health_check_ping"}' 2>&1)

# Check for known error patterns that require restart
if echo "$TEST_RESPONSE" | grep -qi "detached Frame\|Cannot verify client state\|client is null\|Session closed"; then
    log "ERROR: Detected stale session error: $TEST_RESPONSE"
    log "Restarting container..."
    cd "$COMPOSE_DIR" && docker compose restart
    sleep 30
    exit 1
fi

log "OK: WhatsApp client is healthy (client_ready=$CLIENT_READY)"
exit 0
