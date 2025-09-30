# 🔑 Get Your FREE Groq API Key

**Important:** This app uses **Groq's Whisper API**, not OpenRouter. OpenRouter doesn't support audio transcription.

---

## Why Groq?

- ✅ **FREE tier** with generous limits
- ✅ **Ultra-fast** Whisper inference (<1s for 60s audio)
- ✅ **whisper-large-v3** model included
- ✅ **No credit card required** for free tier

---

## Step-by-Step Setup (2 minutes)

### 1. Create Groq Account

Go to: **https://console.groq.com**

- Click **"Sign Up"** (top right)
- Sign up with Google, GitHub, or email
- Verify your email if needed

### 2. Get Your API Key

1. After login, you'll see the **Groq Console**
2. Click **"API Keys"** in the left sidebar
3. Click **"Create API Key"** button
4. Give it a name (e.g., "Mastra Transcriber")
5. Click **"Submit"**
6. **Copy the API key** (starts with `gsk_...`)
   - ⚠️ Save it now - you can only see it once!

### 3. Update Your .env File

```bash
# Open .env file
nano .env

# Replace the OPENROUTER lines with:
GROQ_API_KEY=gsk_your_key_here
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_MODEL=whisper-large-v3
```

Or use this command:

```bash
# Add Groq configuration
cat >> .env << EOF

# Groq API for Whisper (FREE!)
GROQ_API_KEY=gsk_your_actual_key_here
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_MODEL=whisper-large-v3
EOF
```

### 4. Restart the Server

```bash
# Stop current server (Ctrl+C in the terminal)
# Then restart:
npm run dev
```

### 5. Test It!

- Upload an audio file at http://localhost:3000
- Click "Transcribe"
- Should work instantly! ⚡

---

## Free Tier Limits

Groq's free tier includes:

- **14,400 requests/day** for Whisper
- **30 requests/minute**
- **No credit card required**

This is plenty for personal use and testing!

---

## Alternative: Keep Using OpenRouter

If you want to keep using OpenRouter, you'll need to:

1. Use a **different transcription provider** (like OpenAI's Whisper API directly)
2. Change the base URL to OpenAI:

```bash
# In .env
OPENROUTER_API_KEY=your_openai_key  # Need OpenAI key, not OpenRouter
OPENROUTER_BASE_URL=https://api.openai.com/v1
OPENROUTER_MODEL=whisper-1
```

**But Groq is recommended** - it's faster and free! ⚡

---

## Troubleshooting

### "Invalid API Key"
- Make sure you copied the full key (starts with `gsk_`)
- Check for extra spaces or newlines
- Regenerate a new key if needed

### "Rate limit exceeded"
- Free tier: 30 requests/minute
- Wait a minute and try again
- Or upgrade to paid tier (optional)

### Still getting 405 error?
- Make sure you updated `.env` (not `.env.example`)
- Restart the server after changing `.env`
- Check the base URL is `https://api.groq.com/openai/v1`

---

## Quick Reference

**Groq Console:** https://console.groq.com
**API Docs:** https://console.groq.com/docs/quickstart
**Pricing:** https://groq.com/pricing (free tier available!)

---

**Once you have your Groq key, the app will work perfectly!** 🎉
