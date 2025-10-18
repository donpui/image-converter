# Just Image Converter

Convert JPG and PNG images to modern WebP files—fast, private, and right in your browser. The app runs entirely on the client, so nothing ever leaves your device.

## Features
- Drag-and-drop uploads with fallback file picker
- Adjustable WebP quality slider (50–100)
- Regenerate conversions at new quality levels without re-uploading
- Download-ready WebP files and one-click clipboard sharing
- Built-in 20 MB per-file upload limit to keep things lightweight
- Dimension guardrails (up to 8,000×8,000) plus MIME validation to block unsafe uploads
- Client-side rate limiting, feature detection, and integrity hashes to keep browsers responsive
- Explicit privacy notice confirming no server-side processing

## Quick Start
```bash
# install dependencies (none required)

# serve locally (any static file server works)
python3 -m http.server 8000
# then open http://localhost:8000 in your browser
```

## Testing
```bash
npm ci
npx playwright install --with-deps
npm test
```

## Deploy to GitHub Pages
```bash
# ensure your changes are committed
git push origin main

# publish (already configured for this repo)
git push origin gh-pages
```

GitHub Pages will host the site at: `https://donpui.github.io/image-converter/`
