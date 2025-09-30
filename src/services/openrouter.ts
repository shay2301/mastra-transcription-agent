import FormData from 'form-data';
import fs from 'fs';
import { Readable } from 'stream';
import { File } from 'buffer';

export interface TranscribeOptions {
  language?: string;
  temperature?: number;
  prompt?: string;
  responseFormat?: 'json' | 'text' | 'verbose_json' | 'vtt' | 'srt';
  timestampGranularities?: ('word' | 'segment')[];
}

export interface WhisperSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
}

export interface WhisperWord {
  word: string;
  start: number;
  end: number;
}

export interface WhisperResponse {
  task: string;
  language: string;
  duration: number;
  text: string;
  segments?: WhisperSegment[];
  words?: WhisperWord[];
}

export class OpenRouterClient {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(
    apiKey: string,
    baseUrl = 'https://openrouter.ai/api/v1',
    model = 'openai/whisper-large-v3'
  ) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.model = model;
  }

  /**
   * Transcribe audio buffer (for file mode)
   */
  async transcribeBuffer(
    buffer: Buffer,
    filename: string,
    opts: TranscribeOptions = {}
  ): Promise<WhisperResponse> {
    const formData = new FormData();

    // Append file buffer directly with proper options
    formData.append('file', buffer, {
      filename,
      contentType: this.getMimeType(filename),
    });

    formData.append('model', this.model);

    if (opts.language && opts.language !== 'auto') {
      formData.append('language', opts.language);
    }

    if (opts.temperature !== undefined) {
      formData.append('temperature', opts.temperature.toString());
    }

    if (opts.prompt) {
      formData.append('prompt', opts.prompt);
    }

    if (opts.responseFormat) {
      formData.append('response_format', opts.responseFormat);
    }

    if (opts.timestampGranularities) {
      formData.append('timestamp_granularities[]', opts.timestampGranularities.join(','));
    }

    const startTime = Date.now();

    try {
      const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://github.com/mastra-ai/live-transcriber',
          'X-Title': 'Mastra Live Transcriber',
          ...formData.getHeaders(),
        },
        body: formData as any,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
      }

      const result = await response.json() as WhisperResponse;

      const latency = Date.now() - startTime;
      console.log(`[OpenRouter] Transcription completed in ${latency}ms, ${buffer.length} bytes`);

      return result;
    } catch (error) {
      console.error('[OpenRouter] Transcription failed:', error);
      throw error;
    }
  }

  /**
   * Transcribe audio from file path
   */
  async transcribeFile(
    filePath: string,
    opts: TranscribeOptions = {}
  ): Promise<WhisperResponse> {
    const buffer = await fs.promises.readFile(filePath);
    const filename = filePath.split('/').pop() || 'audio.mp3';
    return this.transcribeBuffer(buffer, filename, opts);
  }

  /**
   * Transcribe streaming audio (batch frames to ~1s windows)
   */
  async *transcribeStream(
    frames: AsyncIterable<Buffer>,
    opts: TranscribeOptions = {}
  ): AsyncGenerator<WhisperResponse, void, unknown> {
    const batchSize = 16000 * 2; // ~1s at 16kHz mono 16-bit PCM
    let buffer: Buffer[] = [];
    let bufferSize = 0;
    let batchIndex = 0;

    for await (const frame of frames) {
      buffer.push(frame);
      bufferSize += frame.length;

      if (bufferSize >= batchSize) {
        const audioBuffer = Buffer.concat(buffer);
        buffer = [];
        bufferSize = 0;

        try {
          const result = await this.transcribeBuffer(
            audioBuffer,
            `stream_${batchIndex++}.wav`,
            { ...opts, responseFormat: 'verbose_json' }
          );
          yield result;
        } catch (error) {
          console.error('[OpenRouter] Stream transcription batch failed:', error);
        }
      }
    }

    // Process remaining buffer
    if (buffer.length > 0) {
      const audioBuffer = Buffer.concat(buffer);
      try {
        const result = await this.transcribeBuffer(
          audioBuffer,
          `stream_${batchIndex}.wav`,
          { ...opts, responseFormat: 'verbose_json' }
        );
        yield result;
      } catch (error) {
        console.error('[OpenRouter] Final stream batch failed:', error);
      }
    }
  }

  private getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      'mp3': 'audio/mpeg',
      'm4a': 'audio/mp4',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      'webm': 'audio/webm',
      'flac': 'audio/flac',
    };
    return mimeTypes[ext || ''] || 'audio/mpeg';
  }
}
