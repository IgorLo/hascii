import { readFile } from 'node:fs/promises';

import { Canvas } from '@napi-rs/canvas';
import { expect, type Page, test } from '@playwright/test';

async function closeTools(page: Page) {
  const close = page.getByRole('button', { name: 'Показать результат', exact: true });
  if (await close.isVisible()) await close.click();
}

async function tools(page: Page, section: string) {
  await closeTools(page);
  const trigger = page.locator(`[data-tool="${section}"]`);
  if (await trigger.isVisible()) await trigger.click();
}

async function preview(page: Page, value: string) {
  await closeTools(page);
  const select = page.getByRole('combobox', { name: 'Расположение превью' });
  if (await select.isVisible()) await select.selectOption(value);
  else await page.locator(`[data-view="${value}"]`).click();
}

async function uploadWithoutMime(page: Page, name: string, buffer: Buffer) {
  // setInputFiles infers a MIME type from the extension, so supply the exact
  // File metadata a phone file picker can produce through the native input.
  await page.locator('#file').evaluate(
    (element, file) => {
      const bytes = Uint8Array.from(atob(file.base64), (character) => character.charCodeAt(0));
      const transfer = new DataTransfer();
      transfer.items.add(new File([bytes], file.name, { type: '' }));
      (element as HTMLInputElement).files = transfer.files;
      element.dispatchEvent(new Event('change', { bubbles: true }));
    },
    { name, base64: buffer.toString('base64') },
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#export')).toBeEnabled({ timeout: 20000 });
});

test('cell-fill overlay keeps ASCII unchanged at zero and locks the pixel grid', async ({
  page,
}) => {
  await page.locator('[data-mode="ascii"]').click();
  await expect(page.locator('#export')).toBeEnabled();
  const original = await page
    .locator('#result')
    .evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
  await page.locator('[data-mode="overlay"]').click();
  await tools(page, 'tone');
  await expect(page.locator('#pixelSize')).toBeDisabled();
  await expect(page.locator('#pixelate')).toBeDisabled();
  await tools(page, 'ascii');
  await expect(page.locator('#blur')).toBeDisabled();
  await page.locator('#overlayFill').fill('0');
  await closeTools(page);
  await expect(page.locator('#export')).toBeEnabled();
  expect(
    (await page.locator('#result').evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL())) ===
      original,
  ).toBe(true);
  await tools(page, 'ascii');
  await page.locator('#overlayFill').fill('0.35');
  await closeTools(page);
  await expect(page.locator('#export')).toBeEnabled();
  expect(
    (await page.locator('#result').evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL())) ===
      original,
  ).toBe(false);
});

test('PICO-8 two-color modes expose their controls and export real PNGs', async ({ page }) => {
  await tools(page, 'color');
  await page.locator('#palette').selectOption('pico-8');
  await closeTools(page);
  for (const mode of ['ascii-fx', 'png2xp']) {
    await page.locator(`[data-mode="${mode}"]`).click();
    await expect(page.locator('#export')).toBeEnabled();
    await tools(page, 'ascii');
    await page.locator('#cellSize').fill('12');
    await page.locator('#cellAspect').fill('1.5');
    if (mode === 'ascii-fx') {
      await page.locator('#allowEmpty').uncheck();
      await page.locator('#chars').fill('');
      await expect(page.locator('#error')).toContainText('Добавьте хотя бы один символ');
      await page.locator('#chars').fill(' ▀▄▌▐█+#');
    } else {
      await expect(page.locator('#chars')).toHaveCount(0);
      await page.locator('#blockShading').uncheck();
    }
    await closeTools(page);
    await expect(page.locator('#export')).toBeEnabled();
    await expect(page.locator('#error')).toBeEmpty();
    await expect(page.locator('#recipe')).toContainText('PICO-8');
    const downloadReady = page.waitForEvent('download');
    await page.locator('#export').click();
    const stream = await (await downloadReady).createReadStream();
    if (!stream) throw new Error('Missing two-color export');
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    const png = Buffer.concat(chunks);
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([720, 900]);
  }
});

test('desktop settings scroll with the themed six-pixel gutter', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'Desktop settings sidebar.');
  const sidebar = page.getByRole('complementary', { name: 'Настройки изображения' });
  const width = await sidebar.evaluate((el) => getComputedStyle(el, '::-webkit-scrollbar').width);
  expect(width).toBe('6px');
  await sidebar.hover();
  await page.mouse.wheel(0, 200);
  await expect.poll(() => sidebar.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
});

