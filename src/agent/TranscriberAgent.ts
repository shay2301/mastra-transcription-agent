import { Agent } from '@mastra/core';
import fs from 'fs';
import path from 'path';
import { OpenRouterClient, TranscribeOptions } from '../services/openrouter.js';
import { AudioProcessor } from '../services/audio.js';
import { TranscriptMerger, MergedSegment } from '../services/merge.js';

export interface TranscribeFileResult {
  text: string;
  vtt: string;
  segments: MergedSegment[];
  meta: {
    duration: number;
    language: string;
    chunked: boolean;
    chunkCount?: number;
    transcoded: boolean;
    latencyMs: number;
  };
}

export interface LiveSessionData {
  sessionId: string;
  language: string;
  wsUrl: string;
  token: string;
  audioBuffer: Buffer[];
  partialResults: string[];
  finalSegments: MergedSegment[];
  startTime: number;
}

export class TranscriberAgent extends Agent {
  private openRouter: OpenRouterClient;
  private audioProcessor: AudioProcessor;
  private merger: TranscriptMerger;
  private liveSessions: Map<string, LiveSessionData>;
  private dataDir: string;

  constructor(
    apiKey: string,
    baseUrl?: string,
    model?: string,
    maxSizeMB = 19.5
  ) {
    super({
      name: 'transcriber',
      instructions: 'Transcribe audio files and live streams using Whisper via OpenRouter',
    });

    this.openRouter = new OpenRouterClient(apiKey, baseUrl, model);
    this.audioProcessor = new AudioProcessor(maxSizeMB);
    this.merger = new TranscriptMerger();
    this.liveSessions = new Map();
    this.dataDir = process.env.DATA_DIR || './data';

    // Ensure data directory exists
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    this.registerSkills();
  }

