#!/bin/bash

# YouTube Comment Analyzer Deployment Script
# This script deploys the Cloud Function with all necessary configuration

set -e  # Exit on any error

echo "🚀 Deploying YouTube Comment Analyzer Cloud Function..."

# Load environment variables
if [ -f "env.local" ]; then
    source env.local
else
    echo "❌ Error: env.local file not found. Please create it with your configuration."
    exit 1
fi

# Verify required environment variables
if [ -z "$YOUTUBE_API_KEY" ]; then
    echo "❌ Error: YOUTUBE_API_KEY is not set in env.local"
    exit 1
fi

if [ -z "$GOOGLE_CLOUD_PROJECT" ]; then
    echo "❌ Error: GOOGLE_CLOUD_PROJECT is not set in env.local"
    exit 1
fi

echo "📋 Configuration:"
echo "   Project: $GOOGLE_CLOUD_PROJECT"
echo "   Region: $FUNCTION_REGION"
echo "   Memory: $FUNCTION_MEMORY"
echo "   Timeout: $FUNCTION_TIMEOUT"
echo "   Service Account: $SERVICE_ACCOUNT_EMAIL"

# Set the project
gcloud config set project $GOOGLE_CLOUD_PROJECT

# Deploy the Cloud Function
echo "🔧 Deploying Cloud Function..."
gcloud functions deploy analyze-youtube-comments \
    --gen2 \
    --runtime=nodejs20 \
    --region=$FUNCTION_REGION \
    --source=. \
    --entry-point=analyzeComments \
    --trigger=http \
    --allow-unauthenticated \
    --memory=$FUNCTION_MEMORY \
    --timeout=$FUNCTION_TIMEOUT \
    --service-account=$SERVICE_ACCOUNT_EMAIL \
    --set-env-vars="YOUTUBE_API_KEY=$YOUTUBE_API_KEY,VERTEX_AI_LOCATION=$VERTEX_AI_LOCATION" \
    --max-instances=10

echo "✅ Deployment completed successfully!"
echo ""
echo "🌐 Your Cloud Function URL:"
gcloud functions describe analyze-youtube-comments --region=$FUNCTION_REGION --gen2 --format="value(serviceConfig.uri)"

echo ""
echo "📊 To view logs:"
echo "gcloud functions logs read analyze-youtube-comments --region=$FUNCTION_REGION --gen2 --limit=50" 