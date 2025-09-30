# 🎙️ Mastra Live Transcriber

Real-time and file-based audio transcription using Whisper (via Groq/OpenRouter) with Mastra agent orchestration.

## Features

- **File Transcription**: Upload audio files (MP3, M4A, WAV, OGG, WEBM) with automatic size handling
  - Auto-transcode or chunk files >19.5 MB
  - Returns plain text, VTT subtitles, and timestamped segments
  - Supports Hebrew, English, and auto-detection

- **Live Transcription**: Real-time captions from microphone or system audio
  - WebSocket streaming with <2.5s latency
  - Partial and final transcript segments
  - Session logging to JSONL

- **Call Bot Integrations** (Phase 2):
  - Discord voice bot (captures PCM from voice channels)
  - Zoom Meeting SDK scaffold (requires Raw Data license)
  - Google Meet (headless Chrome + virtual audio device)

## Architecture

```
┌─────────────────┐
│   Web UI        │  (Upload / Live Captions)
└────────┬────────┘
         │
    ┌────▼────┐
    │ Express │  /api/transcribe (POST)
    │ Server  │  /ws (WebSocket)
    └────┬────┘
         │
┌────────▼────────────┐
│ TranscriberAgent    │  (Mastra Agent)
│ ├─ transcribeFile   │
│ ├─ startLiveSession │
│ ├─ ingestAudioFrame │
│ └─ finalizeSession  │
└────────┬────────────┘
         │
    ┌────▼────────────┐
    │ Services        │
    │ ├─ OpenRouter   │  → Groq Whisper API
    │ ├─ Audio (ffmpeg)│  → Transcode/Chunk
    │ └─ Merge        │  → Stitch segments
    └─────────────────┘
```

## Prerequisites

### Required

1. **Node.js 20+**
   ```bash
   node --version  # v20.0.0 or higher
   ```

2. **ffmpeg** (for audio processing)
   ```bash
   # macOS
   brew install ffmpeg

   # Ubuntu/Debian
   sudo apt install ffmpeg

   # Windows (via Chocolatey)
   choco install ffmpeg

   # Verify
   ffmpeg -version
   ```

