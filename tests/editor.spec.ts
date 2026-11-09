import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#export')).toBeEnabled({ timeout: 20000 });
});

test('all rendering modes, presets and preview layouts work', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await expect(page).toHaveTitle(/hascii/);
  for (const mode of ['ascii', 'overlay', 'pixels']) {
    await page.locator(`[data-mode="${mode}"]`).click();
    await expect(page.locator('#export')).toBeEnabled();
    await expect(page.locator('#error')).toBeEmpty();
    await expect(page.locator('#outputInfo')).toHaveText('751 × 900');
  }
  for (const preset of ['ascii', 'soft', 'gameboy', 'neon']) {
    await page.locator(`[data-preset="${preset}"]`).click();
    await expect(page.locator('#export')).toBeEnabled();
    await expect(page.locator('#error')).toBeEmpty();
  }
  await page.locator('[data-view="result"]').click();
  await expect(page.locator('#original')).toBeHidden();
  await page.locator('[data-view="stack"]').click();
  await expect(page.locator('#original')).toBeVisible();
  expect(errors).toEqual([]);
});

test('settings, empty-alphabet recovery and persistence', async ({ page }) => {
  await page.locator('[data-mode="ascii"]').click();
  await expect(page.locator('#pixelSize')).toBeDisabled();
  await page.locator('#allowEmpty').uncheck();
  await page.locator('#chars').fill('');
  await expect(page.locator('#error')).toContainText('Добавьте хотя бы один символ');
  await expect(page.locator('#export')).toBeDisabled();
  await page.locator('#chars').fill('+#@');
  await expect(page.locator('#export')).toBeEnabled();
  await page.locator('#matching').selectOption('shape');
  await expect(page.locator('#shapeWeight')).toBeEnabled();
  await page.locator('#resolution').selectOption('600');
  await expect(page.locator('#outputInfo')).toHaveText('501 × 600');
  await page.locator('[data-mode="overlay"]').click();
  await page.locator('#backgroundOpacity').fill('0');
  await page.locator('#opacity').fill('1');
  await expect(page.locator('#export')).toBeEnabled();
  await page.reload();
  await expect(page.locator('#chars')).toHaveValue('+#@');
});

test('imports and persists a palette and recovers from import errors', async ({ page }) => {
  await page.route('**/api/palette/test-palette', (route) =>
    route.fulfill({
      json: { name: 'Test Palette', author: 'Test', colors: ['000000', 'ffffff', 'aa2244'] },
    }),
  );
  await page.locator('#paletteUrl').fill('https://lospec.com/palette-list/test-palette');
  await page.locator('#import').click();
  await expect(page.locator('#importStatus')).toContainText('Добавлена');
  await expect(page.locator('#palette')).toHaveValue('test-palette');
  await page.reload();
  await expect(page.locator('#palette option[value="test-palette"]')).toHaveCount(1);
  await page.locator('#paletteUrl').fill('https://example.com/wrong');
  await page.locator('#import').click();
  await expect(page.locator('#importStatus')).toContainText('lospec.com');
  await expect(page.locator('#import')).toBeEnabled();
});

test('uploads an image and exports a real PNG', async ({ page }) => {
  await page.locator('#file').setInputFiles('static/sample.png');
  await expect(page.locator('#export')).toBeEnabled();
  const downloadReady = page.waitForEvent('download');
  await page.locator('#export').click();
  const download = await downloadReady;
  expect(download.suggestedFilename()).toBe('sample-hascii.png');
  const stream = await download.createReadStream();
  if (!stream) throw new Error('Missing exported PNG');
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const png = Buffer.concat(chunks);
  expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([751, 900]);
});

test('invalid image does not destroy editor and viewport does not overflow', async ({ page }) => {
  await page
    .locator('#file')
    .setInputFiles({ name: 'bad.png', mimeType: 'image/png', buffer: Buffer.from('not an image') });
  await expect(page.locator('#error')).toContainText('Не удалось открыть');
  await page.locator('#sample').click();
  await expect(page.locator('#export')).toBeEnabled();
  await expect(page.locator('#error')).toBeEmpty();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  expect(overflow).toBe(false);
});
