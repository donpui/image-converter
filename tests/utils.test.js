import { describe, test, expect } from 'bun:test';

// Import functions to test
// Since app.js uses DOM, we'll test the pure utility functions

describe('formatBytes', () => {
  const formatBytes = (bytes) => {
    if (!Number.isFinite(bytes)) return '0 B';
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const size = bytes / Math.pow(1024, index);
    return `${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
  };

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
  const createFileNameData = (originalName) => {
    const baseName = (originalName || 'converted-image').replace(/\.[^/.]+$/, '');
    const trimmed = baseName.trim().slice(0, 120);
    const displayName = trimmed || 'converted-image';
    const downloadName = displayName
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'converted-image';
    return { displayName, downloadName };
  };

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
    
    const detectMimeType = async (file) => {
      const slice = file.slice(0, 12);
      const buffer = await slice.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      
      if (
        bytes.length >= 8 &&
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47 &&
        bytes[4] === 0x0d &&
        bytes[5] === 0x0a &&
        bytes[6] === 0x1a &&
        bytes[7] === 0x0a
      ) {
        return 'image/png';
      }
      
      if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
        return 'image/jpeg';
      }
      
      return null;
    };
    
    const mime = await detectMimeType(file);
    expect(mime).toBe('image/png');
  });

  test('detects JPEG signature', async () => {
    const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff]);
    const blob = new Blob([jpegBytes]);
    const file = new File([blob], 'test.jpg');
    
    const detectMimeType = async (file) => {
      const slice = file.slice(0, 12);
      const buffer = await slice.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      
      if (
        bytes.length >= 8 &&
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47 &&
        bytes[4] === 0x0d &&
        bytes[5] === 0x0a &&
        bytes[6] === 0x1a &&
        bytes[7] === 0x0a
      ) {
        return 'image/png';
      }
      
      if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
        return 'image/jpeg';
      }
      
      return null;
    };
    
    const mime = await detectMimeType(file);
    expect(mime).toBe('image/jpeg');
  });

  test('returns null for unknown format', async () => {
    const unknownBytes = new Uint8Array([0x00, 0x00, 0x00]);
    const blob = new Blob([unknownBytes]);
    const file = new File([blob], 'test.bin');
    
    const detectMimeType = async (file) => {
      const slice = file.slice(0, 12);
      const buffer = await slice.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      
      if (
        bytes.length >= 8 &&
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47 &&
        bytes[4] === 0x0d &&
        bytes[5] === 0x0a &&
        bytes[6] === 0x1a &&
        bytes[7] === 0x0a
      ) {
        return 'image/png';
      }
      
      if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
        return 'image/jpeg';
      }
      
      return null;
    };
    
    const mime = await detectMimeType(file);
    expect(mime).toBeNull();
  });
});

describe('Rate limiting', () => {
  test('prevents excessive conversions', () => {
    const MAX_CONVERSIONS_PER_WINDOW = 15;
    const RATE_LIMIT_WINDOW_MS = 30 * 1000;
    const conversionLog = [];
    
    const pruneConversionLog = (now) => {
      while (conversionLog.length && now - conversionLog[0] > RATE_LIMIT_WINDOW_MS) {
        conversionLog.shift();
      }
    };
    
    const isRateLimited = () => {
      const now = Date.now();
      pruneConversionLog(now);
      return conversionLog.length >= MAX_CONVERSIONS_PER_WINDOW;
    };
    
    const registerConversion = () => {
      const now = Date.now();
      pruneConversionLog(now);
      conversionLog.push(now);
    };
    
    // Add 15 conversions
    for (let i = 0; i < 15; i++) {
      expect(isRateLimited()).toBe(false);
      registerConversion();
    }
    
    // 16th should be rate limited
    expect(isRateLimited()).toBe(true);
  });
});

