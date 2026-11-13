import { expect, type Page, test } from '@playwright/test';

async function tools(page: Page, section: string) {
  const close = page.getByRole('button', { name: 'Показать результат', exact: true });
  if (await close.isVisible()) await close.click();
  const trigger = page.locator(`[data-tool="${section}"]`);
  if (await trigger.isVisible()) await trigger.click();
}

test('fresh editor uses the requested defaults and mode order', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#export')).toBeEnabled({ timeout: 20000 });
  await expect(page.locator('[data-mode]')).toHaveText([
    /^\s*Pixel Art\s*$/,
    /^\s*Пиксели\s*$/,
    /^\s*Halftone\s*$/,
    /^\s*Фон \+ ASCII\s*$/,
    /^\s*ASCII\s*$/,
    /^\s*ASCII FX\s*$/,
    /^\s*png2xp\s*$/,
  ]);
  await expect(page.locator('[data-mode="pixel-art"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#recipe')).toContainText('Pixel Art');
  await page.locator('[data-mode="pixels"]').click();
  await expect(page.locator('#recipe')).toContainText('PICO-8');
  await tools(page, 'color');
  await expect(page.locator('#dither')).toHaveValue('atkinson');
  await expect(page.locator('#strength')).toHaveValue('0.1');
  await tools(page, 'photo');
  const close = page.getByRole('button', { name: 'Показать результат', exact: true });
  if (await close.isVisible()) await close.click();
  await page.locator('[data-mode="halftone"]').click();
  await tools(page, 'ascii');
  await expect(page.locator('#halftoneColor')).toHaveValue('mono');
  await tools(page, 'photo');
  if (await close.isVisible()) await close.click();
  await page.locator('[data-mode="ascii"]').click();
  await tools(page, 'ascii');
  await expect(page.locator('#emptyThreshold')).toHaveValue('0');
  await tools(page, 'photo');
  if (await close.isVisible()) await close.click();
  await page.locator('[data-mode="overlay"]').click();
  await tools(page, 'ascii');
  await expect(page.locator('#emptyThreshold')).toHaveValue('0');
  await expect(page.locator('#overlayFill')).toHaveValue('0.8');
  await expect(page.locator('#export')).toBeEnabled();
});

