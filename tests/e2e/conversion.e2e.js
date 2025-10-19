import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

test.describe('Image Conversion', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Wait for app to be ready
    await expect(page.locator('#support-message')).toContainText('Ready to convert');
  });

  test('should load the page successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Just Image Converter/);
    await expect(page.locator('h1')).toContainText('Convert images to WebP, PNG, or JPG');
  });

  test('should have all three format buttons visible', async ({ page }) => {
    await expect(page.locator('#format-webp')).toBeVisible();
    await expect(page.locator('#format-png')).toBeVisible();
    await expect(page.locator('#format-jpeg')).toBeVisible();
  });

  test('should have WebP selected by default', async ({ page }) => {
    const webpButton = page.locator('#format-webp');
    await expect(webpButton).toHaveClass(/format-btn--active/);
    await expect(page.locator('#format-value')).toContainText('WebP');
    await expect(page.locator('#format-info')).toContainText('Best compression');
  });

  test('should switch formats when clicking format buttons', async ({ page }) => {
    // Click PNG button
    await page.locator('#format-png').click();
    await expect(page.locator('#format-png')).toHaveClass(/format-btn--active/);
    await expect(page.locator('#format-value')).toContainText('PNG');
    await expect(page.locator('#format-info')).toContainText('Lossless');

    // Click JPG button
    await page.locator('#format-jpeg').click();
    await expect(page.locator('#format-jpeg')).toHaveClass(/format-btn--active/);
    await expect(page.locator('#format-value')).toContainText('JPG');
    await expect(page.locator('#format-info')).toContainText('Wide compatibility');

    // Click WebP button again
    await page.locator('#format-webp').click();
    await expect(page.locator('#format-webp')).toHaveClass(/format-btn--active/);
    await expect(page.locator('#format-value')).toContainText('WebP');
  });

  test('should disable quality slider for PNG format', async ({ page }) => {
    const qualitySlider = page.locator('#quality');
    
    // WebP should have quality enabled
    await expect(qualitySlider).toBeEnabled();
    
    // Switch to PNG
    await page.locator('#format-png').click();
    await expect(qualitySlider).toBeDisabled();
    
    // Switch to JPG
    await page.locator('#format-jpeg').click();
    await expect(qualitySlider).toBeEnabled();
  });

  test('should convert PNG to WebP', async ({ page }) => {
    const testImagePath = join(process.cwd(), 'tests/fixtures/sample.png');
    
    // Upload file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('#file-input').evaluate((input) => input.click());
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(testImagePath);

    // Wait for conversion to complete
    await expect(page.locator('.result-card')).toBeVisible({ timeout: 10000 });
    
    // Check that result is displayed
    await expect(page.locator('.result-card__name')).toContainText('sample');
    await expect(page.locator('.result__converted')).toContainText('image/webp');
    
    // Check download button exists and has correct extension
    const downloadBtn = page.locator('.result__download').first();
    await expect(downloadBtn).toBeVisible();
    const downloadAttr = await downloadBtn.getAttribute('download');
    expect(downloadAttr).toContain('.webp');
  });

  test('should convert PNG to PNG', async ({ page }) => {
    const testImagePath = join(process.cwd(), 'tests/fixtures/sample.png');
    
    // Select PNG format
    await page.locator('#format-png').click();
    
    // Upload file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('#file-input').evaluate((input) => input.click());
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(testImagePath);

    // Wait for conversion to complete
    await expect(page.locator('.result-card')).toBeVisible({ timeout: 10000 });
    
    // Check that result is PNG
    await expect(page.locator('.result__converted')).toContainText('image/png');
    
    // Check download button has PNG extension
    const downloadBtn = page.locator('.result__download').first();
    const downloadAttr = await downloadBtn.getAttribute('download');
    expect(downloadAttr).toContain('.png');
  });

  test('should convert PNG to JPG', async ({ page }) => {
    const testImagePath = join(process.cwd(), 'tests/fixtures/sample.png');
    
    // Select JPG format
    await page.locator('#format-jpeg').click();
    
    // Upload file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('#file-input').evaluate((input) => input.click());
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(testImagePath);

    // Wait for conversion to complete
    await expect(page.locator('.result-card')).toBeVisible({ timeout: 10000 });
    
    // Check that result is JPG
    await expect(page.locator('.result__converted')).toContainText('image/jpeg');
    
    // Check download button has JPG extension
    const downloadBtn = page.locator('.result__download').first();
    const downloadAttr = await downloadBtn.getAttribute('download');
    expect(downloadAttr).toContain('.jpg');
  });

  test('should respect quality settings for WebP', async ({ page }) => {
    const testImagePath = join(process.cwd(), 'tests/fixtures/sample.png');
    
    // Set quality to 50%
    await page.locator('#quality').fill('50');
    await expect(page.locator('#quality-value')).toContainText('50%');
    
    // Upload file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('#file-input').evaluate((input) => input.click());
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(testImagePath);

    // Wait for conversion to complete
    await expect(page.locator('.result-card')).toBeVisible({ timeout: 10000 });
    
    // Check that quality is mentioned in the result
    await expect(page.locator('.result__converted')).toContainText('Quality 50%');
    
    // Check download filename includes quality
    const downloadBtn = page.locator('.result__download').first();
    const downloadAttr = await downloadBtn.getAttribute('download');
    expect(downloadAttr).toContain('-q50');
  });

  test('should respect quality settings for JPG', async ({ page }) => {
    const testImagePath = join(process.cwd(), 'tests/fixtures/sample.png');
    
    // Select JPG format
    await page.locator('#format-jpeg').click();
    
    // Set quality to 75%
    await page.locator('#quality').fill('75');
    await expect(page.locator('#quality-value')).toContainText('75%');
    
    // Upload file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('#file-input').evaluate((input) => input.click());
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(testImagePath);

    // Wait for conversion to complete
    await expect(page.locator('.result-card')).toBeVisible({ timeout: 10000 });
    
    // Check that quality is mentioned in the result
    await expect(page.locator('.result__converted')).toContainText('Quality 75%');
  });

  test('should NOT show quality in PNG conversion', async ({ page }) => {
    const testImagePath = join(process.cwd(), 'tests/fixtures/sample.png');
    
    // Select PNG format
    await page.locator('#format-png').click();
    
    // Upload file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('#file-input').evaluate((input) => input.click());
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(testImagePath);

    // Wait for conversion to complete
    await expect(page.locator('.result-card')).toBeVisible({ timeout: 10000 });
    
    // Check that quality is NOT mentioned (PNG is lossless)
    const convertedText = await page.locator('.result__converted').textContent();
    expect(convertedText).not.toContain('Quality');
  });

  test('should regenerate with different format', async ({ page }) => {
    const testImagePath = join(process.cwd(), 'tests/fixtures/sample.png');
    
    // Upload file with WebP format
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('#file-input').evaluate((input) => input.click());
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(testImagePath);

    // Wait for first conversion
    await expect(page.locator('.result-card')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.result__converted').first()).toContainText('image/webp');
    
    // Change format to PNG
    await page.locator('#format-png').click();
    
    // Click regenerate button
    await expect(page.locator('#regenerate-btn')).toBeVisible();
    await page.locator('#regenerate-btn').click();
    
    // Wait for regeneration
    await page.waitForTimeout(1000);
    
    // Check that new result is PNG
    const results = page.locator('.result-card');
    const count = await results.count();
    expect(count).toBeGreaterThanOrEqual(2); // Should have both old and new results
    
    // Last result should be PNG
    await expect(results.last().locator('.result__converted')).toContainText('image/png');
  });

  test('should clear all results', async ({ page }) => {
    const testImagePath = join(process.cwd(), 'tests/fixtures/sample.png');
    
    // Upload file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('#file-input').evaluate((input) => input.click());
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(testImagePath);

    // Wait for conversion
    await expect(page.locator('.result-card')).toBeVisible({ timeout: 10000 });
    
    // Click clear button
    await page.locator('#clear-btn').click();
    
    // Check that results are cleared
    await expect(page.locator('.result-card')).not.toBeVisible();
  });

  test('should display image preview', async ({ page }) => {
    const testImagePath = join(process.cwd(), 'tests/fixtures/sample.png');
    
    // Upload file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('#file-input').evaluate((input) => input.click());
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(testImagePath);

    // Wait for conversion
    await expect(page.locator('.result-card')).toBeVisible({ timeout: 10000 });
    
    // Check that image preview is displayed
    const image = page.locator('.result-card__image').first();
    await expect(image).toBeVisible();
    
    // Check that image has loaded (has src attribute)
    const src = await image.getAttribute('src');
    expect(src).toContain('blob:');
  });

  test('should show checksum/integrity', async ({ page }) => {
    const testImagePath = join(process.cwd(), 'tests/fixtures/sample.png');
    
    // Upload file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('#file-input').evaluate((input) => input.click());
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(testImagePath);

    // Wait for conversion
    await expect(page.locator('.result-card')).toBeVisible({ timeout: 10000 });
    
    // Wait for checksum calculation
    await page.waitForTimeout(2000);
    
    // Check that checksum is displayed
    const checksum = page.locator('.result__checksum').first();
    const checksumText = await checksum.textContent();
    
    // Should show SHA-256 hash or be calculating
    expect(checksumText).toMatch(/SHA-256|Calculating|Integrity/);
  });

  test('should handle drag and drop upload', async ({ page }) => {
    const testImagePath = join(process.cwd(), 'tests/fixtures/sample.png');
    const buffer = readFileSync(testImagePath);
    
    // Create a data transfer
    const dataTransfer = await page.evaluateHandle((data) => {
      const dt = new DataTransfer();
      const file = new File([new Uint8Array(data)], 'sample.png', { type: 'image/png' });
      dt.items.add(file);
      return dt;
    }, Array.from(buffer));

    // Trigger drop event
    await page.locator('#dropzone').dispatchEvent('drop', { dataTransfer });

    // Wait for conversion
    await expect(page.locator('.result-card')).toBeVisible({ timeout: 10000 });
    
    // Check that result is displayed
    await expect(page.locator('.result-card__name')).toContainText('sample');
  });

  test('should handle multiple file uploads', async ({ page }) => {
    const testImagePath = join(process.cwd(), 'tests/fixtures/sample.png');
    
    // Upload same file twice to test multiple files
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('#file-input').evaluate((input) => input.click());
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles([testImagePath, testImagePath]);

    // Wait for conversions
    await page.waitForTimeout(2000);
    
    // Should have at least 2 result cards
    const results = page.locator('.result-card');
    const count = await results.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('should handle resize options', async ({ page }) => {
    const testImagePath = join(process.cwd(), 'tests/fixtures/sample.png');
    
    // Set resize to 512px (index 5 in the RESIZE_OPTIONS)
    await page.locator('#resize').fill('5');
    await expect(page.locator('#resize-value')).toContainText('512px');
    
    // Upload file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('#file-input').evaluate((input) => input.click());
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(testImagePath);

    // Wait for conversion
    await expect(page.locator('.result-card')).toBeVisible({ timeout: 10000 });
    
    // Check that resize is mentioned in the result
    await expect(page.locator('.result__converted')).toContainText('512px');
  });
});

test.describe('Browser Compatibility', () => {
  test('should detect format support', async ({ page, browserName }) => {
    await page.goto('/');
    
    // Wait for app to be ready
    await expect(page.locator('#support-message')).toContainText('Ready to convert');
    
    // All modern browsers should support at least some formats
    const webpButton = page.locator('#format-webp');
    const pngButton = page.locator('#format-png');
    const jpgButton = page.locator('#format-jpeg');
    
    // PNG and JPG should be supported in all browsers
    await expect(pngButton).toBeEnabled();
    await expect(jpgButton).toBeEnabled();
    
    // WebP support varies by browser/version, but most modern ones support it
    if (browserName === 'chromium' || browserName === 'webkit') {
      await expect(webpButton).toBeEnabled();
    }
  });

  test('should work with different quality levels across browsers', async ({ page }) => {
    const testImagePath = join(process.cwd(), 'tests/fixtures/sample.png');
    
    // Test with different quality levels
    const qualities = ['50', '75', '100'];
    
    for (const quality of qualities) {
      await page.locator('#quality').fill(quality);
      
      // Upload file
      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.locator('#file-input').evaluate((input) => input.click());
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(testImagePath);

      // Wait for conversion
      await expect(page.locator('.result-card').last()).toBeVisible({ timeout: 10000 });
      
      // Clear for next iteration
      await page.locator('#clear-btn').click();
      await page.waitForTimeout(500);
    }
  });
});

test.describe('Mobile Viewport', () => {
  test('should work on mobile viewport', async ({ page }) => {
    const testImagePath = join(process.cwd(), 'tests/fixtures/sample.png');
    
    await page.goto('/');
    await expect(page.locator('#support-message')).toContainText('Ready to convert');
    
    // Check that format buttons are visible on mobile
    await expect(page.locator('#format-webp')).toBeVisible();
    await expect(page.locator('#format-png')).toBeVisible();
    await expect(page.locator('#format-jpeg')).toBeVisible();
    
    // Test conversion on mobile
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('#file-input').evaluate((input) => input.click());
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(testImagePath);

    await expect(page.locator('.result-card')).toBeVisible({ timeout: 10000 });
  });
});

