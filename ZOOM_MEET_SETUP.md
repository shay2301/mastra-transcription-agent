# 📹 Zoom & Google Meet Integration Guide

Complete guide to connect live transcription to Zoom and Google Meet calls.

---

## 🎯 Overview

There are **two approaches** to capture audio from video calls:

1. **Virtual Audio Device** (Recommended, works for both Zoom & Meet)
2. **Native SDK** (Zoom only, requires enterprise license)

---

## Method 1: Virtual Audio Device (Recommended ✅)

This method works for **ANY** video conferencing app (Zoom, Meet, Teams, etc.)

### How It Works

```
Zoom/Meet Call → Virtual Audio Cable → Browser Microphone → WebSocket → Transcription
```

### Setup Instructions

#### Step 1: Install Virtual Audio Device

**macOS - BlackHole:**
```bash
brew install blackhole-2ch
```

**Windows - VB-CABLE:**
1. Download from [vb-audio.com/Cable](https://vb-audio.com/Cable/)
2. Extract and run `VBCABLE_Setup_x64.exe`
3. Restart computer

**Linux - PulseAudio:**
```bash
# Create virtual sink
pactl load-module module-null-sink sink_name=VirtualSink sink_properties=device.description=VirtualSink

# Create loopback
pactl load-module module-loopback source=VirtualSink.monitor
```

#### Step 2: Configure Multi-Output (macOS only)

1. Open **Audio MIDI Setup** (Applications → Utilities → Audio MIDI Setup)
2. Click **+** (bottom left) → **Create Multi-Output Device**
3. Check both:
   - ✅ Built-in Output (or your speakers)
   - ✅ BlackHole 2ch
4. Right-click the Multi-Output → **Use This Device For Sound Output**
5. Rename to "Meeting Output" (optional)

#### Step 3: Configure Zoom/Meet

**Zoom:**
1. Open Zoom → Settings → Audio
2. Speaker: Select **Multi-Output Device** (or **CABLE Input** on Windows)
3. Microphone: Keep as your real mic
4. ✅ Check "Automatically adjust microphone volume"

**Google Meet:**
1. In meeting → Click ⚙️ (Settings)
2. Audio → Speakers: Select **Multi-Output Device** (or **CABLE Input**)
3. Microphone: Keep as your real mic

#### Step 4: Start Transcription

1. **Start the server:**
   ```bash
   npm run dev
   ```

2. **Open live captions:**
   ```bash
   open http://localhost:3000/live
   ```

3. **Configure browser audio:**
   - In the live page, browser will ask for microphone permission
   - **macOS:** Open System Settings → Sound → Input
     - Change input device to **BlackHole 2ch**
   - **Windows:** In browser mic settings, select **CABLE Output**

4. **Join your Zoom/Meet call**

5. **Click "Start Capture"** in the live page

6. **Start speaking or playing audio** - you'll see live captions!

#### Step 5: Restore Audio After Call

**macOS:**
1. System Settings → Sound → Output
2. Change back to **Built-in Output** (or your speakers)
3. Input → Change back to **Built-in Microphone**

**Windows:**
1. Right-click speaker icon → Sound settings
2. Output: Change back to your speakers
3. Input: Change back to your microphone

---

## Method 2: Zoom Native SDK (Enterprise Only)

### Requirements

⚠️ **This requires:**
- Zoom Meeting SDK license ($1,999+/year)
- Raw Audio Data access (enterprise feature)
- C++ development experience
- Native Node.js addon or Electron app

### Status

This is currently a **scaffold only**. See [`src/zoom/join.ts`](src/zoom/join.ts) for code structure.

### Implementation Steps (if you have SDK access)

1. **Get Zoom Meeting SDK:**
   - Apply at [marketplace.zoom.us](https://marketplace.zoom.us/develop/create)
   - Choose "Meeting SDK" (not Web SDK)
   - Request "Raw Audio Data" capability

2. **Install SDK:**
   ```bash
   # Download native SDK for your platform
   # Windows: zoom-sdk-windows
   # macOS: zoom-sdk-macos
   # Linux: zoom-sdk-linux
   ```

3. **Create Node.js Addon:**
   ```cpp
   // Example: Wrap Zoom SDK in native addon
   #include <napi.h>
   #include "zoom_sdk.h"

   // Register audio callback
   void OnAudioRawDataReceived(AudioRawData* data) {
       // Forward PCM to Node.js
   }
   ```

4. **Update Implementation:**
   - Edit [`src/zoom/join.ts`](src/zoom/join.ts)
   - Uncomment and implement SDK calls
   - Build native addon
   - Link to transcriber agent

### Why This Is Complex

- Requires native C++ SDK
- Platform-specific builds (Windows/Mac/Linux)
- Audio resampling (Zoom uses various formats)
- Meeting authentication flow
- Handle multiple speakers

**Recommendation:** Use Method 1 (Virtual Audio) unless you specifically need SDK features like:
- Cloud recording integration
- Participant metadata
- Breakout room support
- Advanced meeting controls

---

## Method 3: Headless Browser Automation (Fallback)

For Google Meet (when virtual audio isn't ideal):

### Setup

1. **Install Puppeteer:**
   ```bash
   npm install puppeteer
   ```

2. **Create automation script:**
   ```typescript
   // scripts/join-meet.ts
   import puppeteer from 'puppeteer';

   const meetUrl = 'https://meet.google.com/abc-defg-hij';
   const browser = await puppeteer.launch({ headless: false });
   const page = await browser.newPage();

   await page.goto(meetUrl);
   await page.type('input[placeholder="Your name"]', 'Transcriber Bot');
   await page.click('button:has-text("Ask to join")');

   // Mute microphone
   await page.click('[aria-label="Turn off microphone"]');
   ```

3. **Capture audio via virtual device** (same as Method 1)

4. **Run:**
   ```bash
   tsx scripts/join-meet.ts
   ```

### Limitations

- Can't access audio directly from browser
- Still needs virtual audio device
- May violate Meet's Terms of Service
- Captcha challenges
- Meeting host must approve bot

---

## 🎬 Quick Start: Transcribe a Zoom Call

### 1. Install Virtual Audio

```bash
# macOS
brew install blackhole-2ch
```

### 2. Configure Audio

1. Audio MIDI Setup → Create Multi-Output Device
2. Check: Built-in Output + BlackHole 2ch
3. Use as system output

### 3. Start App

```bash
cd mastra-transcription-agent
npm run dev
```

### 4. Open Live Captions

```bash
open http://localhost:3000/live
```

### 5. Join Zoom Call

1. Zoom → Settings → Audio → Speaker: Multi-Output Device
2. Join your meeting

### 6. Start Transcribing

1. System Settings → Sound → Input → BlackHole 2ch
2. Browser → Allow microphone (BlackHole)
3. Click "Start Capture" in live page
4. Watch real-time captions appear! 🎉

---

## 🔧 Troubleshooting

### No Audio Captured

**Problem:** Live captions show nothing

**Solutions:**
- ✅ Verify virtual device is selected in System Settings → Sound → Input
- ✅ Check Zoom/Meet speaker is set to Multi-Output Device
- ✅ Ensure someone is speaking in the call
- ✅ Test with music first: Play Spotify, see if it transcribes

### Echo/Feedback

**Problem:** Hearing echo during call

**Solutions:**
- ✅ Use headphones (this isolates speaker from mic)
- ✅ Don't select virtual device as Zoom microphone (only speaker)
- ✅ Mute yourself in Zoom if just listening

### Browser Won't Access Virtual Device

**Problem:** Browser can't find BlackHole/CABLE

**Solutions:**
- ✅ macOS: Change System Input to BlackHole first, then refresh browser
- ✅ Windows: Select CABLE Output in browser mic settings dropdown
- ✅ Grant microphone permission when prompted
- ✅ Restart browser

### Quality Issues

**Problem:** Transcription accuracy is poor

**Solutions:**
- ✅ Ensure audio sample rate is 16kHz or higher
- ✅ Reduce background noise in call
- ✅ Check bitrate: BlackHole should be 16-bit, not 8-bit
- ✅ Increase buffer size in [`ws.ts`](src/routes/ws.ts) line 122

### Latency Too High

**Problem:** Captions appear 5+ seconds late

**Solutions:**
- ✅ Reduce batch size in [`ws.ts`](src/routes/ws.ts) (32000 → 16000 bytes)
- ✅ Use faster Whisper model in `.env`: `OPENROUTER_MODEL=openai/whisper-large-v3-turbo`
- ✅ Check network latency to OpenRouter/Groq
- ✅ Reduce audio buffer in browser capture

---

## 📊 Comparison Table

| Method | Zoom | Meet | Teams | Complexity | Cost | Quality |
|--------|------|------|-------|------------|------|---------|
| **Virtual Audio** | ✅ | ✅ | ✅ | Low | Free | High |
| **Zoom SDK** | ✅ | ❌ | ❌ | Very High | $1,999+/yr | Very High |
| **Headless Browser** | ✅ | ✅ | ✅ | Medium | Free | Medium |
| **Discord Bot** | ❌ | ❌ | ❌ | Low | Free | High |

**Recommendation:** Use **Virtual Audio Device** (Method 1) for simplicity and universal support.

---

## 🎯 Production Deployment

For production use:

1. **Deploy server** to cloud (Railway, Render, Fly.io)
2. **Use dedicated machine** with virtual audio for Zoom/Meet capture
3. **Set up webhook** to receive audio from meeting provider
4. **Add authentication** to WebSocket endpoint
5. **Implement rate limiting** on API
6. **Enable HTTPS** for WebSocket security

### Example: AWS EC2 Setup

```bash
# Launch EC2 instance (Ubuntu 22.04)
# Install dependencies
sudo apt update
sudo apt install -y ffmpeg pulseaudio nodejs npm

# Clone repo
git clone https://github.com/shay2301/mastra-transcription-agent.git
cd mastra-transcription-agent
npm install

# Configure virtual audio
pactl load-module module-null-sink sink_name=VirtualSink

# Start server
npm run dev

# Use VNC to join Zoom/Meet on this machine
```

---

## 📚 Additional Resources

- [BlackHole GitHub](https://github.com/ExistentialAudio/BlackHole)
- [VB-CABLE Website](https://vb-audio.com/Cable/)
- [Zoom SDK Documentation](https://developers.zoom.us/docs/meeting-sdk/)
- [PulseAudio Manual](https://www.freedesktop.org/wiki/Software/PulseAudio/)

---

## ❓ FAQ

**Q: Can I transcribe both Zoom and Meet simultaneously?**
A: Yes, but you need two separate virtual audio devices or two browser instances.

**Q: Does this work on mobile?**
A: No, virtual audio devices are desktop-only. Mobile requires native app integration.

**Q: Is this legal?**
A: Check your meeting provider's Terms of Service. Always inform participants that the call is being transcribed.

**Q: Can I record the call too?**
A: Yes, use OBS or similar to record the virtual audio device output.

**Q: What about Microsoft Teams?**
A: Same Method 1 approach works! Set Teams speaker to virtual audio device.

---

**Need help?** Open an issue at [github.com/shay2301/mastra-transcription-agent](https://github.com/shay2301/mastra-transcription-agent/issues)
