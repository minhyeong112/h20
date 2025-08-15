#!/bin/bash

echo "🔄 Force rebuilding and deploying LibreChat..."

# Navigate to the project directory
cd ~/h20 || { echo "❌ Error: h20 directory not found"; exit 1; }

# Pull latest changes
echo "📥 Pulling latest changes from GitHub..."
git fetch origin
git reset --hard origin/main

# Stop and remove all containers
echo "🛑 Stopping current deployment..."
docker compose -f deploy-compose.yml down

# Remove old images to force rebuild
echo "🗑️ Removing old Docker images..."
docker images | grep "h20" | awk '{print $3}' | xargs -r docker rmi -f

# Rebuild and start with no cache
echo "🔨 Building from scratch (this will take a few minutes)..."
docker compose -f deploy-compose.yml build --no-cache

# Start the services
echo "🚀 Starting services..."
docker compose -f deploy-compose.yml up -d

# Check status
echo "✅ Deployment complete! Checking status..."
docker compose -f deploy-compose.yml ps

echo "📊 Container logs (last 20 lines):"
docker compose -f deploy-compose.yml logs --tail=20