test('desktop settings collapse independently and preserve edited values', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop', 'Desktop accordion; mobile uses section drawers.');
  const tone = page.getByRole('button', { name: '02 / Холст и тон', exact: true });
  const color = page.getByRole('button', { name: '03 / Цвет и дизеринг', exact: true });
  await expect(tone).toHaveAttribute('aria-expanded', 'true');
  await page.locator('#brightness').fill('25');
  await tone.click();
  await expect(tone).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#brightness')).toBeHidden();
  await expect(page.locator('#palette')).toBeVisible();
  await color.click();
  await expect(page.locator('#palette')).toBeHidden();
  await tone.focus();
  await page.keyboard.press('Enter');
  await expect(tone).toBeFocused();
  await expect(page.locator('#brightness')).toHaveValue('25');
  await expect(color).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('Space');
  await expect(page.locator('#brightness')).toBeHidden();
  await tone.click();
  await color.click();
  await expect(page.locator('#brightness')).toBeVisible();
  await expect(page.locator('#export')).toBeEnabled();
});

test('all rendering modes, presets and preview layouts work', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await expect(page).toHaveTitle('HASCII');
  for (const mode of ['ascii', 'overlay', 'pixels']) {
    await page.locator(`[data-mode="${mode}"]`).click();
    await expect(page.locator('#export')).toBeEnabled();
    await expect(page.locator('#error')).toBeEmpty();
    await expect(page.locator('#outputInfo')).toHaveText('720 × 900');
  }
  await tools(page, 'photo');
  for (const preset of ['ascii', 'soft', 'gameboy', 'neon']) {
    await page.locator(`[data-preset="${preset}"]`).click();
    await expect(page.locator('#export')).toBeEnabled();
    await expect(page.locator('#error')).toBeEmpty();
  }
  await preview(page, 'result');
  await expect(page.locator('#original')).toBeHidden();
  await preview(page, 'stack');
  await expect(page.locator('#original')).toBeVisible();
  expect(errors).toEqual([]);
});

test('settings, empty-alphabet recovery and persistence', async ({ page }) => {
  await page.locator('[data-mode="ascii"]').click();
  await tools(page, 'tone');
  await expect(page.locator('#pixelSize')).toBeDisabled();
  await tools(page, 'ascii');
  await page.locator('#allowEmpty').uncheck();
  await page.locator('#chars').fill('');
  await expect(page.locator('#error')).toContainText('Добавьте хотя бы один символ');
  await expect(page.locator('#export')).toBeDisabled();
  await page.locator('#chars').fill('+#@');
  await expect(page.locator('#export')).toBeEnabled();
  await page.locator('#matching').selectOption('shape');
  await expect(page.locator('#shapeWeight')).toBeEnabled();
  await tools(page, 'tone');
  await page.locator('#resolution').selectOption('600');
  await closeTools(page);
  await expect(page.locator('#outputInfo')).toHaveText('480 × 600');
  await page.locator('[data-mode="overlay"]').click();
  await tools(page, 'tone');
  await expect(page.locator('#pixelSize')).toBeDisabled();
  await tools(page, 'ascii');
  await page.locator('#overlayFill').fill('0');
  await page.locator('#opacity').fill('1');
  await expect(page.locator('#export')).toBeEnabled();
  await page.reload();
  await tools(page, 'ascii');
  await expect(page.locator('#chars')).toHaveValue('+#@');
});

test('imports and persists a palette and recovers from import errors', async ({ page }) => {
  await page.route('**/api/palette/test-palette', (route) =>
    route.fulfill({
      json: { name: 'Test Palette', author: 'Test', colors: ['000000', 'ffffff', 'aa2244'] },
    }),
  );
  await tools(page, 'color');
  await page.locator('#paletteUrl').fill('https://lospec.com/palette-list/test-palette');
  await page.locator('#import').click();
  await expect(page.locator('#importStatus')).toContainText('Добавлена');
  await expect(page.locator('#palette')).toHaveValue('test-palette');
  await page.reload();
  await tools(page, 'color');
  await expect(page.locator('#palette option[value="test-palette"]')).toHaveCount(1);
  await page.locator('#paletteUrl').fill('https://example.com/wrong');
  await page.locator('#import').click();
  await expect(page.locator('#importStatus')).toContainText('lospec.com');
  await expect(page.locator('#import')).toBeEnabled();
});

test('uploads an image and exports a real PNG', async ({ page }) => {
  await tools(page, 'photo');
  await page.locator('#file').setInputFiles('static/sample-husky.png');
  await closeTools(page);
  await expect(page.locator('#export')).toBeEnabled();
  const downloadReady = page.waitForEvent('download');
  await page.locator('#export').click();
  const download = await downloadReady;
  expect(download.suggestedFilename()).toBe('sample-husky-hascii.png');
  const stream = await download.createReadStream();
  if (!stream) throw new Error('Missing exported PNG');
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const png = Buffer.concat(chunks);
  expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([720, 900]);
});

