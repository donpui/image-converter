# Just Image Converter

[![Tests](https://github.com/donpui/image-converter/actions/workflows/tests.yml/badge.svg)](https://github.com/donpui/image-converter/actions/workflows/tests.yml)
[![Playwright Tests](https://github.com/donpui/image-converter/actions/workflows/playwright.yml/badge.svg)](https://github.com/donpui/image-converter/actions/workflows/playwright.yml)

Convert JPG, PNG to WebP, PNG, or JPG—fast, private, and right in your browser. The app runs entirely on the client, so nothing ever leaves your device. 

## Features
- **Multiple Output Formats**: Choose between WebP, PNG, or JPG
- **Smart Format Detection**: Automatically detects browser support and disables unsupported formats
- Drag-and-drop uploads with fallback file picker
- Adjustable quality slider (50–100) for lossy formats (WebP, JPG)
- Regenerate conversions at new quality levels without re-uploading
- Download-ready files and one-click clipboard sharing
- Built-in 50 MB per-file upload limit to keep things lightweight
- Dimension guardrails (up to 20,000×20,000) plus MIME validation to block unsafe uploads
- Client-side rate limiting, feature detection, and integrity hashes to keep browsers responsive
- Explicit privacy notice confirming no server-side processing

## Quick Start
```bash
# serve locally with Bun (recommended)
bun start
# then open http://localhost:3000 in your browser

# alternative: use any static file server
python3 -m http.server 8000
```

## Development

### Linting
```bash
bun run lint        # check for code quality issues
bun run lint:fix    # auto-fix issues where possible
```

### Testing
```bash
bun install  # only needed once
bun test     # runs unit tests
```


```bash
# Run all tests (all browsers)
bun run test:e2e

# Interactive UI mode (recommended for development)
bun run test:e2e:ui

# Run with browser visible (headed mode)
bun run test:e2e:headed

# Run specific browser
bun run test:e2e:chromium
bun run test:e2e:firefox
bun run test:e2e:webkit

# Debug mode (step through tests)
bun run test:e2e:debug

# Run all tests (unit + E2E)
bun run test:all
```

## Deploy to GitHub Pages

### Deploy Updates
```bash
# commit your changes
git add .
git commit -m "Your update message"

# push to main (triggers automatic deployment)
git push origin main
```

### Deploy GH pages
```bash
git switch gh-pages
git merge main
git push origin gh-pages
```

### Notes

Canvas API: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
Format support: https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types
