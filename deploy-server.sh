#!/bin/bash

# LibreChat DigitalOcean Deployment Script
# Run this script on your DigitalOcean droplet

set -e

echo "🚀 Starting LibreChat deployment..."

# Update system packages
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install required packages
echo "🔧 Installing required packages..."
sudo apt install -y git curl ufw

# Configure firewall
echo "🔐 Configuring firewall..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

# Clone your repository
echo "📥 Cloning LibreChat repository..."
cd /home/$USER
if [ -d "h20" ]; then
    echo "Repository already exists, pulling latest changes..."
    cd h20
    git pull
else
    git clone https://github.com/minhyeong112/h20.git
    cd h20
fi

# Create necessary directories
echo "📁 Creating directories..."
sudo mkdir -p ./data-node
sudo mkdir -p ./meili_data_v1.12
sudo mkdir -p ./logs
sudo mkdir -p ./uploads
sudo mkdir -p ./images

# Set proper permissions
sudo chown -R $USER:$USER ./data-node ./meili_data_v1.12 ./logs ./uploads ./images

# Copy environment file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "⚙️ Setting up environment file..."
    cp .env.example .env
fi

# Update domain in .env file
echo "🌐 Updating domain configuration..."
sudo sed -i "s|DOMAIN_CLIENT=http://localhost:3080|DOMAIN_CLIENT=http://167.71.217.38|g" .env
sudo sed -i "s|DOMAIN_SERVER=http://localhost:3080|DOMAIN_SERVER=http://167.71.217.38|g" .env
sudo sed -i "s|HOST=localhost|HOST=0.0.0.0|g" .env

# Set branding variables
echo "🎨 Setting up Vajra branding..."
if ! grep -q "APP_TITLE=Vajra" .env; then
    echo "APP_TITLE=Vajra" >> .env
fi
if ! grep -q 'CUSTOM_FOOTER="Vajra"' .env; then
    echo 'CUSTOM_FOOTER="Vajra"' >> .env
fi

# Start the application
echo "🚀 Starting LibreChat with Docker Compose..."
sudo docker-compose -f deploy-compose.yml down
sudo docker-compose -f deploy-compose.yml pull
sudo docker-compose -f deploy-compose.yml up -d

echo "✅ Deployment complete!"
echo ""
echo "🌐 Your LibreChat instance is now running at:"
echo "   http://167.71.217.38"
echo ""
echo "⚠️  Important next steps:"
echo "   1. Add your AI API keys to the .env file"
echo "   2. Restart the containers: sudo docker-compose -f deploy-compose.yml restart"
echo "   3. Set up a domain name and SSL certificate"
echo ""
echo "📊 Check status with: sudo docker-compose -f deploy-compose.yml ps"
echo "📝 View logs with: sudo docker-compose -f deploy-compose.yml logs -f"
