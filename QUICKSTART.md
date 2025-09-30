# ⚡ Quick Start Guide

Get up and running in 5 minutes!

## Prerequisites

- Node.js 20+ ([download](https://nodejs.org))
- ffmpeg ([install guide](https://ffmpeg.org/download.html))
- OpenRouter API key ([get key](https://openrouter.ai))

## Installation

```bash
# Clone the repository
git clone https://github.com/shay2301/mastra-transcription-agent.git
cd mastra-transcription-agent

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
nano .env.local  # Add your OPENROUTER_API_KEY
```

## Basic Usage

### 1. File Transcription

```bash
# Start server
npm run dev

# Open browser
open http://localhost:3000

# Upload an audio file and click "Transcribe"
```

### 2. Live Captions

```bash
# Make sure server is running
npm run dev

# Open live page
open http://localhost:3000/live

# Click "Start Capture" and allow microphone access
```

### 3. Demo Mode

```bash
# Run automated demo with sample audio
npm run demo
```

## Discord Bot (Optional)

```bash
# 1. Get Discord credentials (see DISCORD_SETUP.md)
# 2. Add to .env.local:
DISCORD_BOT_TOKEN=your_token
DISCORD_CLIENT_ID=your_client_id

# 3. Register commands
npm run discord:register

# 4. Start bot
npm run discord:start

# 5. In Discord: /join (from a voice channel)
```

## Common Commands

```bash
npm run dev              # Start development server
npm test                 # Run tests
npm run demo             # Run demo with sample audio
npm run discord:register # Register Discord slash commands
npm run discord:start    # Start Discord bot
```

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Check [DISCORD_SETUP.md](DISCORD_SETUP.md) for Discord bot setup
- See [CONTRIBUTING.md](CONTRIBUTING.md) to contribute

## Troubleshooting

**Server won't start:**
- Check `OPENROUTER_API_KEY` is set in `.env.local`
- Verify port 3000 is available

**Microphone not working:**
- Allow microphone permission in browser
- Use `http://localhost` (not `https` for local dev)

**ffmpeg errors:**
- Run `ffmpeg -version` to verify installation
- Make sure it's in your PATH

## Support

- 📖 [Full Documentation](README.md)
- 🐛 [Report Issues](https://github.com/shay2301/mastra-transcription-agent/issues)
- 💬 [Discussions](https://github.com/shay2301/mastra-transcription-agent/discussions)

---

Made with ❤️ using [Mastra](https://mastra.ai) and [Claude Code](https://claude.com/claude-code)
