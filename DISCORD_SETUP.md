# 🤖 Discord Bot Setup Guide

Complete step-by-step guide to get your Discord bot token and client ID.

---

## 📋 Quick Summary

You need two things:
1. **Client ID** (Application ID) - Public identifier
2. **Bot Token** - Secret key (keep private!)

---

## Step 1: Create Discord Application

### 1.1 Go to Developer Portal
```
🔗 https://discord.com/developers/applications
```

- Sign in with your Discord account
- If you don't have an account, create one at discord.com first

### 1.2 Create New Application
- Click **"New Application"** (blue button, top right)
- Name your bot (e.g., "Mastra Transcriber")
- Accept Discord's Developer Terms of Service
- Click **"Create"**

---

## Step 2: Get Your Client ID ✅

You'll land on the **General Information** page.

### Find Application ID
```
┌─────────────────────────────────────┐
│ GENERAL INFORMATION                 │
├─────────────────────────────────────┤
│ APPLICATION ID                      │
│ 1234567890123456789        [Copy]   │  ← Click "Copy"
└─────────────────────────────────────┘
```

**Save this as your `DISCORD_CLIENT_ID`**

```bash
DISCORD_CLIENT_ID=1234567890123456789
```

---

## Step 3: Create Bot & Get Token 🔑

### 3.1 Navigate to Bot Section
- Left sidebar → Click **"Bot"**
- Click **"Add Bot"** button
- Confirm: **"Yes, do it!"**

### 3.2 Get Bot Token
```
┌─────────────────────────────────────┐
│ TOKEN                               │
├─────────────────────────────────────┤
│ MTIzNDU...abc123    [Reset Token]   │  ← Click "Reset Token"
│                                     │
│ [Copy]                              │  ← Then click "Copy"
└─────────────────────────────────────┘
```

⚠️ **IMPORTANT:**
- You can only see the token ONCE
- Copy it immediately
- If you lose it, you'll need to reset it again

**Save this as your `DISCORD_BOT_TOKEN`**

```bash
DISCORD_BOT_TOKEN=MTIzNDU2Nzg5MDEyMzQ1Njc4OQ.GhJkLm.abc123def456ghi789...
```

### 3.3 Configure Bot Settings (Same page)

Scroll down and enable these:

```
☑️ PUBLIC BOT                    → Turn OFF (recommended)
☐  REQUIRES OAUTH2 CODE GRANT   → Keep OFF

PRIVILEGED GATEWAY INTENTS:
☑️ PRESENCE INTENT               → Turn ON
☑️ SERVER MEMBERS INTENT         → Turn ON ✅ (REQUIRED!)
☑️ MESSAGE CONTENT INTENT        → Turn ON ✅ (REQUIRED!)
```

Click **"Save Changes"** at the bottom

---

## Step 4: Generate Invite URL 🔗

### 4.1 Go to OAuth2 URL Generator
- Left sidebar → **OAuth2** → **URL Generator**

### 4.2 Select Scopes
```
SCOPES:
☑️ bot
☑️ applications.commands
```

### 4.3 Select Bot Permissions (scroll down)
```
BOT PERMISSIONS:
☑️ Read Messages/View Channels
☑️ Send Messages
☑️ Connect
☑️ Speak
☑️ Use Voice Activity
```

Or use permission integer: **3165184**

### 4.4 Copy Generated URL
Scroll to bottom and copy the URL:

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_ID&permissions=3165184&scope=bot%20applications.commands
```

---

## Step 5: Invite Bot to Your Server 🎉

### 5.1 Open Invite URL
- Paste the URL from Step 4 into your browser
- Select the server you want to add the bot to (you must be admin)
- Click **"Continue"**
- Review permissions
- Click **"Authorize"**
- Complete CAPTCHA if prompted

### 5.2 Verify Bot Joined
- Open your Discord server
- Check the member list (right sidebar)
- You should see your bot with an "BOT" tag
- It will be offline until you start it

---

## Step 6: Configure Your Project ⚙️

### 6.1 Update `.env.local`

```bash
# Open or create .env.local
nano .env.local
```

Add these lines:

```bash
# OpenRouter (Required)
OPENROUTER_API_KEY=sk-or-v1-your-key-here

