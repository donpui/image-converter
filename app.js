import {
  formatBytes,
  createFileNameData,
  detectMimeType,
  validateFileSize,
  validateImageDimensions,
  validateMimeType,
  calculateResizeDimensions
} from './utils.js';

const fileInput = document.getElementById('file-input');
const dropzone = document.getElementById('dropzone');
const results = document.getElementById('results');
const template = document.getElementById('result-template');
const qualitySlider = document.getElementById('quality');
const qualityValue = document.getElementById('quality-value');
const resizeSlider = document.getElementById('resize');
const resizeValue = document.getElementById('resize-value');
const resizeInfo = document.getElementById('resize-info');
const clearBtn = document.getElementById('clear-btn');
const regenerateBtn = document.getElementById('regenerate-btn');
const supportMessage = document.getElementById('support-message');
const themeToggle = document.getElementById('theme-toggle');

const MAX_CONVERSIONS_PER_WINDOW = 15;
const RATE_LIMIT_WINDOW_MS = 30 * 1000;
const RATE_LIMIT_MESSAGE = 'Rate limit reached. Please wait a moment before converting more images.';

// Resize options mapping: slider value -> {pixels, label}
const RESIZE_OPTIONS = [
  { value: 'original', label: 'Original', description: 'No resize' },
  { value: '16', label: '16px', description: 'Icon' },
  { value: '64', label: '64px', description: 'Icon' },
  { value: '128', label: '128px', description: 'Icon' },
  { value: '320', label: '320px', description: 'Thumbnail' },
  { value: '512', label: '512px', description: 'Small' },
  { value: '640', label: '640px', description: 'Small' },
  { value: '800', label: '800px', description: 'Medium' },
  { value: '1024', label: '1024px', description: 'Large' },
  { value: '1280', label: '1280px', description: 'HD Ready' },
  { value: '1920', label: '1920px', description: 'Full HD' },
  { value: '2560', label: '2560px', description: '2K' },
  { value: '4096', label: '4096px', description: '4K' }
];

const activeUrls = new Set();
const storedFiles = [];
const conversionLog = [];
const guardMetadata = new WeakMap();
const regenerateDefaultLabel = regenerateBtn ? regenerateBtn.textContent : 'Regenerate';

let isAppReady = false;

function updateResizeDisplay() {
  const index = Number(resizeSlider.value);
  const option = RESIZE_OPTIONS[index];
  
  resizeValue.textContent = option.label;
  
  if (option.value === 'original') {
    resizeInfo.textContent = 'Original size • No resize applied';
  } else {
    resizeInfo.textContent = `Max dimension: ${option.value}px • ${option.description} • Aspect ratio preserved`;
  }
}

function getResizeOption() {
  const index = Number(resizeSlider.value);
  return RESIZE_OPTIONS[index].value;
}

qualityValue.textContent = `${qualitySlider.value}%`;
updateResizeDisplay();
regenerateBtn.hidden = true;
regenerateBtn.disabled = true;

fileInput.addEventListener('change', () => {
  if (!isAppReady) {return;}
  if (fileInput.files?.length) {
    convertFiles(fileInput.files);
    fileInput.value = '';
  }
});

dropzone.addEventListener('dragover', (event) => {
  if (!isAppReady) {return;}
  event.preventDefault();
  dropzone.classList.add('dropzone--active');
});

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('dropzone--active');
});

