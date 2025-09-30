#!/usr/bin/env tsx

/**
 * Register Discord slash commands
 * Run: npm run discord:register
 */

import { REST, Routes } from 'discord.js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });
config();

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;

if (!token || !clientId) {
  console.error('❌ Missing DISCORD_BOT_TOKEN or DISCORD_CLIENT_ID in .env.local');
  process.exit(1);
}

const commands = [
  {
    name: 'join',
    description: 'Join your voice channel and start transcribing',
  },
  {
    name: 'leave',
    description: 'Leave voice channel and send transcript',
  },
  {
    name: 'status',
    description: 'Check bot transcription status',
  },
];

const rest = new REST({ version: '10' }).setToken(token);

async function registerCommands() {
  try {
    console.log('🔄 Registering Discord slash commands...');

    await rest.put(Routes.applicationCommands(clientId), {
      body: commands,
    });

    console.log('✅ Successfully registered slash commands:');
    commands.forEach((cmd) => {
      console.log(`   /${cmd.name} - ${cmd.description}`);
    });
  } catch (error) {
    console.error('❌ Failed to register commands:', error);
    process.exit(1);
  }
}

registerCommands();
