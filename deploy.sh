#!/bin/bash

# Script to deploy to Vercel with optimized settings

# Build the application locally first to verify it works
npm run build

# Configure Vercel CLI with increased timeout
echo "Configuring Vercel settings..."
npx vercel env add OPENAI_MODEL production gpt-3.5-turbo
npx vercel env add NEXT_PUBLIC_VERCEL_MAX_FUNCTION_TIMEOUT production 90000

# Deploy with specific configuration
echo "Deploying to Vercel..."
npx vercel deploy --prod --confirm --timeout 120000

echo "Deployment complete!" 