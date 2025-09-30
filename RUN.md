# 🚀 How to Run This App

## Quick Commands

```bash
# 1. Install dependencies (first time only)
npm install

# 2. Start the server
npm run dev

# 3. Open in browser:
#    - Upload page: http://localhost:3000
#    - Live captions: http://localhost:3000/live
```

That's it! 🎉

---

## Detailed Instructions

### Option 1: File Transcription

Upload and transcribe audio files:

```bash
# Start server
npm run dev

# Open browser
open http://localhost:3000
```

Then:
1. Click or drag an audio file (MP3, M4A, WAV, etc.)
2. Select language (auto-detect, English, Hebrew, etc.)
3. Click "Transcribe"
4. Download results as TXT or VTT

### Option 2: Live Captions

Real-time transcription from your microphone:

```bash
# Start server
npm run dev

# Open live page
open http://localhost:3000/live
```

Then:
1. Allow microphone access when prompted
2. Click "Start Capture"
3. Speak into your microphone
4. Watch real-time captions appear!

### Option 3: Test with Demo

Run automated demo with sample audio:

```bash
npm run demo
```

This will:
- Generate a 30-second test audio file
- Transcribe it using OpenRouter/Groq Whisper
- Show results and save to `/tmp`

---

## 📹 Connect to Zoom/Google Meet

To transcribe Zoom or Google Meet calls, you need to route system audio through a virtual audio device.

### Quick Setup (macOS):

1. **Install BlackHole:**
   ```bash
   brew install blackhole-2ch
   ```

2. **Create Multi-Output Device:**
   - Open **Audio MIDI Setup** (Applications → Utilities)
   - Click **+** → **Create Multi-Output Device**
   - Check: ✅ Built-in Output + ✅ BlackHole 2ch
   - Use this as system output

3. **Configure Zoom/Meet:**
   - Zoom: Settings → Audio → Speaker: Multi-Output Device
   - Meet: In meeting → Settings → Speakers: Multi-Output Device

4. **Start Transcription:**
   ```bash
   npm run dev
   open http://localhost:3000/live
   ```

5. **Set Input Device:**
   - System Settings → Sound → Input → BlackHole 2ch
   - Refresh browser and allow microphone (BlackHole)
   - Click "Start Capture"

6. **Join Your Call and Watch Captions! 🎉**

**Full Guide:** See [ZOOM_MEET_SETUP.md](ZOOM_MEET_SETUP.md) for detailed instructions.

---

## 🤖 Discord Bot

Transcribe Discord voice channels:

### Setup:

1. **Get Discord credentials** (see [DISCORD_SETUP.md](DISCORD_SETUP.md))

2. **Add to `.env`:**
   ```bash
   DISCORD_BOT_TOKEN=your_token
   DISCORD_CLIENT_ID=your_client_id
   ```

3. **Register commands:**
   ```bash
   npm run discord:register
   ```

4. **Start bot:**
   ```bash
   npm run discord:start
   ```

5. **Use in Discord:**
   - Join a voice channel
   - Type `/join` in any text channel
   - Bot will join and start transcribing
   - Type `/leave` when done

---

## 🔧 Troubleshooting

### Server won't start

**Error:** `OPENROUTER_API_KEY is required`

**Fix:**
```bash
# Check if .env or .env.local exists
ls -la .env*

# Add your API key
echo "OPENROUTER_API_KEY=sk-or-v1-your-key-here" >> .env.local
```

### ffmpeg not found

**Error:** `ffmpeg exited with code 1`

**Fix:**
```bash
# Install ffmpeg
brew install ffmpeg  # macOS
sudo apt install ffmpeg  # Ubuntu

# Verify
ffmpeg -version
```

### Port already in use

**Error:** `Port 3000 is already in use`

**Fix:**
```bash
# Change port in .env.local
echo "PORT=3001" >> .env.local

# Or kill the process using port 3000
lsof -ti:3000 | xargs kill
```

### Microphone not working

**Issue:** Live captions show nothing

**Fix:**
- Allow microphone permission in browser
- Use `http://localhost` (not `https` for local dev)
- Check System Settings → Privacy → Microphone

### Dependencies fail to install

**Error:** `npm install` errors

**Fix:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

---

## 📊 What Runs Where

| Command | Port | URL | Purpose |
|---------|------|-----|---------|
| `npm run dev` | 3000 | http://localhost:3000 | Upload page |
| `npm run dev` | 3000 | http://localhost:3000/live | Live captions |
| `npm run dev` | 3000 | ws://localhost:3000/ws | WebSocket |
| `npm run discord:start` | - | - | Discord bot |
| `npm run demo` | - | - | Test transcription |

---

## 🎯 Next Steps

1. ✅ Run the app: `npm run dev`
2. 📝 Upload a file at http://localhost:3000
3. 🎤 Try live at http://localhost:3000/live
4. 📹 Connect to Zoom/Meet ([guide](ZOOM_MEET_SETUP.md))
5. 🤖 Add Discord bot ([guide](DISCORD_SETUP.md))

---

## 📚 More Help

- [README.md](README.md) - Full documentation
- [QUICKSTART.md](QUICKSTART.md) - 5-minute setup
- [ZOOM_MEET_SETUP.md](ZOOM_MEET_SETUP.md) - Video call integration
- [DISCORD_SETUP.md](DISCORD_SETUP.md) - Discord bot setup
- [Issues](https://github.com/shay2301/mastra-transcription-agent/issues) - Report bugs

---

**Ready to go?** Run: `npm run dev` 🚀
