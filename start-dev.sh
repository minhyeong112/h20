#!/bin/bash

# LibreChat Development Server Start Script
# This script starts the optimal development environment with hot-reload

echo "🚀 Starting LibreChat Development Environment (Hot-Reload Mode)..."

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

# Build required packages for development
echo "🔨 Building required packages..."
npm run build:data-provider
npm run build:data-schemas  
npm run build:api

echo ""
echo "🎯 DEVELOPMENT MODE - Two servers will start:"
echo "   📍 Backend API: http://localhost:3080 (with hot-reload)"
echo "   📍 Frontend Dev: http://localhost:3090 (with instant updates)"
echo ""
echo "⚡ For development, use http://localhost:3090 - it has instant change reflection!"
echo "🔧 Environment: Development with Hot-Reload"
echo ""
echo "📋 Starting servers..."
echo "   💡 Tip: Open http://localhost:3090 in your browser for development"
echo ""

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "🛑 Stopping development servers..."
    jobs -p | xargs -r kill
    exit
}

# Set up trap for cleanup
trap cleanup SIGINT SIGTERM

# Start backend server in background
echo "🔧 Starting backend server (port 3080)..."
npm run backend:dev &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 3

# Start frontend dev server in background
echo "🎨 Starting frontend dev server (port 3090)..."
npm run frontend:dev &
FRONTEND_PID=$!

echo ""
echo "✅ Both servers are starting up..."
echo "   🔗 Open http://localhost:3090 for development"
echo "   📊 Backend logs will appear below"
echo ""
echo "🔄 Press Ctrl+C to stop both servers"
echo ""

# Wait for background processes
wait