test('imports an HEIC photo and exports the processed photo', async ({ page }) => {
  await tools(page, 'photo');
  await page.locator('#file').setInputFiles('tests/fixtures/photo.heic');
  await closeTools(page);
  await expect(page.locator('#sourceInfo')).toHaveText('1280 × 854', { timeout: 30000 });
  await expect(page.locator('#export')).toBeEnabled();
  await expect(page.locator('#error')).toBeEmpty();
  const downloadReady = page.waitForEvent('download');
  await page.locator('#export').click();
  const download = await downloadReady;
  expect(download.suggestedFilename()).toBe('photo-hascii.png');
  const stream = await download.createReadStream();
  if (!stream) throw new Error('Missing HEIC export');
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const png = Buffer.concat(chunks);
  expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([900, 600]);
});

test('imports common phone photos with missing or generic MIME types', async ({ page }) => {
  await tools(page, 'photo');
  const photos = [
    { name: 'iphone.JPG', mimeType: 'image/jpeg', format: 'jpeg', width: 16, height: 10 },
    { name: 'android.jpeg', mimeType: '', format: 'jpeg', width: 14, height: 12 },
    { name: 'photo.webp', mimeType: 'image/webp', format: 'webp', width: 18, height: 12 },
    {
      name: 'photo.png',
      mimeType: 'application/octet-stream',
      format: 'png',
      width: 20,
      height: 10,
    },
  ] as const;
  for (const photo of photos) {
    const canvas = new Canvas(photo.width, photo.height);
    canvas.getContext('2d').fillStyle = '#d94f86';
    canvas.getContext('2d').fillRect(0, 0, photo.width, photo.height);
    const buffer =
      photo.format === 'png' ? canvas.encodeSync('png') : canvas.encodeSync(photo.format);
    if (photo.mimeType === '') await uploadWithoutMime(page, photo.name, buffer);
    else
      await page
        .locator('#file')
        .setInputFiles({ name: photo.name, mimeType: photo.mimeType, buffer });
    await expect(page.locator('#sourceInfo')).toHaveText(`${photo.width} × ${photo.height}`);
    await expect(page.locator('#export')).toBeEnabled();
    await expect(page.locator('#error')).toBeEmpty();
  }
});

test('imports HEIC without MIME metadata and recovers from a damaged HEIC', async ({ page }) => {
  await tools(page, 'photo');
  const heic = await readFile('tests/fixtures/photo.heic');
  await uploadWithoutMime(page, 'IMG_0001.HEIC', heic);
  await expect(page.locator('#sourceInfo')).toHaveText('1280 × 854', { timeout: 15000 });
  await expect(page.locator('#export')).toBeEnabled();
  await page.locator('#file').setInputFiles({
    name: 'damaged.heic',
    mimeType: 'image/heic',
    buffer: heic.subarray(0, 32),
  });
  await expect(page.locator('#error')).toContainText('Не удалось открыть');
  await expect(page.locator('#sourceInfo')).toHaveText('1280 × 854');
  await page.locator('#sample').click();
  await expect(page.locator('#sourceInfo')).toHaveText('1122 × 1402');
  await expect(page.locator('#error')).toBeEmpty();
  await expect(page.locator('#export')).toBeEnabled();
});

test('invalid image does not destroy editor and viewport does not overflow', async ({ page }) => {
  await tools(page, 'photo');
  await page
    .locator('#file')
    .setInputFiles({ name: 'bad.png', mimeType: 'image/png', buffer: Buffer.from('not an image') });
  await expect(page.locator('#error')).toContainText('Не удалось открыть');
  await page.locator('#sample').click();
  await expect(page.locator('#export')).toBeEnabled();
  await expect(page.locator('#error')).toBeEmpty();
  await closeTools(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  expect(overflow).toBe(false);
});

test('mobile preview, tools and focus fit narrow screens', async ({ page }) => {
  for (const width of [320, 393, 430, 760]) {
    await page.setViewportSize({ width, height: 852 });
    await expect(page.locator('[data-tool="photo"]')).toBeVisible();
    await preview(page, 'result');
    await expect(page.locator('#result')).toBeInViewport();
    await expect(page.locator('#original')).toBeHidden();
    for (const section of ['photo', 'tone', 'color', 'ascii']) {
      await tools(page, section);
      await expect(page.getByRole('dialog')).toBeVisible();
      const overflow = await page.evaluate(() => {
        const dialog = document.querySelector('dialog[open]')!;
        const elements = [
          document.documentElement,
          dialog,
          ...dialog.querySelectorAll('input,select,textarea,button'),
        ];
        return elements
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            return rect.width && (rect.right > innerWidth + 1 || rect.left < -1);
          })
          .map((element) => element.tagName + '#' + element.id);
      });
      expect(overflow).toEqual([]);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).not.toBeVisible();
      await expect(page.locator(`[data-tool="${section}"]`)).toBeFocused();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.getByRole('complementary', { name: 'Настройки изображения' })).toBeVisible();
  await expect(page.locator('[data-tool="photo"]')).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.locator('h1').evaluate((element) => getComputedStyle(element).fontFamily),
  ).toContain('Monocraft');
  expect(await page.evaluate(() => document.fonts.check('13px Monocraft'))).toBe(true);
});
