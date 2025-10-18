# Just Image Converter

Convert JPG and PNG images to modern WebP files—fast, private, and right in your browser. The app runs entirely on the client, so nothing ever leaves your device.

## Features
- Drag-and-drop uploads with fallback file picker
- Adjustable WebP quality slider (50–100)
- Regenerate conversions at new quality levels without re-uploading
- Download-ready WebP files and one-click clipboard sharing
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

Wait 1-2 minutes for the build to complete. Check deployment status under **Actions** tab.
