#!/bin/bash

# WhatsApp Bot GCP Cloud Run Deployment Script
# This script builds and deploys the WhatsApp bot to Google Cloud Run

set -e

# Configuration
PROJECT_ID=${GOOGLE_CLOUD_PROJECT:-"whatsapp-bot-106526590035"}
SERVICE_NAME="whatsapp-bot"
REGION="europe-west1"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo "🚀 Deploying WhatsApp Bot to GCP Cloud Run..."
echo "Project: $PROJECT_ID"
echo "Service: $SERVICE_NAME"
echo "Region: $REGION"
echo ""

# Build the Docker image
echo "📦 Building Docker image..."
docker build -t $IMAGE_NAME .

# Push the image to Google Container Registry
echo "⬆️ Pushing image to GCR..."
docker push $IMAGE_NAME

# Deploy to Cloud Run
echo "🌐 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 3600 \
  --concurrency 10 \
  --max-instances 1 \
  --set-env-vars "NODE_ENV=production,PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true,GOOGLE_CHROME_BIN=/usr/bin/google-chrome-stable" \
  --project $PROJECT_ID

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)" --project=$PROJECT_ID)

echo ""
echo "✅ Deployment completed!"
echo "🌐 Service URL: $SERVICE_URL"
echo "📱 QR Code: $SERVICE_URL/qr"
echo "🔍 Status: $SERVICE_URL/status"
echo ""
echo "💡 Tips:"
echo "  - Check logs: gcloud logging read \"resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME\" --limit=50 --format=\"table(timestamp,textPayload)\" --project=$PROJECT_ID"
echo "  - Monitor service: $SERVICE_URL"
echo "  - The service may take 1-2 minutes to fully initialize"