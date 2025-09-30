#!/usr/bin/env tsx

/**
 * Start Discord transcription bot
 * Run: npm run discord:start
 */

import { config } from 'dotenv';
import { TranscriberAgent } from '../src/agent/TranscriberAgent.js';
import { startDiscordBot } from '../src/discord/bot.js';

// Load environment variables
config({ path: '.env.local' });
config();

const botToken = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const apiKey = process.env.OPENROUTER_API_KEY;

if (!botToken || !clientId) {
  console.error('❌ Missing Discord credentials in .env.local');
  console.log('\nRequired:');
  console.log('  DISCORD_BOT_TOKEN=your_token');
  console.log('  DISCORD_CLIENT_ID=your_client_id');
  console.log('\nSee README.md for setup instructions.');
  process.exit(1);
}

if (!apiKey) {
  console.error('❌ Missing OPENROUTER_API_KEY in .env.local');
  process.exit(1);
}

async function start() {
  console.log('🤖 Starting Discord Transcription Bot...\n');

  // Initialize agent
  const agent = new TranscriberAgent(
    apiKey,
    process.env.OPENROUTER_BASE_URL,
    process.env.OPENROUTER_MODEL
  );

  // Start bot
  const bot = await startDiscordBot(botToken, clientId, agent);

  console.log('\n✅ Bot is running!');
  console.log('\nAvailable commands:');
  console.log('  /join   - Join your voice channel and start transcribing');
  console.log('  /leave  - Leave voice channel and get transcript');
  console.log('  /status - Check bot status');
  console.log('\n💡 Tip: Make sure slash commands are registered first:');
  console.log('   npm run discord:register\n');

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n⏹️  Stopping bot...');
    await bot.stop();
    process.exit(0);
  });
}

start().catch((error) => {
  console.error('❌ Failed to start bot:', error);
  process.exit(1);
});
