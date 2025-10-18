/**
 * Pure utility functions without DOM dependencies
 * Can be tested in Node/Bun environment
 */

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '0 B';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = bytes / Math.pow(1024, index);
  return `${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

export function createFileNameData(originalName) {
  const baseName = (originalName || 'converted-image').replace(/\.[^/.]+$/, '');
  const trimmed = baseName.trim().slice(0, 120);
  const displayName = trimmed || 'converted-image';
  const downloadName = displayName
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'converted-image';
  return { displayName, downloadName };
}

export async function detectMimeType(file) {
  const slice = file.slice(0, 12);
  const buffer = await slice.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  
  // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4E &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0D &&
    bytes[5] === 0x0A &&
    bytes[6] === 0x1A &&
    bytes[7] === 0x0A
  ) {
    return 'image/png';
  }
  
  // JPEG magic bytes: FF D8 FF
  if (bytes.length >= 3 && bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return 'image/jpeg';
  }
  
  return null;
}

// Rate limiting
const conversionLog = [];
const MAX_CONVERSIONS_PER_MINUTE = 20;

export function registerConversion() {
  const now = Date.now();
  conversionLog.push(now);
  pruneConversionLog();
}

export function isRateLimited() {
  pruneConversionLog();
  return conversionLog.length >= MAX_CONVERSIONS_PER_MINUTE;
}

// For testing: reset rate limit state
export function resetRateLimiting() {
  conversionLog.length = 0;
}

function pruneConversionLog() {
  const oneMinuteAgo = Date.now() - 60000;
  while (conversionLog.length > 0 && conversionLog[0] < oneMinuteAgo) {
    conversionLog.shift();
  }
}

