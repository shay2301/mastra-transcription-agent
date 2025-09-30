import { WhisperResponse, WhisperSegment } from './openrouter.js';

export interface MergedSegment {
  start: number;
  end: number;
  text: string;
}

export class TranscriptMerger {
  /**
   * Merge chunks with overlapping timestamps
   * Uses naive greedy stitching by timestamp
   */
  mergeChunks(
    chunks: WhisperResponse[],
    chunkDuration: number,
    overlap: number
  ): MergedSegment[] {
    if (chunks.length === 0) return [];
    if (chunks.length === 1) {
      return this.extractSegments(chunks[0]);
    }

    const merged: MergedSegment[] = [];
    let currentOffset = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const segments = this.extractSegments(chunk);

      if (i === 0) {
        // First chunk: add all segments
        merged.push(...segments.map(s => ({
          ...s,
          start: s.start + currentOffset,
          end: s.end + currentOffset,
        })));
      } else {
        // Subsequent chunks: skip overlap region
        const skipUntil = overlap;
        const filteredSegments = segments.filter(s => s.start >= skipUntil);

        merged.push(...filteredSegments.map(s => ({
          ...s,
          start: s.start + currentOffset,
          end: s.end + currentOffset,
        })));
      }

      currentOffset += chunkDuration - overlap;
    }

    return this.deduplicateSegments(merged);
  }

  /**
   * Extract segments from Whisper response
   */
  private extractSegments(response: WhisperResponse): MergedSegment[] {
    if (response.segments && response.segments.length > 0) {
      return response.segments.map(s => ({
        start: s.start,
        end: s.end,
        text: s.text.trim(),
      }));
    }

    // Fallback: create single segment
    return [{
      start: 0,
      end: response.duration || 0,
      text: response.text.trim(),
    }];
  }

  /**
   * Remove duplicate or overlapping segments
   */
  private deduplicateSegments(segments: MergedSegment[]): MergedSegment[] {
    if (segments.length === 0) return [];

    const sorted = segments.sort((a, b) => a.start - b.start);
    const deduplicated: MergedSegment[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const last = deduplicated[deduplicated.length - 1];

      // If segments overlap significantly, skip duplicate
      if (current.start < last.end && this.textSimilarity(current.text, last.text) > 0.7) {
        continue;
      }

      deduplicated.push(current);
    }

    return deduplicated;
  }

  /**
   * Simple text similarity (Jaccard on words)
   */
  private textSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.toLowerCase().split(/\s+/));
    const wordsB = new Set(b.toLowerCase().split(/\s+/));

    const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
    const union = new Set([...wordsA, ...wordsB]);

    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  /**
   * Convert segments to plain text
   */
  toText(segments: MergedSegment[]): string {
    return segments.map(s => s.text).join(' ').trim();
  }

  /**
   * Convert segments to WebVTT format
   */
  toVTT(segments: MergedSegment[]): string {
    const vtt = ['WEBVTT', ''];

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const start = this.formatTimestamp(segment.start);
      const end = this.formatTimestamp(segment.end);

      // Split long text into 6-8 word cues
      const cues = this.splitIntoCues(segment.text);
      const duration = segment.end - segment.start;
      const cueStep = duration / cues.length;

      cues.forEach((cueText, j) => {
        const cueStart = segment.start + j * cueStep;
        const cueEnd = Math.min(segment.start + (j + 1) * cueStep, segment.end);

        vtt.push(`${i + 1}.${j + 1}`);
        vtt.push(`${this.formatTimestamp(cueStart)} --> ${this.formatTimestamp(cueEnd)}`);
        vtt.push(cueText);
        vtt.push('');
      });
    }

    return vtt.join('\n');
  }

  /**
   * Split text into cues of 6-8 words
   */
  private splitIntoCues(text: string, maxWords = 8): string[] {
    const words = text.trim().split(/\s+/);
    const cues: string[] = [];

    for (let i = 0; i < words.length; i += maxWords) {
      cues.push(words.slice(i, i + maxWords).join(' '));
    }

    return cues;
  }

  /**
   * Format timestamp for VTT (HH:MM:SS.mmm)
   */
  private formatTimestamp(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms
      .toString()
      .padStart(3, '0')}`;
  }
}
