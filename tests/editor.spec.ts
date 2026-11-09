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
  await tools(page, 'ascii');
  await page.locator('#backgroundOpacity').fill('0');
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
