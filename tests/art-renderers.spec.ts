import { expect, type Page, test } from '@playwright/test';

import {
  closeTools as closeControls,
  expectRange,
  selectMode,
  setRange,
  tools as controls,
} from './helpers/editor';

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
  await selectMode(page, 'pixels');
  await controls(page, 'color');
  await page.locator('#dither').selectOption('blue-noise');
  await closeControls(page);
  await ready(page);
  await expect(page.locator('#recipe')).toContainText('blue-noise');

  await selectMode(page, 'halftone');
  await controls(page, 'color');
  await page.locator('#halftoneColor').selectOption('duotone');
  await controls(page, 'style');
  await setRange(page, 'halftoneSize', '16');
  await setRange(page, 'halftoneOffsetX', '4');
  await closeControls(page);
  await ready(page);
  await expect(page.locator('#recipe')).toContainText('две краски');
  await expect(page.locator('#recipe')).toContainText('16 px');

  await selectMode(page, 'pixel-art');
  await controls(page, 'style');
  await setRange(page, 'artColumns', '32');
  await controls(page, 'color');
  await setRange(page, 'artColors', '6');
  await closeControls(page);
  await ready(page);
  await expect(page.locator('#recipe')).toContainText('32 ×');
  await expect(page.locator('#recipe')).toContainText('до 6 цветов');

  await selectMode(page, 'halftone');
  await controls(page, 'color');
  await expect(page.locator('#halftoneColor')).toHaveValue('duotone');
  await controls(page, 'style');
  await expectRange(page, 'halftoneSize', '16');
  await expectRange(page, 'halftoneOffsetX', '4');
  await closeControls(page);
  await selectMode(page, 'pixel-art');
  await controls(page, 'style');
  await expectRange(page, 'artColumns', '32');
  await controls(page, 'color');
  await expectRange(page, 'artColors', '6');
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
