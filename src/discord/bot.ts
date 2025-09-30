import {
  Client,
  GatewayIntentBits,
  VoiceChannel,
  StageChannel,
  ChatInputCommandInteraction,
} from 'discord.js';
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  entersState,
  VoiceConnectionStatus,
  EndBehaviorType,
  AudioPlayerStatus,
} from '@discordjs/voice';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import prism from 'prism-media';
import { TranscriberAgent } from '../agent/TranscriberAgent.js';

export interface DiscordBotConfig {
  token: string;
  clientId: string;
  agent: TranscriberAgent;
}

export class DiscordTranscriptionBot {
  private client: Client;
  private agent: TranscriberAgent;
  private activeConnections: Map<string, any>;

  constructor(config: DiscordBotConfig) {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    this.agent = config.agent;
    this.activeConnections = new Map();

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.client.once('ready', () => {
      console.log(`[Discord Bot] Logged in as ${this.client.user?.tag}`);
      console.log('[Discord Bot] Ready to join voice channels');
    });

    this.client.on('interactionCreate', async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      try {
        await this.handleCommand(interaction);
      } catch (error) {
        console.error('[Discord Bot] Command error:', error);
        await interaction.reply({
          content: 'An error occurred while processing your command.',
          ephemeral: true,
        });
      }
    });
  }

  private async handleCommand(interaction: ChatInputCommandInteraction) {
    const { commandName } = interaction;

    switch (commandName) {
      case 'join':
        await this.handleJoin(interaction);
        break;
      case 'leave':
        await this.handleLeave(interaction);
        break;
      case 'status':
        await this.handleStatus(interaction);
        break;
      default:
        await interaction.reply({
          content: 'Unknown command',
          ephemeral: true,
        });
    }
  }

  /**
   * Join a voice channel and start capturing audio
   */
  private async handleJoin(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const member = interaction.member as any;
    const voiceChannel = member?.voice?.channel as VoiceChannel | StageChannel;

    if (!voiceChannel) {
      await interaction.editReply('You need to be in a voice channel first!');
      return;
    }

    const guildId = interaction.guildId!;

    if (this.activeConnections.has(guildId)) {
      await interaction.editReply('Already connected to a voice channel in this server!');
      return;
    }

    try {
      console.log(`[Discord Bot] Joining voice channel: ${voiceChannel.name} in ${interaction.guild?.name}`);

      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator as any,
        selfDeaf: false,
        selfMute: true,
      });

      // Wait for connection to be ready
      await entersState(connection, VoiceConnectionStatus.Ready, 30_000);

      console.log('[Discord Bot] Voice connection ready, starting audio capture');

      // Start live transcription session
      const sessionId = `discord_${guildId}_${Date.now()}`;
      const session = this.agent.startLiveSession(sessionId, 'auto');

      // Setup audio receiver
      const receiver = connection.receiver;

      // Listen to all users speaking
      receiver.speaking.on('start', (userId) => {
        console.log(`[Discord Bot] User ${userId} started speaking`);

        // Create audio stream for this user
        const audioStream = receiver.subscribe(userId, {
          end: {
            behavior: EndBehaviorType.AfterSilence,
            duration: 100,
          },
        });

        // Decode opus to PCM
        const decoder = new prism.opus.Decoder({
          rate: 48000,
          channels: 2,
          frameSize: 960,
        });

        // Pipe audio through decoder
        audioStream.pipe(decoder);

        // Collect PCM data
        const chunks: Buffer[] = [];

        decoder.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        decoder.on('end', async () => {
          if (chunks.length > 0) {
            const pcmData = Buffer.concat(chunks);
            console.log(`[Discord Bot] Captured ${pcmData.length} bytes from user ${userId}`);

            // Ingest into agent for transcription
            // Note: This is a simplified version. In production, you'd want to:
            // 1. Convert 48kHz stereo to 16kHz mono
            // 2. Batch frames properly
            // 3. Handle errors gracefully

            try {
              await this.agent.ingestAudioFrame(sessionId, pcmData);
            } catch (error) {
              console.error('[Discord Bot] Failed to ingest audio frame:', error);
            }
          }
        });
      });

      this.activeConnections.set(guildId, {
        connection,
        sessionId,
        channelId: voiceChannel.id,
      });

      await interaction.editReply(
        `✅ Joined ${voiceChannel.name} and started capturing audio!\nSession ID: \`${sessionId}\``
      );
    } catch (error: any) {
      console.error('[Discord Bot] Failed to join voice channel:', error);
      await interaction.editReply(`❌ Failed to join voice channel: ${error.message}`);
    }
  }

  /**
   * Leave the voice channel and stop capturing
   */
  private async handleLeave(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const guildId = interaction.guildId!;
    const connectionData = this.activeConnections.get(guildId);

    if (!connectionData) {
      await interaction.editReply('Not connected to any voice channel!');
      return;
    }

    try {
      // Finalize transcription session
      const result = await this.agent.finalizeSession(connectionData.sessionId);

      // Destroy voice connection
      connectionData.connection.destroy();
      this.activeConnections.delete(guildId);

      // Send transcript summary
      const transcriptPreview = result.text.substring(0, 1000);
      await interaction.editReply(
        `✅ Left voice channel and finalized transcription.\n\n**Transcript Preview:**\n\`\`\`\n${transcriptPreview}${
          result.text.length > 1000 ? '...' : ''
        }\n\`\`\`\n\nFull transcript saved to session: \`${connectionData.sessionId}\``
      );
    } catch (error: any) {
      console.error('[Discord Bot] Failed to leave voice channel:', error);
      await interaction.editReply(`❌ Error leaving voice channel: ${error.message}`);
    }
  }

  /**
   * Get bot status
   */
  private async handleStatus(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId!;
    const connectionData = this.activeConnections.get(guildId);

    if (!connectionData) {
      await interaction.reply({
        content: '⚪ Not connected to any voice channel',
        ephemeral: true,
      });
      return;
    }

    const channel = this.client.channels.cache.get(connectionData.channelId);
    const channelName = channel ? (channel as VoiceChannel).name : 'Unknown';

    await interaction.reply({
      content: `🟢 **Active**\n**Channel:** ${channelName}\n**Session ID:** \`${connectionData.sessionId}\``,
      ephemeral: true,
    });
  }

  /**
   * Start the bot
   */
  async start(token: string): Promise<void> {
    await this.client.login(token);
  }

  /**
   * Stop the bot
   */
  async stop(): Promise<void> {
    // Cleanup all active connections
    for (const [guildId, connectionData] of this.activeConnections) {
      try {
        await this.agent.finalizeSession(connectionData.sessionId);
        connectionData.connection.destroy();
      } catch (error) {
        console.error(`[Discord Bot] Failed to cleanup connection for guild ${guildId}:`, error);
      }
    }

    this.activeConnections.clear();
    await this.client.destroy();
    console.log('[Discord Bot] Stopped');
  }
}

/**
 * Standalone Discord bot entry point
 */
export async function startDiscordBot(
  token: string,
  clientId: string,
  agent: TranscriberAgent
): Promise<DiscordTranscriptionBot> {
  const bot = new DiscordTranscriptionBot({
    token,
    clientId,
    agent,
  });

  await bot.start(token);

  return bot;
}
