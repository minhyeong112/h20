#!/bin/bash

# LibreChat Development Server Start Script
# This script starts the development environment

echo "🚀 Starting LibreChat Development Environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm ci
fi

# Check if frontend is built
if [ ! -d "client/dist" ]; then
    echo "🔨 Building frontend..."
    npm run frontend
fi

# Start the development server
echo "🌟 Starting LibreChat API server..."
echo "📍 Server will be available at: http://localhost:3080"
echo "🔧 Environment: Development"
echo "📋 Check logs below for any issues..."
echo ""

# Run the API server in development mode
npm run backend:dev
