const fileInput = document.getElementById('file-input');
const dropzone = document.getElementById('dropzone');
const results = document.getElementById('results');
const template = document.getElementById('result-template');
const qualitySlider = document.getElementById('quality');
const qualityValue = document.getElementById('quality-value');
const clearBtn = document.getElementById('clear-btn');
const regenerateBtn = document.getElementById('regenerate-btn');

const SUPPORTED_TYPES = new Set(['image/jpeg', 'image/png']);
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_FILE_SIZE_LABEL = '20 MB';
const activeUrls = new Set();
const storedFiles = [];
const regenerateDefaultLabel = regenerateBtn ? regenerateBtn.textContent : 'Regenerate';

qualityValue.textContent = `${qualitySlider.value}%`;
regenerateBtn.hidden = true;
regenerateBtn.disabled = true;

fileInput.addEventListener('change', () => {
  if (fileInput.files?.length) {
    convertFiles(fileInput.files);
    fileInput.value = '';
  }
});

dropzone.addEventListener('dragover', (event) => {
  event.preventDefault();
  dropzone.classList.add('dropzone--active');
});

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('dropzone--active');
});

dropzone.addEventListener('drop', (event) => {
  event.preventDefault();
  dropzone.classList.remove('dropzone--active');
  const files = event.dataTransfer?.files;
  if (files?.length) {
    convertFiles(files);
  }
});

qualitySlider.addEventListener('input', () => {
  qualityValue.textContent = `${qualitySlider.value}%`;
});

clearBtn.addEventListener('click', () => {
  results.innerHTML = '';
  storedFiles.length = 0;
  activeUrls.forEach((url) => URL.revokeObjectURL(url));
  activeUrls.clear();
  regenerateBtn.textContent = regenerateDefaultLabel;
  regenerateBtn.disabled = true;
  regenerateBtn.hidden = true;
  announce('Cleared converted images.');
});

regenerateBtn.addEventListener('click', async () => {
  if (!storedFiles.length) {
    return;
  }

  const qualityPercent = Number(qualitySlider.value);
  const quality = qualityPercent / 100;
  const previousLabel = regenerateBtn.textContent;
  regenerateBtn.disabled = true;
  regenerateBtn.textContent = 'Regenerating...';

  let successCount = 0;

  for (const file of storedFiles) {
    if (file.size > MAX_FILE_SIZE) {
      announce(`${file.name} skipped during regenerate (exceeds ${MAX_FILE_SIZE_LABEL}).`);
      continue;
    }

    let trustedMime;
    try {
      trustedMime = await detectMimeType(file);
    } catch (error) {
      console.error(error);
    }

    if (!trustedMime || !SUPPORTED_TYPES.has(trustedMime)) {
      announce(`${file.name} skipped during regenerate (unsupported or spoofed format).`);
      continue;
    }

    try {
      const { width, height, webpBlob, originalInfo } = await convertFile(file, quality, trustedMime);
      const webpUrl = URL.createObjectURL(webpBlob);
      const { displayName, downloadName } = createFileNameData(file.name);
      renderResult({
        displayName,
        downloadName,
        webpUrl,
        webpBlob,
        webpSize: webpBlob.size,
        dimensions: `${width} × ${height}`,
        mime: webpBlob.type,
        originalInfo,
        quality: qualityPercent,
      });
      successCount += 1;
    } catch (error) {
      console.error(error);
      announce(`Failed to regenerate ${file.name}.`);
    }
  }

  if (successCount) {
    announce(`Regenerated ${successCount} image${successCount === 1 ? '' : 's'} at ${qualityPercent}% quality.`);
  }

  regenerateBtn.textContent = previousLabel;
  regenerateBtn.disabled = storedFiles.length === 0;
});

function announce(message) {
  const alert = document.createElement('div');
  alert.className = 'sr-only';
  alert.setAttribute('role', 'status');
  alert.textContent = message;
  results.append(alert);
  requestAnimationFrame(() => alert.remove());
}

