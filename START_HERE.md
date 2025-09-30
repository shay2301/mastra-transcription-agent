# 🎉 START HERE - Mastra Live Transcriber

Welcome! Your app is **up and running** at: **http://localhost:3000**

---

## ✅ What's Working Right Now:

- ✅ **Upload Page:** http://localhost:3000
- ✅ **Live Captions:** http://localhost:3000/live
- ✅ **API:** http://localhost:3000/api/health
- ✅ **Server:** Running in background on port 3000

---

## 🚀 Quick Actions:

### 1. Test File Upload (30 seconds)
1. Open http://localhost:3000
2. Drag any audio file (MP3, M4A, WAV)
3. Click "Transcribe"
4. Download results!

### 2. Try Live Captions (1 minute)
1. Open http://localhost:3000/live
2. Allow microphone access
3. Click "Start Capture"
4. Speak and watch real-time captions!

### 3. Connect to Zoom/Google Meet (5 minutes)

**Quick Setup for macOS:**

```bash
# 1. Install BlackHole (virtual audio device)
brew install blackhole-2ch

# 2. Configure Multi-Output:
# - Open "Audio MIDI Setup" app
# - Create Multi-Output Device
# - Check: Built-in Output + BlackHole 2ch

# 3. Set Zoom/Meet speaker to "Multi-Output Device"

# 4. Change system input:
# System Settings → Sound → Input → BlackHole 2ch

# 5. Open live page and start capture:
open http://localhost:3000/live

# 6. Join your call and watch live captions! 🎉
```

**Full Guide:** [ZOOM_MEET_SETUP.md](ZOOM_MEET_SETUP.md)

---

## 📂 Important Files:

| File | Purpose |
|------|---------|
| [RUN.md](RUN.md) | How to run the app |
| [ZOOM_MEET_SETUP.md](ZOOM_MEET_SETUP.md) | Connect to Zoom/Google Meet |
| [DISCORD_SETUP.md](DISCORD_SETUP.md) | Discord bot setup |
| [README.md](README.md) | Full documentation |
| `.env` | Your API keys (already configured!) |

---

## 🎯 Next Steps:

### For Zoom/Meet Transcription:
1. Install BlackHole: `brew install blackhole-2ch`
2. Follow [ZOOM_MEET_SETUP.md](ZOOM_MEET_SETUP.md)
3. Join a call and transcribe!

### For Discord Bot:
1. Get Discord bot token (see [DISCORD_SETUP.md](DISCORD_SETUP.md))
2. Register commands: `npm run discord:register`
3. Start bot: `npm run discord:start`

### For Development:
1. Code is in [`src/`](src/)
2. Tests: `npm test`
3. Demo: `npm run demo`

---

## 🔧 Common Commands:

```bash
# Start/restart server
npm run dev

# Run tests
npm test

# Demo with sample audio
npm run demo

# Discord bot
npm run discord:register  # First time only
npm run discord:start     # Start bot

# Stop server
# Press Ctrl+C in the terminal where server is running
```

---

## 💡 Tips:

### Audio File Upload
- ✅ Supports: MP3, M4A, WAV, OGG, WEBM
- ✅ Auto-handles large files (transcodes or chunks)
- ✅ Returns text + VTT subtitles

### Live Captions
- ✅ Works with any microphone
- ✅ Real-time with <2.5s latency
- ✅ RTL support for Hebrew

### Zoom/Meet Integration
- ✅ Capture ANY app's audio (not just Zoom/Meet!)
- ✅ Works with: Teams, Discord web, Spotify, etc.
- ✅ No special permissions needed

---

## ❓ Troubleshooting:

### "Cannot connect to server"
**Fix:** Server might have stopped. Run `npm run dev`

### "Microphone not working"
**Fix:**
- Allow microphone in browser settings
- Use `http://localhost` (not `https`)
- Check System Settings → Privacy → Microphone

### "No captions appearing"
**Fix:**
- Make sure audio is playing
- Check System Input is set to correct device
- Refresh browser and restart capture

### "Port 3000 already in use"
**Fix:**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill

# Or use different port in .env
echo "PORT=3001" >> .env
```

---

## 🌐 URLs Reference:

| URL | Purpose |
|-----|---------|
| http://localhost:3000 | Upload page |
| http://localhost:3000/live | Live captions |
| http://localhost:3000/api/transcribe | API endpoint |
| http://localhost:3000/api/health | Health check |
| ws://localhost:3000/ws | WebSocket endpoint |

---

## 📞 Support:

- 📖 **Documentation:** [README.md](README.md)
- 🐛 **Issues:** [GitHub Issues](https://github.com/shay2301/mastra-transcription-agent/issues)
- 💬 **Questions:** [GitHub Discussions](https://github.com/shay2301/mastra-transcription-agent/discussions)

---

## 🎊 You're All Set!

The app is running and ready to use. Start by uploading a file or trying live captions!

**Happy transcribing! 🎙️**

---

*Made with ❤️ using Mastra and Claude Code*
