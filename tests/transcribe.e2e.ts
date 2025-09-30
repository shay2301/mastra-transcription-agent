import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TranscriberAgent } from '../src/agent/TranscriberAgent';
import { AudioProcessor } from '../src/services/audio';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Skip tests if no API key is set
const SKIP_TESTS = !process.env.OPENROUTER_API_KEY;

describe('File Transcription E2E', () => {
  let agent: TranscriberAgent;
  let audioProcessor: AudioProcessor;
  let testAudioPath: string;

  beforeAll(async () => {
    if (SKIP_TESTS) {
      console.warn('Skipping E2E tests - OPENROUTER_API_KEY not set');
      return;
    }

    agent = new TranscriberAgent(
      process.env.OPENROUTER_API_KEY!,
      process.env.OPENROUTER_BASE_URL,
      process.env.OPENROUTER_MODEL
    );

    audioProcessor = new AudioProcessor();

    // Generate test audio file (30 seconds of silence with beep)
    testAudioPath = '/tmp/test-audio-30s.mp3';
    generateTestAudio(testAudioPath, 30);
  });

  afterAll(() => {
    // Cleanup test files
    if (fs.existsSync(testAudioPath)) {
      fs.unlinkSync(testAudioPath);
    }
  });

  it('should transcribe a small audio file (<19.5 MB)', async () => {
    if (SKIP_TESTS) return;

    const result = await agent.transcribeFile(testAudioPath, {
      language: 'en',
      timestamps: 'segments',
    });

    expect(result).toBeDefined();
    expect(result.text).toBeDefined();
    expect(result.vtt).toBeDefined();
    expect(result.segments).toBeInstanceOf(Array);
    expect(result.meta.chunked).toBe(false);
    expect(result.meta.latencyMs).toBeGreaterThan(0);
  }, 60000); // 60s timeout

  it('should detect when file exceeds size limit', async () => {
    if (SKIP_TESTS) return;

    const largeFilePath = '/tmp/test-audio-large.mp3';
    generateTestAudio(largeFilePath, 600); // 10 minutes

    const info = await audioProcessor.getAudioInfo(largeFilePath);
    const exceedsLimit = audioProcessor.exceedsLimit(info.size);

    expect(exceedsLimit).toBe(true);

    // Cleanup
    fs.unlinkSync(largeFilePath);
  });

  it('should transcode audio to reduce size', async () => {
    if (SKIP_TESTS) return;

    const inputPath = '/tmp/test-input.wav';
    const outputPath = '/tmp/test-output.ogg';

    // Create uncompressed WAV (large)
    execSync(
      `ffmpeg -f lavfi -i "sine=frequency=440:duration=10" -ar 48000 -ac 2 ${inputPath} -y`
    );

    const inputInfo = await audioProcessor.getAudioInfo(inputPath);
    expect(inputInfo.size).toBeGreaterThan(500000); // > 500KB

    // Transcode
    await audioProcessor.transcode(inputPath, outputPath, {
      targetBitrate: 48,
      targetSampleRate: 16000,
      targetChannels: 1,
      codec: 'libopus',
    });

    const outputInfo = await audioProcessor.getAudioInfo(outputPath);
    expect(outputInfo.size).toBeLessThan(inputInfo.size);
    expect(outputInfo.sampleRate).toBe(16000);
    expect(outputInfo.channels).toBe(1);

    // Cleanup
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);
  });

  it('should chunk large audio files', async () => {
    if (SKIP_TESTS) return;

    const largeAudioPath = '/tmp/test-audio-3min.mp3';
    const chunkDir = '/tmp/test-chunks';

    // Generate 3-minute audio
    generateTestAudio(largeAudioPath, 180);

    // Chunk it
    const chunks = await audioProcessor.chunk(largeAudioPath, {
      chunkDuration: 60, // 1 minute chunks
      overlap: 0.5,
      outputDir: chunkDir,
    });

    expect(chunks.length).toBeGreaterThanOrEqual(3);

    // Verify chunks exist
    for (const chunk of chunks) {
      expect(fs.existsSync(chunk)).toBe(true);
    }

    // Cleanup
    await audioProcessor.cleanup(chunks);
    fs.unlinkSync(largeAudioPath);
    fs.rmdirSync(chunkDir);
  });
});

/**
 * Generate test audio using ffmpeg
 */
function generateTestAudio(outputPath: string, durationSeconds: number): void {
  try {
    // Generate sine wave (440Hz beep)
    execSync(
      `ffmpeg -f lavfi -i "sine=frequency=440:duration=${durationSeconds}" ` +
        `-ar 16000 -ac 1 -b:a 64k ${outputPath} -y`,
      { stdio: 'ignore' }
    );
  } catch (error) {
    console.error('Failed to generate test audio:', error);
    throw error;
  }
}