dropzone.addEventListener('drop', (event) => {
  if (!isAppReady) {return;}
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

resizeSlider.addEventListener('input', () => {
  updateResizeDisplay();
});

clearBtn.addEventListener('click', () => {
  results.innerHTML = '';
  storedFiles.length = 0;
  activeUrls.forEach((url) => URL.revokeObjectURL(url));
  activeUrls.clear();
  conversionLog.length = 0;
  regenerateBtn.textContent = regenerateDefaultLabel;
  regenerateBtn.disabled = true;
  regenerateBtn.hidden = true;
  announce('Cleared converted images.');
});

regenerateBtn.addEventListener('click', async () => {
  if (!isAppReady || !storedFiles.length) {
    return;
  }

  const qualityPercent = Number(qualitySlider.value);
  const quality = qualityPercent / 100;
  const resizeOption = getResizeOption();
  const previousLabel = regenerateBtn.textContent;
  regenerateBtn.disabled = true;
  regenerateBtn.textContent = 'Regenerating...';

  let successCount = 0;
  let rateLimitNotified = false;

  for (const file of storedFiles) {
    if (!hasConversionCapacity()) {
      if (!rateLimitNotified) {
        announce(RATE_LIMIT_MESSAGE);
        rateLimitNotified = true;
      }
      break;
    }

    try {
      await enforcePreConversionGuards(file, resizeOption);
      if (!reserveConversionSlot()) {
        if (!rateLimitNotified) {
          announce(RATE_LIMIT_MESSAGE);
          rateLimitNotified = true;
        }
        break;
      }
      const { width, height, webpBlob, originalInfo } = await convertFile(file, quality);
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
        resize: resizeOption,
      });
      successCount += 1;
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        announce(error.message);
      } else {
        announce(`Could not regenerate ${file.name}.`);
      }
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
  if (!isAppReady) {
    announce('Conversion unavailable in this browser.');
    return;
  }

  const files = Array.from(fileList);
  const qualityPercent = Number(qualitySlider.value);
  const quality = qualityPercent / 100;
  const resizeOption = getResizeOption();

  let rateLimitNotified = false;

  for (const file of files) {
    if (!hasConversionCapacity()) {
      if (!rateLimitNotified) {
        announce(RATE_LIMIT_MESSAGE);
        rateLimitNotified = true;
      }
      break;
    }

    try {
      await enforcePreConversionGuards(file, resizeOption);
      if (!reserveConversionSlot()) {
        if (!rateLimitNotified) {
          announce(RATE_LIMIT_MESSAGE);
          rateLimitNotified = true;
        }
        break;
      }
      const { width, height, webpBlob, originalInfo } = await convertFile(file, quality);
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
        resize: resizeOption,
      });
      addStoredFile(file);
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        announce(error.message);
      } else {
        announce(`Could not convert ${file.name}.`);
      }
      continue;
    }
  }

  if (storedFiles.length) {
    regenerateBtn.hidden = false;
    regenerateBtn.disabled = false;
    regenerateBtn.textContent = regenerateDefaultLabel;
  }
}

async function convertFile(file, quality) {
  const meta = guardMetadata.get(file) || {};
  const { img, width, height, mime } = await loadImage(file);
  const outputWidth = meta.width || width;
  const outputHeight = meta.height || height;
  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Canvas 2D context unavailable.');
  }

  context.drawImage(img, 0, 0, outputWidth, outputHeight);
  const webpBlob = await canvasToBlob(canvas, 'image/webp', quality);

  if (!webpBlob) {
    throw new Error('Browser failed to create WebP blob.');
  }

  const sourceMime = meta.mime || mime || file.type || 'unknown';
  const originalInfo = `${formatBytes(file.size)} • ${sourceMime} • ${outputWidth} × ${outputHeight}`;

  return { width: outputWidth, height: outputHeight, webpBlob, originalInfo };
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ img, width: img.naturalWidth || img.width, height: img.naturalHeight || img.height, mime: file.type });
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

function renderResult({
  displayName, downloadName, webpUrl, webpBlob, webpSize, dimensions, mime, originalInfo, quality, resize
}) {
  const clone = document.importNode(template.content, true);
  const article = clone.querySelector('.result-card');
  const image = clone.querySelector('.result-card__image');
  const name = clone.querySelector('.result-card__name');
  const original = clone.querySelector('.result__original');
  const converted = clone.querySelector('.result__converted');
  const downloadBtn = clone.querySelector('.result__download');
  const copyBtn = clone.querySelector('.result__copy');
  const checksum = clone.querySelector('.result__checksum');

  let copyResetId;
  const qualityLabel = Number.isFinite(quality) ? `Quality ${quality}%` : '';
  const resizeLabel = resize && resize !== 'original' ? `${resize}px` : '';
  let downloadSuffix = '';
  if (Number.isFinite(quality)) {
    downloadSuffix += `-q${quality}`;
  }
  if (resizeLabel) {
    downloadSuffix += `-${resizeLabel}`;
  }

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

  let displayTitle = displayName;
  const displayParts = [];
  if (qualityLabel) {displayParts.push(qualityLabel);}
  if (resizeLabel) {displayParts.push(resizeLabel);}
  if (displayParts.length > 0) {
    displayTitle = `${displayName} (${displayParts.join(', ')})`;
  }

  name.textContent = displayTitle;
  image.alt = `${displayName} preview in WebP format`;
  image.src = webpUrl;
  downloadBtn.href = webpUrl;
  downloadBtn.download = `${downloadName}${downloadSuffix}.webp`;
  original.textContent = originalInfo;
  
  const convertedParts = [formatBytes(webpSize), mime, dimensions];
  if (qualityLabel) {convertedParts.push(qualityLabel);}
  if (resizeLabel) {convertedParts.push(resizeLabel);}
  if (displayParts.length > 0) {
    displayTitle = `${displayName} (${displayParts.join(', ')})`;
  }
  converted.textContent = convertedParts.join(' • ');
  
  checksum.textContent = 'Calculating…';
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
  registerObjectUrlCleanup(article, webpUrl);
  populateChecksum(checksum, webpBlob);
}

