const { test, expect } = require('@playwright/test');
const path = require('path');

const fixturesDir = path.join(__dirname, 'fixtures');

test.describe('Just Image Converter', () => {
  test('converts image and shows download link', async ({ page }) => {
    await page.goto('/index.html');

    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(path.join(fixturesDir, 'sample.png'));

    const result = page.locator('.result').first();
    await expect(result).toBeVisible();
    await expect(result.locator('.result__name')).toHaveText(/sample/i);
    await expect(result.locator('.result__converted')).toContainText('Quality 90%');
    await expect(result.locator('.result__checksum')).toContainText('SHA-256:');

    const downloadHref = await result.locator('.result__download').getAttribute('href');
    expect(downloadHref).toBeTruthy();
    expect(downloadHref).toContain('blob:');
  });

  test('regenerates at new quality without re-uploading', async ({ page }) => {
    await page.goto('/index.html');

    const slider = page.locator('#quality');
    const fileInput = page.locator('#file-input');

    await fileInput.setInputFiles(path.join(fixturesDir, 'sample.png'));
    await expect(page.locator('.result')).toHaveCount(1);

    await slider.evaluate((el) => {
      el.value = '95';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const regenerate = page.locator('#regenerate-btn');
    await regenerate.click();

    const results = page.locator('.result');
    await expect(results).toHaveCount(2);
    await expect(results.nth(1).locator('.result__converted')).toContainText('Quality 95%');
    await expect(results.nth(1).locator('.result__checksum')).toContainText('SHA-256:');
  });
});
