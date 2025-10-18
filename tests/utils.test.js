import { describe, test, expect, beforeEach } from 'bun:test';
import { formatBytes, createFileNameData, detectMimeType, registerConversion, isRateLimited, resetRateLimiting } from '../utils.js';

describe('formatBytes', () => {

  test('formats bytes correctly', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1023)).toBe('1023 B');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(1048576)).toBe('1.0 MB');
    expect(formatBytes(10485760)).toBe('10 MB');
    expect(formatBytes(1073741824)).toBe('1.0 GB');
  });

  test('handles edge cases', () => {
    expect(formatBytes(NaN)).toBe('0 B');
    expect(formatBytes(Infinity)).toBe('0 B');
  });
});

describe('createFileNameData', () => {
  test('removes file extension', () => {
    const result = createFileNameData('photo.jpg');
    expect(result.displayName).toBe('photo');
    expect(result.downloadName).toBe('photo');
  });

  test('sanitizes special characters', () => {
    const result = createFileNameData('My Photo!!.png');
    expect(result.displayName).toBe('My Photo!!');
    expect(result.downloadName).toBe('my-photo');
  });

  test('handles empty or invalid names', () => {
    const result = createFileNameData('');
    expect(result.displayName).toBe('converted-image');
    expect(result.downloadName).toBe('converted-image');
  });

  test('limits length to 120 characters', () => {
    const longName = 'a'.repeat(150) + '.jpg';
    const result = createFileNameData(longName);
    expect(result.displayName.length).toBeLessThanOrEqual(120);
  });
});

describe('detectMimeType', () => {
  test('detects PNG signature', async () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const blob = new Blob([pngBytes]);
    const file = new File([blob], 'test.png');
    
    const mime = await detectMimeType(file);
    expect(mime).toBe('image/png');
  });

  test('detects JPEG signature', async () => {
    const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff]);
    const blob = new Blob([jpegBytes]);
    const file = new File([blob], 'test.jpg');
    
    const mime = await detectMimeType(file);
    expect(mime).toBe('image/jpeg');
  });

  test('returns null for unknown format', async () => {
    const unknownBytes = new Uint8Array([0x00, 0x00, 0x00]);
    const blob = new Blob([unknownBytes]);
    const file = new File([blob], 'test.bin');
    
    const mime = await detectMimeType(file);
    expect(mime).toBeNull();
  });
});

describe('Rate limiting', () => {
  beforeEach(() => {
    resetRateLimiting();
  });
  
  test('prevents excessive conversions', () => {
    // Add 20 conversions (the max per minute)
    for (let i = 0; i < 20; i++) {
      expect(isRateLimited()).toBe(false);
      registerConversion();
    }
    
    // 21st should be rate limited
    expect(isRateLimited()).toBe(true);
  });
  
  test('tracks conversion count correctly', () => {
    // Register a few conversions
    registerConversion();
    registerConversion();
    registerConversion();
    
    // Should not be rate limited with only 3 conversions
    expect(isRateLimited()).toBe(false);
  });
});

