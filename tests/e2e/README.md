# End-to-End Tests

This directory contains Playwright end-to-end tests for the image converter application.

## ⚠️ Note on File Naming

E2E test files use the `.e2e.js` extension (not `.spec.js` or `.test.js`) to prevent Bun's test runner from trying to execute them. Playwright is configured to find `*.e2e.js` files.

## Tests Coverage

The test suite covers:

### Format Conversion Tests
- ✅ Convert PNG to WebP
- ✅ Convert PNG to PNG (lossless)
- ✅ Convert PNG to JPG
- ✅ Format selector UI interactions
- ✅ Quality slider behavior per format

### Quality Settings Tests
- ✅ Quality slider respects different values (50%, 75%, 100%)
- ✅ Quality is applied to WebP conversions
- ✅ Quality is applied to JPG conversions
- ✅ Quality is NOT applied to PNG (lossless) conversions
- ✅ Download filenames include quality suffix

### Browser Compatibility Tests
- ✅ Tests run across Chromium, Firefox, and WebKit
- ✅ Format support detection per browser
- ✅ Quality levels work across different browsers

### Feature Tests
- ✅ File upload via file input
- ✅ Drag and drop file upload
- ✅ Multiple file uploads
- ✅ Regenerate with different settings
- ✅ Clear all results
- ✅ Image preview display
- ✅ Checksum/integrity calculation
- ✅ Resize options

### Mobile Tests
- ✅ Mobile viewport (Pixel 5, iPhone 12)
- ✅ Touch interactions
- ✅ Responsive layout

## Running Tests

### Run all tests (all browsers)
```bash
bun run test:e2e
```

### Run tests with UI mode (interactive)
```bash
bun run test:e2e:ui
```

### Run tests in headed mode (see browser)
```bash
bun run test:e2e:headed
```

### Run tests for specific browser
```bash
bun run test:e2e:chromium   # Chrome/Edge
bun run test:e2e:firefox    # Firefox
bun run test:e2e:webkit     # Safari
```

### Debug tests
```bash
bun run test:e2e:debug
```

### Run both unit and E2E tests
```bash
bun run test:all
```

## Test Structure

- `conversion.e2e.js` - Main test suite for format conversion and quality settings

## Prerequisites

- Playwright browsers must be installed: `bunx playwright install`
- Dev server runs automatically before tests (configured in `playwright.config.js`)
- Test fixture image: `tests/fixtures/sample.png`

## CI/CD

The test suite is configured to:
- Retry failed tests 2 times on CI
- Run tests in serial on CI (for stability)
- Skip tests with `.only` on CI
- Generate HTML reports

## Browser Support Matrix

| Browser  | WebP | PNG | JPG | Notes |
|----------|------|-----|-----|-------|
| Chromium | ✅   | ✅  | ✅  | Full support |
| Firefox  | ✅   | ✅  | ✅  | Full support |
| WebKit   | ✅   | ✅  | ✅  | Full support |

## Troubleshooting

### Tests timeout
- Increase timeout in test: `{ timeout: 30000 }`
- Check if dev server is running on port 3000

### File upload fails
- Ensure `tests/fixtures/sample.png` exists
- Check file permissions

### Browser not installed
```bash
bunx playwright install
```

### View test report
```bash
bunx playwright show-report
```

### Bun test picks up E2E tests
E2E tests use `.e2e.js` extension to avoid conflicts with Bun's test runner. If you rename them to `.spec.js` or `.test.js`, Bun will try to run them and fail.
