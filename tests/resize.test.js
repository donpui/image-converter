import { describe, test, expect } from 'bun:test';
import { calculateResizeDimensions } from '../utils.js';

describe('calculateResizeDimensions', () => {
  describe('Original size option', () => {
    test('returns original dimensions when resize option is "original"', () => {
      const result = calculateResizeDimensions(2000, 1500, 'original');
      expect(result.outputWidth).toBe(2000);
      expect(result.outputHeight).toBe(1500);
    });

    test('handles various image sizes with "original" option', () => {
      expect(calculateResizeDimensions(800, 600, 'original')).toEqual({ 
        outputWidth: 800, 
        outputHeight: 600 
      });
      expect(calculateResizeDimensions(1920, 1080, 'original')).toEqual({ 
        outputWidth: 1920, 
        outputHeight: 1080 
      });
    });
  });

  describe('Landscape images (width > height)', () => {
    test('resizes 2000x1000 image to 1024px', () => {
      const result = calculateResizeDimensions(2000, 1000, '1024');
      expect(result.outputWidth).toBe(1024);
      expect(result.outputHeight).toBe(512);
    });

    test('resizes 3840x2160 (16:9) image to 1920px', () => {
      const result = calculateResizeDimensions(3840, 2160, '1920');
      expect(result.outputWidth).toBe(1920);
      expect(result.outputHeight).toBe(1080);
    });

    test('resizes 4096x2048 (2:1) image to 1024px', () => {
      const result = calculateResizeDimensions(4096, 2048, '1024');
      expect(result.outputWidth).toBe(1024);
      expect(result.outputHeight).toBe(512);
    });

    test('maintains aspect ratio for 16:10 images', () => {
      const result = calculateResizeDimensions(1920, 1200, '1280');
      expect(result.outputWidth).toBe(1280);
      expect(result.outputHeight).toBe(800);
    });
  });

  describe('Portrait images (height > width)', () => {
    test('resizes 1000x2000 image to 1024px', () => {
      const result = calculateResizeDimensions(1000, 2000, '1024');
      expect(result.outputWidth).toBe(512);
      expect(result.outputHeight).toBe(1024);
    });

    test('resizes 1080x1920 (9:16) image to 640px', () => {
      const result = calculateResizeDimensions(1080, 1920, '640');
      expect(result.outputWidth).toBe(360);
      expect(result.outputHeight).toBe(640);
    });

    test('maintains aspect ratio for portrait images', () => {
      const result = calculateResizeDimensions(1200, 1600, '800');
      expect(result.outputWidth).toBe(600);
      expect(result.outputHeight).toBe(800);
    });
  });

  describe('Square images', () => {
    test('resizes 1024x1024 square image to 1024px (no change)', () => {
      const result = calculateResizeDimensions(1024, 1024, '1024');
      expect(result.outputWidth).toBe(1024);
      expect(result.outputHeight).toBe(1024);
    });

    test('resizes 2000x2000 square image to 512px', () => {
      const result = calculateResizeDimensions(2000, 2000, '512');
      expect(result.outputWidth).toBe(512);
      expect(result.outputHeight).toBe(512);
    });

    test('resizes 4096x4096 square image to 1920px', () => {
      const result = calculateResizeDimensions(4096, 4096, '1920');
      expect(result.outputWidth).toBe(1920);
      expect(result.outputHeight).toBe(1920);
    });
  });

  describe('No upscaling - images smaller than target', () => {
    test('keeps 800x600 image unchanged when target is 1024px', () => {
      const result = calculateResizeDimensions(800, 600, '1024');
      expect(result.outputWidth).toBe(800);
      expect(result.outputHeight).toBe(600);
    });

    test('keeps 512x512 square unchanged when target is 1920px', () => {
      const result = calculateResizeDimensions(512, 512, '1920');
      expect(result.outputWidth).toBe(512);
      expect(result.outputHeight).toBe(512);
    });

    test('keeps 320x240 image unchanged when target is 640px', () => {
      const result = calculateResizeDimensions(320, 240, '640');
      expect(result.outputWidth).toBe(320);
      expect(result.outputHeight).toBe(240);
    });

    test('keeps portrait 480x640 unchanged when target is 1024px', () => {
      const result = calculateResizeDimensions(480, 640, '1024');
      expect(result.outputWidth).toBe(480);
      expect(result.outputHeight).toBe(640);
    });
  });

  describe('Edge cases and boundaries', () => {
    test('handles exact size match - 1024x768 to 1024px', () => {
      const result = calculateResizeDimensions(1024, 768, '1024');
      expect(result.outputWidth).toBe(1024);
      expect(result.outputHeight).toBe(768);
    });

    test('handles very wide images (21:9)', () => {
      const result = calculateResizeDimensions(2560, 1080, '1920');
      expect(result.outputWidth).toBe(1920);
      expect(result.outputHeight).toBe(810);
    });

    test('handles very tall images', () => {
      const result = calculateResizeDimensions(1080, 2560, '1920');
      expect(result.outputWidth).toBe(810);
      expect(result.outputHeight).toBe(1920);
    });

    test('handles small icon sizes', () => {
      const result = calculateResizeDimensions(128, 96, '64');
      expect(result.outputWidth).toBe(64);
      expect(result.outputHeight).toBe(48);
    });

    test('rounds dimensions correctly for odd aspect ratios', () => {
      const result = calculateResizeDimensions(1000, 333, '800');
      expect(result.outputWidth).toBe(800);
      expect(result.outputHeight).toBe(266);
    });
  });

  describe('Invalid inputs', () => {
    test('returns original size for invalid resize option (NaN)', () => {
      const result = calculateResizeDimensions(1920, 1080, 'invalid');
      expect(result.outputWidth).toBe(1920);
      expect(result.outputHeight).toBe(1080);
    });

    test('returns original size for negative resize value', () => {
      const result = calculateResizeDimensions(1920, 1080, '-100');
      expect(result.outputWidth).toBe(1920);
      expect(result.outputHeight).toBe(1080);
    });

    test('returns original size for zero resize value', () => {
      const result = calculateResizeDimensions(1920, 1080, '0');
      expect(result.outputWidth).toBe(1920);
      expect(result.outputHeight).toBe(1080);
    });

    test('returns original size for empty string', () => {
      const result = calculateResizeDimensions(1920, 1080, '');
      expect(result.outputWidth).toBe(1920);
      expect(result.outputHeight).toBe(1080);
    });
  });

  describe('Common resize scenarios', () => {
    test('icon size 64x64 from 512x512', () => {
      const result = calculateResizeDimensions(512, 512, '64');
      expect(result.outputWidth).toBe(64);
      expect(result.outputHeight).toBe(64);
    });

    test('thumbnail 320px from Full HD image', () => {
      const result = calculateResizeDimensions(1920, 1080, '320');
      expect(result.outputWidth).toBe(320);
      expect(result.outputHeight).toBe(180);
    });

    test('Full HD from 4K image', () => {
      const result = calculateResizeDimensions(3840, 2160, '1920');
      expect(result.outputWidth).toBe(1920);
      expect(result.outputHeight).toBe(1080);
    });

    test('2K from 8K image', () => {
      const result = calculateResizeDimensions(7680, 4320, '2560');
      expect(result.outputWidth).toBe(2560);
      expect(result.outputHeight).toBe(1440);
    });
  });

  describe('Aspect ratio preservation', () => {
    test('maintains 4:3 aspect ratio', () => {
      const result = calculateResizeDimensions(4000, 3000, '800');
      expect(result.outputWidth).toBe(800);
      expect(result.outputHeight).toBe(600);
      // Verify aspect ratio: 800/600 ≈ 4000/3000
      expect(result.outputWidth / result.outputHeight).toBeCloseTo(4000 / 3000, 2);
    });

    test('maintains 16:9 aspect ratio', () => {
      const result = calculateResizeDimensions(1920, 1080, '1280');
      expect(result.outputWidth).toBe(1280);
      expect(result.outputHeight).toBe(720);
      // Verify aspect ratio: 1280/720 ≈ 1920/1080
      expect(result.outputWidth / result.outputHeight).toBeCloseTo(1920 / 1080, 2);
    });

    test('maintains 3:2 aspect ratio', () => {
      const result = calculateResizeDimensions(3000, 2000, '1500');
      expect(result.outputWidth).toBe(1500);
      expect(result.outputHeight).toBe(1000);
      // Verify aspect ratio
      expect(result.outputWidth / result.outputHeight).toBeCloseTo(3000 / 2000, 2);
    });
  });
});

