import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const unlink = promisify(fs.unlink);

export interface AudioInfo {
  duration: number;
  size: number;
  format: string;
  codec: string;
  sampleRate: number;
  channels: number;
  bitrate: number;
}

export interface TranscodeOptions {
  targetBitrate?: number; // kbps
  targetSampleRate?: number;
  targetChannels?: number;
  codec?: 'libopus' | 'aac';
}

export interface ChunkOptions {
  chunkDuration: number; // seconds
  overlap: number; // seconds
  outputDir: string;
}

export class AudioProcessor {
  private maxSizeMB: number;

  constructor(maxSizeMB = 19.5) {
    this.maxSizeMB = maxSizeMB;
  }

  /**
   * Get audio file information
   */
  async getAudioInfo(filePath: string): Promise<AudioInfo> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          return reject(new Error(`Failed to probe audio: ${err.message}`));
        }

        const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
        if (!audioStream) {
          return reject(new Error('No audio stream found'));
        }

        const stats = fs.statSync(filePath);

        resolve({
          duration: metadata.format.duration || 0,
          size: stats.size,
          format: metadata.format.format_name || 'unknown',
          codec: audioStream.codec_name || 'unknown',
          sampleRate: audioStream.sample_rate || 0,
          channels: audioStream.channels || 0,
          bitrate: metadata.format.bit_rate || 0,
        });
      });
    });
  }

  /**
   * Check if file exceeds size limit
   */
  exceedsLimit(fileSizeBytes: number): boolean {
    const maxBytes = this.maxSizeMB * 1024 * 1024;
    return fileSizeBytes > maxBytes;
  }

  /**
   * Transcode audio to reduce size (mono, 16kHz, low bitrate)
   */
  async transcode(
    inputPath: string,
    outputPath: string,
    opts: TranscodeOptions = {}
  ): Promise<string> {
    const {
      targetBitrate = 48, // 48kbps
      targetSampleRate = 16000,
      targetChannels = 1,
      codec = 'libopus',
    } = opts;

    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath)
        .audioCodec(codec)
        .audioBitrate(targetBitrate)
        .audioFrequency(targetSampleRate)
        .audioChannels(targetChannels)
        .format(codec === 'libopus' ? 'ogg' : 'm4a')
        .on('start', (cmd) => {
          console.log(`[Audio] Transcode started: ${cmd}`);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`[Audio] Transcoding: ${Math.round(progress.percent)}%`);
          }
        })
        .on('end', () => {
          console.log(`[Audio] Transcode complete: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error(`[Audio] Transcode error: ${err.message}`);
          reject(err);
        });

      command.save(outputPath);
    });
  }

  /**
   * Chunk audio file into overlapping segments
   */
  async chunk(
    inputPath: string,
    opts: ChunkOptions
  ): Promise<string[]> {
    const { chunkDuration, overlap, outputDir } = opts;

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const info = await this.getAudioInfo(inputPath);
    const totalDuration = info.duration;
    const chunks: string[] = [];

    let startTime = 0;
    let chunkIndex = 0;

    while (startTime < totalDuration) {
      const outputPath = path.join(outputDir, `chunk_${chunkIndex}.ogg`);

      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .setStartTime(startTime)
          .setDuration(chunkDuration)
          .audioCodec('libopus')
          .audioBitrate(48)
          .audioFrequency(16000)
          .audioChannels(1)
          .format('ogg')
          .on('end', () => {
            console.log(`[Audio] Chunk ${chunkIndex} created: ${outputPath}`);
            chunks.push(outputPath);
            resolve();
          })
          .on('error', (err) => {
            console.error(`[Audio] Chunk ${chunkIndex} error: ${err.message}`);
            reject(err);
          })
          .save(outputPath);
      });

      startTime += chunkDuration - overlap;
      chunkIndex++;
    }

    console.log(`[Audio] Created ${chunks.length} chunks`);
    return chunks;
  }

  /**
   * Cleanup temporary files
   */
  async cleanup(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        await unlink(filePath);
        console.log(`[Audio] Cleaned up: ${filePath}`);
      } catch (err) {
        console.error(`[Audio] Failed to cleanup ${filePath}:`, err);
      }
    }
  }

  /**
   * Convert buffer to WAV format (for live streaming)
   */
  async bufferToWav(pcmBuffer: Buffer, sampleRate = 16000, channels = 1): Promise<Buffer> {
    const tmpInput = `/tmp/input_${Date.now()}.raw`;
    const tmpOutput = `/tmp/output_${Date.now()}.wav`;

    try {
      // Write PCM to temp file
      await fs.promises.writeFile(tmpInput, pcmBuffer);

      // Convert to WAV
      await new Promise<void>((resolve, reject) => {
        ffmpeg(tmpInput)
          .inputFormat('s16le')
          .inputOptions([
            `-ar ${sampleRate}`,
            `-ac ${channels}`,
          ])
          .audioCodec('pcm_s16le')
          .format('wav')
          .on('end', () => resolve())
          .on('error', reject)
          .save(tmpOutput);
      });

      const wavBuffer = await fs.promises.readFile(tmpOutput);

      // Cleanup
      await this.cleanup([tmpInput, tmpOutput]);

      return wavBuffer;
    } catch (error) {
      // Cleanup on error
      await this.cleanup([tmpInput, tmpOutput]);
      throw error;
    }
  }
}