test('palette picker previews built-ins and large imports, supports keyboard and exports', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#export')).toBeEnabled({ timeout: 20000 });
  await page.locator('[data-mode="pixels"]').click();
  await tools(page, 'color');
  const trigger = page.getByRole('button', { name: /^Палитра: PICO-8/ });
  await trigger.click();
  const picker = page.getByRole('dialog', { name: 'Выбор палитры' });
  await expect(picker).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await trigger.press('Enter');
  await page.keyboard.press('End');
  await expect(
    picker.getByRole('button', { name: 'CL8UDS · 8 цветов', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(picker).toBeHidden();
  await expect(page.locator('#palette')).toBeFocused();
  for (const [name, count, first, last] of [
    ['Lost Century', 16, 'd1b187', 'ab9b8e'],
    ['Midnight ablaze', 7, 'ff8274', '130208'],
    ['Blessing', 5, '74569b', 'd8bfd8'],
    ['Eulbink', 7, 'ffffff', '201533'],
    ['Waldgeist', 39, 'a6884a', '32534a'],
    ['CL8UDS', 8, 'fcb08c', 'a5b7d4'],
  ] as const) {
    await page.locator('#palette').click();
    const option = picker.getByRole('button', { name: `${name} · ${count} цветов`, exact: true });
    await expect(option.locator('[data-color]')).toHaveCount(count);
    await expect(option.locator('[data-color]').first()).toHaveAttribute('data-color', first);
    await expect(option.locator('[data-color]').last()).toHaveAttribute('data-color', last);
    await option.click();
    await expect(page.locator('#palette')).toContainText(name);
    await expect(page.locator('#swatches [data-color]')).toHaveCount(count);
    await expect(page.locator('#recipe')).toContainText(name);
  }
  const largeName = 'Large imported palette with a long descriptive name';
  await page.route('**/api/palette/large-preview', (route) =>
    route.fulfill({
      json: {
        name: largeName,
        author: 'Test',
        colors: Array.from({ length: 1024 }, (_, i) => i.toString(16).padStart(6, '0')),
      },
    }),
  );
  await page.locator('#paletteUrl').fill('large-preview');
  await page.locator('#import').click();
  await expect(page.locator('#palette')).toContainText(largeName);
  await expect(page.locator('#swatches [data-color]')).toHaveCount(1024);
  await page.locator('#palette').click();
  const large = picker.getByRole('button', { name: `${largeName} · 1024 цветов`, exact: true });
  await expect(large).toHaveAttribute('aria-pressed', 'true');
  await large.scrollIntoViewIfNeeded();
  await expect(large.locator('[data-color]')).toHaveCount(1024);
  expect(await picker.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  const bounds = await picker.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.keyboard.press('Escape');
  await page.reload();
  await page.locator('[data-mode="pixels"]').click();
  await tools(page, 'color');
  await page.locator('#palette').click();
  await expect(
    picker.getByRole('button', { name: `${largeName} · 1024 цветов`, exact: true }),
  ).toHaveCount(1);
  await picker.getByRole('button', { name: 'Waldgeist · 39 цветов', exact: true }).click();
  const close = page.getByRole('button', { name: 'Показать результат', exact: true });
  if (await close.isVisible()) await close.click();
  await expect(page.locator('#export')).toBeEnabled();
  const downloadReady = page.waitForEvent('download');
  await page.locator('#export').click();
  expect((await downloadReady).suggestedFilename()).toMatch(/\.png$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(errors).toEqual([]);
});

test('palette rows place a short color preview beside the name and count', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#export')).toBeEnabled({ timeout: 20000 });
  await page.locator('[data-mode="pixels"]').click();
  await tools(page, 'color');
  await expect(page.locator('#palette')).toContainText(/PICO-8\s*·\s*16/);
  const trigger = await page.locator('#palette').boundingBox();
  const colors = await page.locator('#swatches').boundingBox();
  expect(trigger!.height).toBeLessThanOrEqual(48);
  expect(colors!.height).toBeLessThanOrEqual(18);
  await page.locator('#palette').click();
  const picker = page.getByRole('dialog', { name: 'Выбор палитры' });
  const option = picker.getByRole('button', { name: 'PICO-8 · 16 цветов', exact: true });
  expect((await option.boundingBox())!.height).toBeLessThanOrEqual(48);
  const preview = option.locator('[data-palette-preview]');
  const label = option.locator('[data-palette-label]');
  const previewBounds = await preview.boundingBox();
  const labelBounds = await label.boundingBox();
  expect(previewBounds!.x).toBeGreaterThan(labelBounds!.x + labelBounds!.width);
  expect(Math.abs(previewBounds!.y - labelBounds!.y)).toBeLessThan(8);
  const longName = picker.getByRole('button', { name: 'Midnight ablaze · 7 цветов', exact: true });
  const count = longName.getByText('· 7', { exact: true });
  await expect(count).toBeVisible();
  expect(await count.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  const scroller = picker.getByRole('group', { name: 'Палитры' });
  expect(await scroller.evaluate((el) => getComputedStyle(el, '::-webkit-scrollbar').width)).toBe(
    '6px',
  );
});

test('mobile modes stay on one line and show scroll directions until each edge', async ({
  page,
}) => {
  test.skip(page.viewportSize()!.width > 760, 'Mobile horizontal mode strip.');
  await page.goto('/');
  await expect(page.locator('#export')).toBeEnabled({ timeout: 20000 });
  const strip = page.getByRole('group', { name: 'Режим отрисовки' });
  const next = page.getByRole('button', { name: 'Следующие режимы', exact: true });
  const previous = page.getByRole('button', { name: 'Предыдущие режимы', exact: true });
  await expect(next).toBeVisible();
  await expect(previous).toBeHidden();
  const stripLayout = () =>
    strip.evaluate((el) => {
      const bounds = el.getBoundingClientRect();
      return {
        x: bounds.x,
        width: bounds.width,
        contentOrigin: el.querySelector('[data-mode]')!.getBoundingClientRect().x + el.scrollLeft,
      };
    });
  const initialLayout = await stripLayout();
  const positions = await strip
    .locator('[data-mode]')
    .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().y));
  expect(Math.max(...positions) - Math.min(...positions)).toBeLessThan(2);
  expect(await strip.evaluate((el) => getComputedStyle(el, '::-webkit-scrollbar').height)).toBe(
    '6px',
  );
  for (let i = 0; i < 10 && (await next.isVisible()); i++) {
    await next.click();
    expect(await stripLayout()).toEqual(initialLayout);
  }
  await expect(next).toBeHidden();
  await expect(previous).toBeVisible();
  await strip.locator('[data-mode="png2xp"]').click();
  await expect(page.locator('#export')).toBeEnabled();
  // A different recipe can change the page's vertical scrollbar; compare each
  // arrow-only sequence within the same rendered mode.
  const returnLayout = await stripLayout();
  for (let i = 0; i < 10 && (await previous.isVisible()); i++) {
    await previous.click();
    expect(await stripLayout()).toEqual(returnLayout);
  }
  await expect(previous).toBeHidden();
  await expect(next).toBeVisible();
  await strip.locator('[data-mode="pixel-art"]').click();
  await expect(page.locator('#recipe')).toContainText('Pixel Art');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