3. **OpenRouter API Key** (with Groq Whisper access)
   - Sign up at [openrouter.ai](https://openrouter.ai)
   - Get API key from dashboard
   - Ensure you have credits for `openai/whisper-large-v3` routed to Groq

### Optional (for bot integrations)

4. **Discord Bot Token** (for Discord integration)
   - Create app at [discord.com/developers/applications](https://discord.com/developers/applications)
   - Enable bot + Voice intents
   - Get token from Bot tab

5. **Virtual Audio Device** (for system audio capture)
   - **macOS**: [BlackHole](https://existential.audio/blackhole/)
   - **Windows**: [VB-CABLE](https://vb-audio.com/Cable/)
   - **Linux**: PulseAudio loopback module

## Installation

```bash
# Clone or navigate to project
cd mastra-transcription-agent

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your keys
nano .env.local
```

### Configure `.env.local`

```bash
# Required
OPENROUTER_API_KEY=sk-or-v1-...

# Optional (defaults shown)
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=openai/whisper-large-v3
PORT=3000
MAX_FILE_SIZE_MB=19.5

# Discord Bot (optional)
DISCORD_BOT_TOKEN=
DISCORD_CLIENT_ID=
```

## Usage

### 1. Start the Server

```bash
npm run dev
```

Server starts at `http://localhost:3000`

### 2. Upload Page (`/`)

1. Navigate to `http://localhost:3000`
2. Click or drag-drop an audio file
3. Select language (auto-detect, English, Hebrew, etc.)
4. Choose timestamp granularity (segments, word-level, none)
5. Click **Transcribe**
6. Download results as:
   - Plain text (`.txt`)
   - WebVTT subtitles (`.vtt`)

**Size Handling:**
- Files <19.5 MB: Direct upload
- Files >19.5 MB: Auto-transcode to mono 16kHz Opus (~48kbps)
- Still too large: Auto-chunk into 90s segments with 0.5s overlap, then stitch

### 3. Live Captions (`/live`)

1. Navigate to `http://localhost:3000/live`
2. Allow microphone access when prompted
3. Click **Start Capture**
4. Speak into microphone
5. See real-time captions (partial → final)
6. Click **Stop** when done
7. Copy transcript or download VTT

**Latency:** Typically <2.5s from speech to displayed caption.

**RTL Support:** Hebrew text auto-detects and renders right-to-left.

### 4. System Audio Capture

To capture system audio (e.g., Zoom call, Spotify):

#### macOS

1. Install [BlackHole](https://existential.audio/blackhole/)
   ```bash
   brew install blackhole-2ch
   ```

2. Create Multi-Output Device:
   - Open **Audio MIDI Setup** (Applications → Utilities)
   - Click **+** → **Create Multi-Output Device**
   - Check: Built-in Output + BlackHole 2ch
   - Rename to "Zoom Output"

3. Set Zoom/Meet to use "Zoom Output" as speaker

4. In browser:
   - Open `/live`
   - Select BlackHole 2ch as input device (via OS audio settings)
   - Start capture

#### Windows

1. Install [VB-CABLE](https://vb-audio.com/Cable/)
2. Set VB-CABLE as default playback device
3. Route Zoom/Meet audio to VB-CABLE
4. In browser, select "CABLE Output" as microphone
5. Start capture at `/live`

#### Linux

```bash
# Create loopback module
pactl load-module module-loopback latency_msec=1

# Route app audio to loopback
pavucontrol  # GUI to route sources
```

## API Reference

### POST `/api/transcribe`

Transcribe an uploaded audio file.

**Request:**
```bash
curl -X POST http://localhost:3000/api/transcribe \
  -F "audio=@sample.mp3" \
  -F "language=en" \
  -F "timestamps=segments"
```

**Response:**
```json
{
  "success": true,
  "text": "Full transcript here...",
  "vtt": "WEBVTT\n\n1\n00:00:00.000 --> 00:00:03.500\nFirst segment...",
  "segments": [
    {
      "start": 0.0,
      "end": 3.5,
      "text": "First segment"
    }
  ],
  "meta": {
    "duration": 120.5,
    "language": "en",
    "chunked": false,
    "transcoded": true,
    "latencyMs": 4532,
    "filename": "sample.mp3",
    "originalSize": 2048000
  }
}
```

### WebSocket `/ws`

Live transcription stream.

**Client → Server:**
```json
// Start session
{ "type": "start", "sessionId": "session_123", "language": "auto" }

// Send audio chunk (base64 PCM16)
{ "type": "audio", "chunk": "AQIDBAUG..." }

// Stop session
{ "type": "stop" }
```

**Server → Client:**
```json
// Partial result (interim)
{ "type": "partial", "text": "hello wor", "tsStart": 1.2, "tsEnd": 1.8 }

// Final result (stable)
{ "type": "final", "text": "hello world", "tsStart": 1.2, "tsEnd": 2.0 }

// Session stopped
{ "type": "stopped", "sessionId": "session_123", "finalTranscript": "...", "vtt": "..." }

// Error
{ "type": "error", "error": "Transcription failed" }
```

## Discord Bot

### Setup

1. Create Discord application at [discord.com/developers](https://discord.com/developers/applications)

2. Enable Intents:
   - Server Members Intent
   - Message Content Intent

3. Add to `.env.local`:
   ```bash
   DISCORD_BOT_TOKEN=your_bot_token
   DISCORD_CLIENT_ID=your_client_id
   ```

4. Register slash commands:
   ```bash
   npm run discord:register
   ```

5. Start bot:
   ```bash
   npm run discord:start
   ```

### Commands

- `/join` - Join your current voice channel and start transcribing
- `/leave` - Leave voice channel and send transcript
- `/status` - Check bot status

### Limitations

- **Opus decoding:** Discord sends Opus-encoded audio at 48kHz stereo
- **Per-user streams:** Bot receives separate stream per user
- **Latency:** ~3-5s due to batching and API calls
- **Cost:** Each 1s of audio ≈ 1 Whisper API call (expensive for long meetings)

### Production Considerations

- Implement audio resampling (48kHz → 16kHz)
- Batch multiple users' audio
- Use speaker diarization (e.g., pyannote.audio)
- Cache frequent speakers' voice profiles

## Zoom Integration

### Option 1: Meeting SDK (Recommended)

**Requirements:**
- Zoom Meeting SDK license (not Web SDK)
- Raw audio data access (enterprise feature)
- Native C++ SDK or Electron wrapper

**Status:** Scaffold only. See [`src/zoom/join.ts`](src/zoom/join.ts) for implementation notes.

**Steps:**
1. Obtain Zoom Meeting SDK from [marketplace.zoom.us](https://marketplace.zoom.us)
2. Generate SDK credentials (Key + Secret)
3. Implement native Node.js addon or use Electron
4. Register raw audio callback
5. Pipe PCM frames to `TranscriberAgent`

### Option 2: Headless Web Client (Workaround)

**Requirements:**
- Virtual audio device (BlackHole/VB-CABLE)
- Puppeteer or Playwright
- Separate audio capture script

**Steps:**
1. Route system audio to virtual device
2. Launch headless Chrome via Puppeteer
3. Join Zoom meeting via web client
4. Capture virtual device audio via separate process
5. Stream to `/ws` endpoint

**Limitations:**
- No direct audio access from web client
- Requires system-level audio routing
- Higher latency (~5-10s)

**Example:**
```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Capture system audio to WebSocket
node scripts/capture-system-audio.js
```

## Google Meet

Similar to Zoom Option 2:

1. Use Puppeteer to join Meet via web
2. Auto-mute microphone
3. Route Meet audio to virtual device
4. Capture and stream to `/ws`

**Status:** Not implemented. Use Zoom workaround as template.

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch
```

### Test Files

- `tests/transcribe.e2e.ts` - File transcription E2E
- `tests/vtt.test.ts` - VTT formatting
- `tests/merge.test.ts` - Segment stitching

### Manual Testing

```bash
# Demo with sample audio
npm run demo

# Opens browser to /live and plays sample.mp3 through virtual device
```

## Observability

### Logs

All logs output to stdout with structured format:

```
[HTTP] POST /api/transcribe 200 4532ms
[Agent] Starting transcription: /tmp/upload.mp3
[Audio] Transcode started: ffmpeg -i /tmp/upload.mp3...
[OpenRouter] Transcription completed in 3200ms, 1048576 bytes
[WS] Client connected
[WS] Starting session: session_123
```

### Session Logs

Live sessions write JSONL to `./data/sessions/<sessionId>.jsonl`:

```json
{"type":"partial","text":"hello","tsStart":1.2,"tsEnd":1.5,"timestamp":"2025-01-15T10:30:00Z"}
{"type":"final","text":"hello world","tsStart":1.2,"tsEnd":2.0,"timestamp":"2025-01-15T10:30:01Z"}
```

### Metrics (TODO)

Future: Export Prometheus metrics:
- `transcribe_requests_total`
- `transcribe_latency_seconds`
- `transcribe_audio_duration_seconds`
- `ws_connections_active`

## Troubleshooting

### `OPENROUTER_API_KEY` not set

**Error:** `ERROR: OPENROUTER_API_KEY is required`

**Fix:** Create `.env.local` with valid API key.

### ffmpeg not found

**Error:** `Error: ffmpeg exited with code 1`

**Fix:** Install ffmpeg (see Prerequisites).

### File upload fails (413)

**Error:** `413 Payload Too Large`

**Fix:** Increase `MAX_FILE_SIZE_MB` in `.env.local` or let auto-transcode handle it.

### WebSocket disconnects immediately

**Cause:** CORS or missing sessionId.

**Fix:**
- Check `ALLOWED_ORIGINS` in `.env.local`
- Ensure `/ws` connection includes `?session=<id>`

### Discord bot doesn't capture audio

**Cause:** Missing intents or Opus decoding issue.

**Fix:**
1. Enable "Message Content Intent" in Discord dev portal
2. Install `prism-media`: `npm install prism-media`
3. Check bot has "Connect" and "Speak" permissions in channel

### Microphone not working in browser

**Cause:** Permissions blocked or HTTPS required.

**Fix:**
1. Allow microphone in browser settings
2. Use `http://localhost` (exempt from HTTPS requirement)
3. For production, deploy with HTTPS

### High latency in live mode

**Causes:**
- Large audio batches
- Slow network to OpenRouter
- Insufficient server resources

**Fixes:**
- Reduce batch size in [`ws.ts`](src/routes/ws.ts) (currently 32KB)
- Use faster Whisper model (e.g., `whisper-large-v3-turbo` when available)
- Deploy closer to Groq region (US West)

## Cost Estimation

Whisper via Groq on OpenRouter:

- **Pricing:** ~$0.0001/second of audio
- **60-minute meeting:** ~$0.36
- **Live streaming (1hr):** ~$0.50 (due to batching overhead)

**Tips to reduce cost:**
1. Increase batch window (1s → 2s)
2. Use silence detection to skip empty frames
3. Cache repeated phrases (rare speech)

## Roadmap

- [x] File transcription with auto-size handling
- [x] Live WebSocket streaming
- [x] Discord bot scaffold
- [x] Zoom integration scaffold
- [ ] Speaker diarization (pyannote microservice)
- [ ] Keyword spotting & highlights
- [ ] S3/GCS upload with signed URLs
- [ ] Electron "caption overlay" window
- [ ] Prometheus metrics export
- [ ] Kubernetes deployment manifests

## License

MIT

## Contributing

PRs welcome! Please open an issue first to discuss major changes.

---

**Questions?** Open an issue at [github.com/your-repo/mastra-transcription-agent](https://github.com/your-repo/mastra-transcription-agent)