async function convertFiles(fileList) {
  const files = Array.from(fileList);
  const qualityPercent = Number(qualitySlider.value);
  const quality = qualityPercent / 100;

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      announce(`${file.name} skipped (exceeds ${MAX_FILE_SIZE_LABEL}).`);
      continue;
    }

    let trustedMime;
    try {
      trustedMime = await detectMimeType(file);
    } catch (error) {
      console.error(error);
    }

    if (!trustedMime || !SUPPORTED_TYPES.has(trustedMime)) {
      announce(`${file.name} skipped (unsupported or spoofed format).`);
      continue;
    }

    try {
      const { width, height, webpBlob, originalInfo } = await convertFile(file, quality, trustedMime);
      const webpUrl = URL.createObjectURL(webpBlob);
      const { displayName, downloadName } = createFileNameData(file.name);
      renderResult({
        displayName,
        downloadName,
        webpUrl,
        webpBlob,
        webpSize: webpBlob.size,
        dimensions: `${width} × ${height}`,
        mime: webpBlob.type,
        originalInfo,
        quality: qualityPercent,
      });
      addStoredFile(file);
    } catch (error) {
      console.error(error);
      announce(`Something went wrong converting ${file.name}.`);
    }
  }

  if (storedFiles.length) {
    regenerateBtn.hidden = false;
    regenerateBtn.disabled = false;
    regenerateBtn.textContent = regenerateDefaultLabel;
  }
}

async function convertFile(file, quality, trustedMime) {
  const effectiveMime = trustedMime || (await detectMimeType(file));
  const { img, width, height } = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Canvas 2D context unavailable.');
  }

  context.drawImage(img, 0, 0, width, height);
  const webpBlob = await canvasToBlob(canvas, 'image/webp', quality);

  if (!webpBlob) {
    throw new Error('Browser failed to create WebP blob.');
  }

  const sourceMime = effectiveMime || file.type || 'unknown';
  const originalInfo = `${formatBytes(file.size)} • ${sourceMime} • ${width} × ${height}`;

  return { width, height, webpBlob, originalInfo };
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ img, width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
    };
    img.onerror = (error) => {
      URL.revokeObjectURL(url);
      reject(error);
    };
    img.src = url;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

function renderResult({ displayName, downloadName, webpUrl, webpBlob, webpSize, dimensions, mime, originalInfo, quality }) {
  const clone = document.importNode(template.content, true);
  const article = clone.querySelector('.result');
  const image = clone.querySelector('.result__image');
  const name = clone.querySelector('.result__name');
  const original = clone.querySelector('.result__original');
  const converted = clone.querySelector('.result__converted');
  const downloadBtn = clone.querySelector('.result__download');
  const copyBtn = clone.querySelector('.result__copy');

  let copyResetId;
  const qualityLabel = Number.isFinite(quality) ? `Quality ${quality}%` : '';
  const downloadSuffix = Number.isFinite(quality) ? `-q${quality}` : '';

  const defaultCopyText = copyBtn.textContent.trim() || 'Copy WebP';

  const setCopyLabel = (text, shouldReset = true) => {
    copyBtn.textContent = text;
    if (copyResetId) {
      clearTimeout(copyResetId);
    }
    if (shouldReset) {
      copyResetId = window.setTimeout(() => {
        copyBtn.textContent = defaultCopyText;
      }, 1200);
    }
  };

  name.textContent = qualityLabel ? `${displayName} (${qualityLabel})` : displayName;
  image.alt = `${displayName} preview in WebP format`;
  image.src = webpUrl;
  downloadBtn.href = webpUrl;
  downloadBtn.download = `${downloadName}${downloadSuffix}.webp`;
  original.textContent = originalInfo;
  converted.textContent = `${formatBytes(webpSize)} • ${mime} • ${dimensions}${qualityLabel ? ` • ${qualityLabel}` : ''}`;
  activeUrls.add(webpUrl);

  if (!isClipboardFileSupported()) {
    copyBtn.disabled = true;
    copyBtn.setAttribute('aria-disabled', 'true');
    setCopyLabel('Copy unavailable', false);
  } else {
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.write([new ClipboardItem({ [webpBlob.type]: webpBlob })]);
        setCopyLabel('Copied!');
      } catch (error) {
        console.error(error);
        setCopyLabel('Copy failed');
      }
    });
  }

  results.append(article);
}

function addStoredFile(file) {
  const exists = storedFiles.some(
    (item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified,
  );
  if (!exists) {
    storedFiles.push(file);
  }
}

function createFileNameData(originalName) {
  const baseName = (originalName || 'converted-image').replace(/\.[^/.]+$/, '');
  const trimmed = baseName.trim().slice(0, 120);
  const displayName = trimmed || 'converted-image';
  const downloadName = displayName
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'converted-image';
  return { displayName, downloadName };
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '0 B';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = bytes / Math.pow(1024, index);
  return `${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

async function detectMimeType(file) {
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
}

function isClipboardFileSupported() {
  return typeof navigator !== 'undefined'
    && navigator.clipboard
    && typeof navigator.clipboard.write === 'function'
    && typeof window !== 'undefined'
    && typeof window.ClipboardItem === 'function';
}

// Ensure keyboard focus works for dropzone label
dropzone.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    fileInput.click();
  }
});
