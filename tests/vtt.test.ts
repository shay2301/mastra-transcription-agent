import { describe, it, expect } from 'vitest';
import { TranscriptMerger, MergedSegment } from '../src/services/merge';

describe('VTT Formatting', () => {
  const merger = new TranscriptMerger();

  it('should format timestamps correctly', () => {
    const segments: MergedSegment[] = [
      { start: 0.0, end: 3.5, text: 'Hello world' },
      { start: 3.5, end: 7.2, text: 'This is a test' },
    ];

    const vtt = merger.toVTT(segments);

    expect(vtt).toContain('WEBVTT');
    expect(vtt).toContain('00:00:00.000 --> 00:00:');
    expect(vtt).toContain('Hello world');
    expect(vtt).toContain('This is a test');
  });

  it('should split long text into cues', () => {
    const segments: MergedSegment[] = [
      {
        start: 0.0,
        end: 10.0,
        text: 'This is a very long sentence that should be split into multiple cues for better readability',
      },
    ];

    const vtt = merger.toVTT(segments);
    const cues = vtt.split('\n\n').filter((line) => line.trim() && !line.startsWith('WEBVTT'));

    // Should create multiple cues from one long segment
    expect(cues.length).toBeGreaterThan(1);
  });

  it('should handle timestamps at hour boundaries', () => {
    const segments: MergedSegment[] = [
      { start: 3599.5, end: 3602.0, text: 'Near one hour' },
      { start: 3600.0, end: 3605.0, text: 'After one hour' },
    ];

    const vtt = merger.toVTT(segments);

    expect(vtt).toContain('00:59:59');
    expect(vtt).toContain('01:00:00');
    expect(vtt).toContain('01:00:05');
  });

  it('should convert segments to plain text', () => {
    const segments: MergedSegment[] = [
      { start: 0.0, end: 2.0, text: 'First segment.' },
      { start: 2.0, end: 4.0, text: 'Second segment.' },
      { start: 4.0, end: 6.0, text: 'Third segment.' },
    ];

    const text = merger.toText(segments);

    expect(text).toBe('First segment. Second segment. Third segment.');
  });

  it('should handle empty segments', () => {
    const segments: MergedSegment[] = [];
    const vtt = merger.toVTT(segments);
    const text = merger.toText(segments);

    expect(vtt).toBe('WEBVTT\n\n');
    expect(text).toBe('');
  });

  it('should handle single word segments', () => {
    const segments: MergedSegment[] = [
      { start: 0.0, end: 0.5, text: 'Hello' },
      { start: 0.5, end: 1.0, text: 'world' },
    ];

    const vtt = merger.toVTT(segments);

    expect(vtt).toContain('Hello');
    expect(vtt).toContain('world');
  });

  it('should merge chunks correctly', () => {
    const chunk1 = {
      text: 'Hello world',
      segments: [
        { start: 0.0, end: 1.0, text: 'Hello' },
        { start: 1.0, end: 2.0, text: 'world' },
      ],
    };

    const chunk2 = {
      text: 'this is a test',
      segments: [
        { start: 0.0, end: 1.0, text: 'this is' },
        { start: 1.0, end: 2.0, text: 'a test' },
      ],
    };

    const merged = merger.mergeChunks(
      [chunk1 as any, chunk2 as any],
      90, // chunk duration
      0.5 // overlap
    );

    expect(merged.length).toBeGreaterThan(0);
    expect(merged[0].text).toBe('Hello');
  });

  it('should deduplicate overlapping segments', () => {
    const segments: MergedSegment[] = [
      { start: 0.0, end: 2.0, text: 'Hello world' },
      { start: 1.5, end: 3.0, text: 'Hello world again' }, // Overlaps
      { start: 1.6, end: 2.5, text: 'Hello world' }, // Duplicate
      { start: 3.0, end: 5.0, text: 'Different text' },
    ];

    const deduplicated = merger['deduplicateSegments'](segments);

    expect(deduplicated.length).toBeLessThan(segments.length);
  });

  it('should calculate text similarity correctly', () => {
    const sim1 = merger['textSimilarity']('hello world', 'hello world');
    expect(sim1).toBe(1.0);

    const sim2 = merger['textSimilarity']('hello world', 'goodbye world');
    expect(sim2).toBeGreaterThan(0.3); // Share "world"
    expect(sim2).toBeLessThan(1.0);

    const sim3 = merger['textSimilarity']('hello', 'goodbye');
    expect(sim3).toBe(0.0);
  });
});