function addStoredFile(file) {
  const exists = storedFiles.some(
    (item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified,
  );
  if (!exists) {
    storedFiles.push(file);
  }
}

function hasConversionCapacity() {
  pruneConversionLog(Date.now());
  return conversionLog.length < MAX_CONVERSIONS_PER_WINDOW;
}

function reserveConversionSlot() {
  const now = Date.now();
  pruneConversionLog(now);
  if (conversionLog.length >= MAX_CONVERSIONS_PER_WINDOW) {
    return false;
  }
  conversionLog.push(now);
  return true;
}

function pruneConversionLog(now) {
  while (conversionLog.length && now - conversionLog[0] > RATE_LIMIT_WINDOW_MS) {
    conversionLog.shift();
  }
}

function populateChecksum(targetEl, blob) {
  if (!blob) {
    targetEl.textContent = 'Integrity unavailable';
    return;
  }

  if (
    typeof crypto === 'undefined'
    || !crypto
    || !crypto.subtle
    || typeof targetEl === 'undefined'
    || typeof Worker === 'undefined'
    || typeof URL === 'undefined'
    || typeof Blob === 'undefined'
  ) {
    targetEl.textContent = 'Integrity unavailable';
    return;
  }

  const statusEl = document.createElement('span');
  statusEl.textContent = 'Calculating…';
  targetEl.replaceChildren(statusEl);

  const workerSource = `(${checksumWorker.toString()})();`;
  const workerUrl = URL.createObjectURL(new Blob([workerSource], { type: 'text/javascript' }));
  const worker = new Worker(workerUrl);
  const cleanup = () => {
    worker.terminate();
    URL.revokeObjectURL(workerUrl);
  };

  worker.onmessage = (event) => {
    if (event.data?.type === 'result') {
      targetEl.textContent = `SHA-256: ${event.data.hash.substring(0, 32)}…`;
    } else if (event.data?.type === 'error') {
      console.error(event.data.error);
      targetEl.textContent = 'Integrity unavailable';
    }
    cleanup();
  };

  worker.onerror = (event) => {
    console.error(event.message || event);
    targetEl.textContent = 'Integrity unavailable';
    cleanup();
  };

  worker.postMessage({ blob });
}

function checksumWorker() {
  self.onmessage = async (event) => {
    const { blob } = event.data || {};
    if (!blob) {
      self.postMessage({ type: 'error', error: 'Missing blob' });
      return;
    }

    try {
      const buffer = await blob.arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256', buffer);
      const hash = Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
      self.postMessage({ type: 'result', hash });
    } catch (error) {
      self.postMessage({ type: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };
}

async function enforcePreConversionGuards(file, resizeOption = 'original') {
  // Validate file size
  const sizeValidation = validateFileSize(file.size);
  if (!sizeValidation.valid) {
    throw new Error(`${file.name} skipped (${sizeValidation.reason}).`);
  }

  // Detect and validate MIME type
  let trustedMime = null;
  try {
    trustedMime = await detectMimeType(file);
  } catch (error) {
    console.error(error);
  }

  const mimeValidation = validateMimeType(trustedMime);
  if (!mimeValidation.valid) {
    throw new Error(`${file.name} skipped (${mimeValidation.reason}).`);
  }

  // Read and validate image dimensions
  const { width, height } = await readImageDimensions(file);
  const dimensionValidation = validateImageDimensions(width, height);
  if (!dimensionValidation.valid) {
    throw new Error(`${file.name} skipped (${dimensionValidation.reason}).`);
  }

  // Calculate smart resize dimensions
  const { outputWidth, outputHeight } = calculateResizeDimensions(width, height, resizeOption);

  guardMetadata.set(file, { mime: trustedMime, width: outputWidth, height: outputHeight });
  return { trustedMime, width: outputWidth, height: outputHeight };
}


function registerObjectUrlCleanup(element, url) {
  if (!url || !element) {
    return;
  }

  let observer;

  const cleanup = () => {
    if (activeUrls.has(url)) {
      URL.revokeObjectURL(url);
      activeUrls.delete(url);
    }
    if (observer) {
      observer.disconnect();
      observer = undefined;
    }
  };

  observer = new MutationObserver(() => {
    if (!document.body.contains(element)) {
      cleanup();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

}

async function readImageDimensions(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 0, height: 0 });
    };
    img.src = url;
  });
}

function isClipboardFileSupported() {
  return typeof navigator !== 'undefined'
    && navigator.clipboard
    && typeof navigator.clipboard.write === 'function'
    && typeof window !== 'undefined'
    && typeof window.ClipboardItem === 'function';
}

async function initializeApp() {
  const support = await checkFeatureSupport();
  if (!support.ok) {
    disableApp(support.reason);
    return;
  }

  isAppReady = true;
  if (supportMessage) {
    supportMessage.textContent = 'Ready to convert. A light rate limit protects your browser.';
    supportMessage.classList.remove('support-message--error');
  }
}

async function checkFeatureSupport() {
  const canvas = document.createElement('canvas');
  if (!canvas || typeof canvas.getContext !== 'function') {
    return { ok: false, reason: 'Canvas is not supported in this browser.' };
  }

  if (typeof canvas.toBlob !== 'function') {
    return { ok: false, reason: 'Canvas toBlob is not supported in this browser.' };
  }

  let supportsWebP = false;
  try {
    const dataUrl = canvas.toDataURL('image/webp');
    supportsWebP = typeof dataUrl === 'string' && dataUrl.startsWith('data:image/webp');
  } catch {
    supportsWebP = false;
  }

  if (!supportsWebP) {
    return { ok: false, reason: 'WebP generation is not supported in this browser.' };
  }

  return { ok: true };
}

function disableApp(reason) {
  isAppReady = false;
  fileInput.disabled = true;
  qualitySlider.disabled = true;
  clearBtn.disabled = true;
  regenerateBtn.disabled = true;
  regenerateBtn.hidden = true;
  dropzone.classList.add('dropzone--disabled');
  dropzone.setAttribute('aria-disabled', 'true');

  if (supportMessage) {
    supportMessage.textContent = reason;
    supportMessage.classList.add('support-message--error');
  }

  results.innerHTML = '';
  const warning = document.createElement('p');
  warning.className = 'support-message support-message--error';
  warning.textContent = reason;
  results.append(warning);
}

// Ensure keyboard focus works for dropzone label
dropzone.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    fileInput.click();
  }
});

// Paste support for images
document.addEventListener('paste', async (event) => {
  if (!isAppReady) {return;}
  
  const items = event.clipboardData?.items;
  if (!items) {return;}
  
  const imageFiles = [];
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    // Check if the item is an image
    if (item.type.startsWith('image/')) {
      event.preventDefault(); // Prevent default paste behavior
      
      const file = item.getAsFile();
      if (file) {
        imageFiles.push(file);
      }
    }
  }
  
  if (imageFiles.length > 0) {
    announce(`Pasted ${imageFiles.length} image${imageFiles.length === 1 ? '' : 's'}`);
    convertFiles(imageFiles);
  }
});

// Theme toggle functionality
function initTheme() {
  // Check for saved theme preference or default to light mode
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
}

// Initialize theme before app loads
initTheme();

// Add theme toggle listener
if (themeToggle) {
  themeToggle.addEventListener('click', toggleTheme);
}

initializeApp().catch((error) => {
  console.error(error);
  disableApp('Unexpected error during initialization.');
});
