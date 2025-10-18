import { describe, test, expect, beforeEach } from 'bun:test';
import {
  formatBytes,
  createFileNameData,
  detectMimeType,
  registerConversion,
  isRateLimited,
  resetRateLimiting,
  validateFileSize,
  validateImageDimensions,
  validateMimeType,
  MAX_FILE_SIZE,
  MAX_DIMENSION,
  SUPPORTED_TYPES
} from '../utils.js';

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

describe('validateFileSize', () => {
  test('accepts valid file sizes', () => {
    const result = validateFileSize(1024); // 1KB
    expect(result.valid).toBe(true);
  });

  test('accepts files at the limit', () => {
    const result = validateFileSize(MAX_FILE_SIZE);
    expect(result.valid).toBe(true);
  });

  test('rejects files exceeding the limit', () => {
    const result = validateFileSize(MAX_FILE_SIZE + 1);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('exceeds');
  });

  test('rejects invalid file sizes', () => {
    expect(validateFileSize(NaN).valid).toBe(false);
    expect(validateFileSize(-1).valid).toBe(false);
    expect(validateFileSize(Infinity).valid).toBe(false);
  });

  test('uses custom max size when provided', () => {
    const customMax = 1024; // 1KB
    const result = validateFileSize(2048, customMax);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('1.0 KB');
  });

  test('accepts zero-byte files', () => {
    const result = validateFileSize(0);
    expect(result.valid).toBe(true);
  });
});

describe('validateImageDimensions', () => {
  test('accepts valid dimensions', () => {
    const result = validateImageDimensions(1920, 1080);
    expect(result.valid).toBe(true);
  });

  test('accepts dimensions at the limit', () => {
    const result = validateImageDimensions(MAX_DIMENSION, MAX_DIMENSION);
    expect(result.valid).toBe(true);
  });

  test('rejects width exceeding limit', () => {
    const result = validateImageDimensions(MAX_DIMENSION + 1, 1080);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('exceed');
  });

  test('rejects height exceeding limit', () => {
    const result = validateImageDimensions(1920, MAX_DIMENSION + 1);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('exceed');
  });

  test('rejects invalid dimensions', () => {
    expect(validateImageDimensions(0, 1080).valid).toBe(false);
    expect(validateImageDimensions(1920, 0).valid).toBe(false);
    expect(validateImageDimensions(-1, 1080).valid).toBe(false);
    expect(validateImageDimensions(1920, -1).valid).toBe(false);
    expect(validateImageDimensions(NaN, 1080).valid).toBe(false);
    expect(validateImageDimensions(1920, NaN).valid).toBe(false);
  });

  test('uses custom max dimension when provided', () => {
    const customMax = 1000;
    const result = validateImageDimensions(1920, 1080, customMax);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('1,000');
  });

  test('accepts square images', () => {
    const result = validateImageDimensions(1000, 1000);
    expect(result.valid).toBe(true);
  });
});

describe('validateMimeType', () => {
  test('accepts supported MIME types', () => {
    expect(validateMimeType('image/jpeg').valid).toBe(true);
    expect(validateMimeType('image/png').valid).toBe(true);
  });

  test('rejects unsupported MIME types', () => {
    const result = validateMimeType('image/gif');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Unsupported');
  });

  test('rejects invalid MIME type values', () => {
    expect(validateMimeType(null).valid).toBe(false);
    expect(validateMimeType(undefined).valid).toBe(false);
    expect(validateMimeType('').valid).toBe(false);
  });

  test('rejects non-string MIME types', () => {
    // @ts-ignore - testing invalid input
    expect(validateMimeType(123).valid).toBe(false);
    // @ts-ignore - testing invalid input
    expect(validateMimeType({}).valid).toBe(false);
  });

  test('uses custom supported types when provided', () => {
    const customTypes = new Set(['image/webp']);
    expect(validateMimeType('image/webp', customTypes).valid).toBe(true);
    expect(validateMimeType('image/jpeg', customTypes).valid).toBe(false);
  });

  test('is case-sensitive', () => {
    const result = validateMimeType('IMAGE/JPEG');
    expect(result.valid).toBe(false);
  });
});

describe('Constants', () => {
  test('MAX_FILE_SIZE is 50MB', () => {
    expect(MAX_FILE_SIZE).toBe(50 * 1024 * 1024);
  });

  test('MAX_DIMENSION is 20000', () => {
    expect(MAX_DIMENSION).toBe(20000);
  });

  test('SUPPORTED_TYPES contains expected types', () => {
    expect(SUPPORTED_TYPES.has('image/jpeg')).toBe(true);
    expect(SUPPORTED_TYPES.has('image/png')).toBe(true);
    expect(SUPPORTED_TYPES.size).toBe(2);
  });
});

