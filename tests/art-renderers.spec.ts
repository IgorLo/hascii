import { expect, type Page, test } from '@playwright/test';

async function controls(page: Page, section: string) {
  const close = page.getByRole('button', { name: 'Показать результат', exact: true });
  if (await close.isVisible()) await close.click();
  const trigger = page.locator(`[data-tool="${section}"]`);
  if (await trigger.isVisible()) await trigger.click();
}
async function closeControls(page: Page) {
  const close = page.getByRole('button', { name: 'Показать результат', exact: true });
  if (await close.isVisible()) await close.click();
}
async function ready(page: Page) {
  await expect(page.locator('#export')).toBeEnabled({ timeout: 30000 });
  await expect(page.locator('#error')).toBeEmpty();
}

test('new renderers and blue noise work locally, accept controls and export a PNG', async ({
  page,
}) => {
  const errors: string[] = [];
  const imageRequests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (request.method() === 'POST') imageRequests.push(request.url());
  });
  await page.goto('/');
  await ready(page);
  await page.locator('[data-mode="pixels"]').click();
  await controls(page, 'color');
  await page.locator('#dither').selectOption('blue-noise');
  await closeControls(page);
  await ready(page);
  await expect(page.locator('#recipe')).toContainText('blue-noise');

  await page.locator('[data-mode="halftone"]').click();
  await controls(page, 'ascii');
  await page.locator('#halftoneColor').selectOption('duotone');
  await page.locator('#halftoneSize').fill('16');
  await page.locator('#halftoneOffsetX').fill('4');
  await closeControls(page);
  await ready(page);
  await expect(page.locator('#recipe')).toContainText('две краски');
  await expect(page.locator('#recipe')).toContainText('16 px');

  await page.locator('[data-mode="pixel-art"]').click();
  await controls(page, 'ascii');
  await page.locator('#artColumns').fill('32');
  await page.locator('#artColors').fill('6');
  await closeControls(page);
  await ready(page);
  await expect(page.locator('#recipe')).toContainText('32 ×');
  await expect(page.locator('#recipe')).toContainText('до 6 цветов');

  await page.locator('[data-mode="halftone"]').click();
  await controls(page, 'ascii');
  await expect(page.locator('#halftoneColor')).toHaveValue('duotone');
  await expect(page.locator('#halftoneSize')).toHaveValue('16');
  await expect(page.locator('#halftoneOffsetX')).toHaveValue('4');
  await closeControls(page);
  await page.locator('[data-mode="pixel-art"]').click();
  await controls(page, 'ascii');
  await expect(page.locator('#artColumns')).toHaveValue('32');
  await expect(page.locator('#artColors')).toHaveValue('6');
  await closeControls(page);
  await ready(page);

  const downloadReady = page.waitForEvent('download');
  await page.locator('#export').click();
  const download = await downloadReady;
  const stream = await download.createReadStream();
  if (!stream) throw new Error('Missing PNG export');
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const png = Buffer.concat(chunks);
  expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  expect(png.length).toBeGreaterThan(500);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(errors).toEqual([]);
  expect(imageRequests).toEqual([]);
});