  private registerSkills() {
    // Skill: transcribeFile
    this.addSkill({
      name: 'transcribeFile',
      description: 'Transcribe an audio file with automatic size handling',
      parameters: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'Path to audio file' },
          language: { type: 'string', description: 'Language code (he, en, auto)' },
          timestamps: { type: 'string', enum: ['segments', 'word', 'none'], description: 'Timestamp granularity' },
        },
        required: ['filePath'],
      },
      execute: async ({ filePath, language = 'auto', timestamps = 'segments' }) => {
        return this.transcribeFile(filePath, { language, timestamps });
      },
    });

    // Skill: startLiveSession
    this.addSkill({
      name: 'startLiveSession',
      description: 'Start a live transcription session',
      parameters: {
        type: 'object',
        properties: {
          sessionId: { type: 'string', description: 'Unique session identifier' },
          language: { type: 'string', description: 'Language code' },
        },
        required: ['sessionId'],
      },
      execute: async ({ sessionId, language = 'auto' }) => {
        return this.startLiveSession(sessionId, language);
      },
    });

    // Skill: ingestAudioFrame
    this.addSkill({
      name: 'ingestAudioFrame',
      description: 'Ingest an audio frame into a live session',
      parameters: {
        type: 'object',
        properties: {
          sessionId: { type: 'string', description: 'Session identifier' },
          frame: { type: 'string', description: 'Base64 encoded audio frame' },
        },
        required: ['sessionId', 'frame'],
      },
      execute: async ({ sessionId, frame }) => {
        const buffer = Buffer.from(frame, 'base64');
        return this.ingestAudioFrame(sessionId, buffer);
      },
    });

    // Skill: finalizeSession
    this.addSkill({
      name: 'finalizeSession',
      description: 'Finalize a live transcription session',
      parameters: {
        type: 'object',
        properties: {
          sessionId: { type: 'string', description: 'Session identifier' },
        },
        required: ['sessionId'],
      },
      execute: async ({ sessionId }) => {
        return this.finalizeSession(sessionId);
      },
    });
  }

  /**
   * Transcribe an audio file with automatic handling of size limits
   */
  async transcribeFile(
    filePath: string,
    opts: { language?: string; timestamps?: string } = {}
  ): Promise<TranscribeFileResult> {
    const startTime = Date.now();
    console.log(`[Agent] Starting transcription: ${filePath}`);

    // Get audio info
    const info = await this.audioProcessor.getAudioInfo(filePath);
    console.log(`[Agent] Audio info:`, info);

    const needsProcessing = this.audioProcessor.exceedsLimit(info.size);
    let transcoded = false;
    let chunked = false;
    let processedPath = filePath;
    let chunks: string[] = [];

    try {
      if (needsProcessing) {
        console.log(`[Agent] File exceeds ${this.audioProcessor['maxSizeMB']} MB limit`);

        // Try transcoding first
        const transcodePath = `/tmp/transcoded_${Date.now()}.ogg`;
        await this.audioProcessor.transcode(filePath, transcodePath);
        const transcodedInfo = await this.audioProcessor.getAudioInfo(transcodePath);

        if (!this.audioProcessor.exceedsLimit(transcodedInfo.size)) {
          console.log(`[Agent] Transcoding successful, size reduced to ${(transcodedInfo.size / 1024 / 1024).toFixed(2)} MB`);
          processedPath = transcodePath;
          transcoded = true;
        } else {
          // Transcode didn't help enough, need to chunk
          console.log(`[Agent] Transcoding insufficient, chunking audio`);
          await this.audioProcessor.cleanup([transcodePath]);

          const chunkDir = `/tmp/chunks_${Date.now()}`;
          chunks = await this.audioProcessor.chunk(filePath, {
            chunkDuration: 90,
            overlap: 0.5,
            outputDir: chunkDir,
          });
          chunked = true;
        }
      }

      // Transcribe
      let result: TranscribeFileResult;

      if (chunked) {
        // Transcribe each chunk
        const chunkResults = [];
        for (let i = 0; i < chunks.length; i++) {
          console.log(`[Agent] Transcribing chunk ${i + 1}/${chunks.length}`);
          const chunkResult = await this.openRouter.transcribeFile(chunks[i], {
            language: opts.language === 'auto' ? undefined : opts.language,
            responseFormat: 'verbose_json',
            timestampGranularities: ['segment'],
          });
          chunkResults.push(chunkResult);
        }

        // Merge chunks
        const segments = this.merger.mergeChunks(chunkResults, 90, 0.5);
        const text = this.merger.toText(segments);
        const vtt = this.merger.toVTT(segments);

        result = {
          text,
          vtt,
          segments,
          meta: {
            duration: info.duration,
            language: chunkResults[0]?.language || 'unknown',
            chunked: true,
            chunkCount: chunks.length,
            transcoded: false,
            latencyMs: Date.now() - startTime,
          },
        };

        // Cleanup chunks
        await this.audioProcessor.cleanup(chunks);
      } else {
        // Single file transcription
        const response = await this.openRouter.transcribeFile(processedPath, {
          language: opts.language === 'auto' ? undefined : opts.language,
          responseFormat: 'verbose_json',
          timestampGranularities: opts.timestamps === 'word' ? ['word', 'segment'] : ['segment'],
        });

        const segments = this.merger['extractSegments'](response);
        const vtt = this.merger.toVTT(segments);

        result = {
          text: response.text,
          vtt,
          segments,
          meta: {
            duration: response.duration,
            language: response.language,
            chunked: false,
            transcoded,
            latencyMs: Date.now() - startTime,
          },
        };

        // Cleanup transcoded file
        if (transcoded) {
          await this.audioProcessor.cleanup([processedPath]);
        }
      }

      console.log(`[Agent] Transcription complete in ${result.meta.latencyMs}ms`);
      return result;
    } catch (error) {
      // Cleanup on error
      if (transcoded && processedPath !== filePath) {
        await this.audioProcessor.cleanup([processedPath]);
      }
      if (chunks.length > 0) {
        await this.audioProcessor.cleanup(chunks);
      }
      throw error;
    }
  }

  /**
   * Start a live transcription session
   */
  startLiveSession(sessionId: string, language = 'auto'): {
    wsUrl: string;
    token: string;
    sessionId: string;
  } {
    console.log(`[Agent] Starting live session: ${sessionId}`);

    const token = this.generateToken(sessionId);

    this.liveSessions.set(sessionId, {
      sessionId,
      language,
      wsUrl: `/ws?session=${sessionId}&token=${token}`,
      token,
      audioBuffer: [],
      partialResults: [],
      finalSegments: [],
      startTime: Date.now(),
    });

    // Create session log file
    const sessionDir = path.join(this.dataDir, 'sessions');
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    return {
      wsUrl: `/ws?session=${sessionId}&token=${token}`,
      token,
      sessionId,
    };
  }

  /**
   * Ingest audio frame into live session
   */
  async ingestAudioFrame(sessionId: string, frame: Buffer): Promise<void> {
    const session = this.liveSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.audioBuffer.push(frame);
  }

  /**
   * Get live session
   */
  getLiveSession(sessionId: string): LiveSessionData | undefined {
    return this.liveSessions.get(sessionId);
  }

  /**
   * Finalize live session
   */
  async finalizeSession(sessionId: string): Promise<TranscribeFileResult> {
    const session = this.liveSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    console.log(`[Agent] Finalizing session: ${sessionId}`);

    const text = this.merger.toText(session.finalSegments);
    const vtt = this.merger.toVTT(session.finalSegments);

    const result: TranscribeFileResult = {
      text,
      vtt,
      segments: session.finalSegments,
      meta: {
        duration: (Date.now() - session.startTime) / 1000,
        language: session.language,
        chunked: false,
        transcoded: false,
        latencyMs: Date.now() - session.startTime,
      },
    };

    // Write session log
    const sessionFile = path.join(this.dataDir, 'sessions', `${sessionId}.jsonl`);
    const logEntry = JSON.stringify({
      type: 'final',
      sessionId,
      result,
      timestamp: new Date().toISOString(),
    });
    fs.appendFileSync(sessionFile, logEntry + '\n');

    this.liveSessions.delete(sessionId);
    console.log(`[Agent] Session finalized: ${sessionId}`);

    return result;
  }

  /**
   * Generate simple token for session auth
   */
  private generateToken(sessionId: string): string {
    return Buffer.from(`${sessionId}:${Date.now()}`).toString('base64');
  }
}