# Discord Bot
DISCORD_BOT_TOKEN=MTIzNDU2Nzg5MDEyMzQ1Njc4OQ.GhJkLm.abc123...
DISCORD_CLIENT_ID=1234567890123456789
```

### 6.2 Install Dependencies

```bash
npm install
```

---

## Step 7: Register Slash Commands 🎮

Before starting the bot, register the slash commands:

```bash
npm run discord:register
```

Expected output:
```
🔄 Registering Discord slash commands...
✅ Successfully registered slash commands:
   /join - Join your voice channel and start transcribing
   /leave - Leave voice channel and send transcript
   /status - Check bot transcription status
```

---

## Step 8: Start the Bot 🚀

```bash
npm run discord:start
```

Expected output:
```
🤖 Starting Discord Transcription Bot...
[Discord Bot] Logged in as Mastra Transcriber#1234
[Discord Bot] Ready to join voice channels

✅ Bot is running!

Available commands:
  /join   - Join your voice channel and start transcribing
  /leave  - Leave voice channel and get transcript
  /status - Check bot status
```

---

## Step 9: Test the Bot ✨

### 9.1 Join a Voice Channel
In your Discord server:
1. Join any voice channel
2. Type `/join` in any text channel
3. Bot should join your voice channel

### 9.2 Check Status
```
/status
```

Should show:
```
🟢 Active
Channel: General Voice
Session ID: discord_123456789_1234567890
```

### 9.3 Leave & Get Transcript
```
/leave
```

Bot will:
- Leave the voice channel
- Process all captured audio
- Send transcript in the text channel

---

## 🔧 Troubleshooting

### Bot doesn't appear in member list
- Check invite URL was used correctly
- Verify you have "Manage Server" permission
- Try regenerating and using the invite URL again

### Bot joins but doesn't capture audio
- Check **SERVER MEMBERS INTENT** and **MESSAGE CONTENT INTENT** are enabled
- Make sure bot has "Connect" and "Speak" permissions in the voice channel
- Verify someone is speaking in the channel

### Slash commands don't appear
- Run `npm run discord:register` first
- Wait 5-10 minutes for Discord to sync
- Try restarting Discord client
- Check bot has "Use Application Commands" permission

### "Missing Access" error
- Bot needs these channel permissions:
  - View Channel
  - Send Messages (in text channel)
  - Connect (in voice channel)
  - Speak (in voice channel)

### Rate limit errors
- Discord has rate limits for bot commands
- Wait a few minutes between commands
- Don't spam `/join` and `/leave`

---

## 📚 Additional Resources

- [Discord Developer Portal](https://discord.com/developers/docs)
- [Discord.js Guide](https://discordjs.guide/)
- [Bot Best Practices](https://discord.com/developers/docs/topics/community-resources#bot-best-practices)

---

## 🔐 Security Notes

⚠️ **Never share your bot token!**
- Don't commit it to Git
- Don't post it in Discord
- Don't share screenshots containing it
- If leaked, immediately reset it in the Developer Portal

✅ **Keep these files private:**
- `.env.local`
- `.env`
- Any file containing `DISCORD_BOT_TOKEN`

---

## ✅ Checklist

- [ ] Created Discord application
- [ ] Copied Client ID
- [ ] Created bot and copied token
- [ ] Enabled required intents (Server Members, Message Content)
- [ ] Generated invite URL with correct permissions
- [ ] Invited bot to server
- [ ] Added credentials to `.env.local`
- [ ] Ran `npm install`
- [ ] Registered slash commands (`npm run discord:register`)
- [ ] Started bot (`npm run discord:start`)
- [ ] Tested `/join` command

---

**Need help?** Check the [main README](README.md) or open an issue.
