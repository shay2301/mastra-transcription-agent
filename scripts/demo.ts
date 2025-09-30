#!/usr/bin/env tsx

/**
 * Demo script: Generate sample audio and test transcription
 */

import { TranscriberAgent } from '../src/agent/TranscriberAgent.js';
import { execSync } from 'child_process';
import fs from 'fs';

async function demo() {
  console.log('🎙️  Mastra Live Transcriber - Demo\n');

  // Check API key
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('❌ OPENROUTER_API_KEY not set in environment');
    console.log('Set it in .env.local and try again.');
    process.exit(1);
  }

  // Check ffmpeg
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
  } catch (error) {
    console.error('❌ ffmpeg not found. Please install ffmpeg first.');
    process.exit(1);
  }

  console.log('✅ Prerequisites OK\n');

  // Generate sample audio
  const samplePath = '/tmp/demo-sample.mp3';
  console.log('📝 Generating 30-second test audio...');

  try {
    execSync(
      `ffmpeg -f lavfi -i "sine=frequency=440:duration=30" -ar 16000 -ac 1 -b:a 64k ${samplePath} -y`,
      { stdio: 'ignore' }
    );
    console.log('✅ Test audio generated\n');
  } catch (error) {
    console.error('❌ Failed to generate test audio');
    process.exit(1);
  }

  // Initialize agent
  console.log('🤖 Initializing TranscriberAgent...');
  const agent = new TranscriberAgent(
    process.env.OPENROUTER_API_KEY,
    process.env.OPENROUTER_BASE_URL,
    process.env.OPENROUTER_MODEL
  );
  console.log('✅ Agent ready\n');

  // Transcribe
  console.log('🎤 Transcribing audio...');
  const startTime = Date.now();

  try {
    const result = await agent.transcribeFile(samplePath, {
      language: 'en',
      timestamps: 'segments',
    });

    const duration = Date.now() - startTime;

    console.log('\n✅ Transcription complete!\n');
    console.log('📊 Results:');
    console.log('─'.repeat(60));
    console.log(`Text: ${result.text || '(no speech detected)'}`);
    console.log(`Language: ${result.meta.language}`);
    console.log(`Duration: ${result.meta.duration.toFixed(2)}s`);
    console.log(`Segments: ${result.segments.length}`);
    console.log(`Chunked: ${result.meta.chunked ? 'Yes' : 'No'}`);
    console.log(`Transcoded: ${result.meta.transcoded ? 'Yes' : 'No'}`);
    console.log(`Latency: ${result.meta.latencyMs}ms`);
    console.log(`Total Time: ${duration}ms`);
    console.log('─'.repeat(60));

    // Save VTT
    const vttPath = '/tmp/demo-transcript.vtt';
    fs.writeFileSync(vttPath, result.vtt);
    console.log(`\n💾 VTT saved to: ${vttPath}`);

    // Save text
    const txtPath = '/tmp/demo-transcript.txt';
    fs.writeFileSync(txtPath, result.text);
    console.log(`💾 Text saved to: ${txtPath}\n`);

    console.log('🎉 Demo complete!\n');
    console.log('Next steps:');
    console.log('1. Start server: npm run dev');
    console.log('2. Open browser: http://localhost:3000');
    console.log('3. Try live mode: http://localhost:3000/live\n');
  } catch (error: any) {
    console.error('\n❌ Transcription failed:', error.message);
    process.exit(1);
  } finally {
    // Cleanup
    if (fs.existsSync(samplePath)) {
      fs.unlinkSync(samplePath);
    }
  }
}

demo().catch((error) => {
  console.error('Demo error:', error);
  process.exit(1);
});
