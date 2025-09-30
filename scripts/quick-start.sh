#!/bin/bash

# Quick Start Script for Mastra Live Transcriber
# Run: bash scripts/quick-start.sh

set -e

echo "🎙️  Mastra Live Transcriber - Quick Start"
echo "=========================================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "   Install from: https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'.' -f1 | sed 's/v//')
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js version must be 20 or higher (you have: $(node -v))"
    exit 1
fi
echo "✅ Node.js $(node -v)"

# Check ffmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ ffmpeg is not installed"
    echo ""
    echo "Install it:"
    echo "  macOS:   brew install ffmpeg"
    echo "  Ubuntu:  sudo apt install ffmpeg"
    echo "  Windows: choco install ffmpeg"
    exit 1
fi
echo "✅ ffmpeg $(ffmpeg -version | head -n 1 | awk '{print $3}')"

# Check .env file
if [ ! -f ".env.local" ] && [ ! -f ".env" ]; then
    echo "❌ No .env.local or .env file found"
    echo ""
    echo "Creating .env.local from template..."
    cp .env.example .env.local
    echo ""
    echo "⚠️  Please edit .env.local and add your OPENROUTER_API_KEY"
    echo "   Get your key from: https://openrouter.ai"
    echo ""
    echo "Run this script again after configuring."
    exit 1
fi

# Check API key
ENV_FILE=".env.local"
[ ! -f ".env.local" ] && ENV_FILE=".env"

if ! grep -q "OPENROUTER_API_KEY=sk" "$ENV_FILE"; then
    echo "❌ OPENROUTER_API_KEY not configured in $ENV_FILE"
    echo "   Add your key: OPENROUTER_API_KEY=sk-or-v1-..."
    exit 1
fi
echo "✅ OpenRouter API key configured"

# Check dependencies
if [ ! -d "node_modules" ]; then
    echo ""
    echo "📦 Installing dependencies..."
    npm install
fi
echo "✅ Dependencies installed"

echo ""
echo "=========================================="
echo "✅ All prerequisites met!"
echo ""
echo "Choose what to run:"
echo ""
echo "1. File Upload & Transcription (Web UI)"
echo "2. Live Captions (Real-time)"
echo "3. Discord Bot"
echo "4. Demo (Test with sample audio)"
echo ""
read -p "Enter choice (1-4): " choice

case $choice in
    1)
        echo ""
        echo "🚀 Starting server..."
        echo ""
        echo "Web UI will be available at:"
        echo "  📝 Upload:  http://localhost:3000"
        echo "  🎤 Live:    http://localhost:3000/live"
        echo ""
        npm run dev
        ;;
    2)
        echo ""
        echo "🎤 Starting live captions..."
        echo ""
        echo "Opening http://localhost:3000/live"
        npm run dev &
        sleep 3
        open http://localhost:3000/live 2>/dev/null || xdg-open http://localhost:3000/live 2>/dev/null || echo "Open http://localhost:3000/live in your browser"
        wait
        ;;
    3)
        if ! grep -q "DISCORD_BOT_TOKEN=" "$ENV_FILE" || ! grep -q "DISCORD_CLIENT_ID=" "$ENV_FILE"; then
            echo ""
            echo "❌ Discord credentials not configured"
            echo ""
            echo "See DISCORD_SETUP.md for instructions"
            echo "Add to $ENV_FILE:"
            echo "  DISCORD_BOT_TOKEN=your_token"
            echo "  DISCORD_CLIENT_ID=your_client_id"
            exit 1
        fi
        echo ""
        echo "🤖 Starting Discord bot..."
        npm run discord:start
        ;;
    4)
        echo ""
        echo "🎬 Running demo..."
        npm run demo
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac
