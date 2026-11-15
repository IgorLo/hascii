import { expect, test } from '@playwright/test';

import { closeTools, expectRange, selectMode, setRange, tools } from './helpers/editor';

test('phone details retain their scroll position after editing a live parameter', async ({
  page,
}, info) => {
  test.skip(info.project.name === 'desktop', 'Phone settings scroll restoration.');
  await page.goto('/');
  await expect(page.locator('#export')).toBeEnabled({ timeout: 30000 });
  await selectMode(page, 'ascii');
  await tools(page, 'style');
  const row = page.locator('#edit-opacity');
  await row.scrollIntoViewIfNeeded();
  const scroller = page.locator('.detail-body');
  const before = await scroller.evaluate((element) => element.scrollTop);
  expect(before).toBeGreaterThan(100);
  await row.click();
  await page.locator('#opacity').fill('0.6');
  await page.locator('[data-open-details="style"]').click();
  await expect(row).toBeVisible();
  await expect(row).toHaveAccessibleDescription('0.6');
  await expect.poll(() => scroller.evaluate((element) => element.scrollTop)).toBeCloseTo(before, 0);
});

test('landscape tools keep the image and entire slider reachable', async ({ page }, info) => {
  test.skip(info.project.name === 'desktop', 'Phone landscape layout.');
  const portrait = page.viewportSize()!;
  const landscape = { width: portrait.height, height: portrait.width };
  await page.goto('/');
  await expect(page.locator('#export')).toBeEnabled({ timeout: 30000 });
  await page.getByRole('button', { name: 'Стиль', exact: true }).click();
  await page.setViewportSize(landscape);
  const panel = page.getByRole('region', { name: 'Инструменты: Стиль' });
  await expect(panel).toBeVisible();
  const image = await page.locator('#result').boundingBox();
  const control = await panel.boundingBox();
  await expect(page.locator('#result')).toBeInViewport({ ratio: 0.99 });
  expect(image!.x + image!.width).toBeLessThanOrEqual(control!.x + 1);
  expect(image!.height).toBeGreaterThan(landscape.height / 2);
  expect(control!.y + control!.height).toBeLessThanOrEqual(landscape.height);
  await page.locator('#artColumns').scrollIntoViewIfNeeded();
  await expect(page.locator('#artColumns')).toBeInViewport();
  await expect(
    page.getByRole('button', { name: 'Показать результат', exact: true }),
  ).toBeInViewport();
});

test('contextual color tools and hidden values survive mode and section changes', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('#export')).toBeEnabled({ timeout: 30000 });
  await tools(page, 'color');
  await setRange(page, 'artColors', '6');
  await expect(page.locator('#palette')).toHaveCount(0);
  await selectMode(page, 'halftone');
  await tools(page, 'color');
  await page.getByLabel('Краски', { exact: true }).selectOption('duotone');
  await page.locator('#halftoneInkB').fill('#00ff00');
  await setRange(page, 'halftoneBalance', '0.25');
  await selectMode(page, 'pixels');
  await tools(page, 'style');
  await expect(page.locator('#chars')).toHaveCount(0);
  await expect(page.locator('#font')).toHaveCount(0);
  await setRange(page, 'pixelSize', '7');
  await page.getByRole('checkbox', { name: 'Пикселизация', exact: true }).uncheck();
  await expect(page.locator('#pixelSize, #edit-pixelSize')).toHaveCount(0);
  await page.getByRole('checkbox', { name: 'Пикселизация', exact: true }).check();
  await expectRange(page, 'pixelSize', '7');
  await selectMode(page, 'halftone');
  await tools(page, 'color');
  await expect(page.getByLabel('Краски', { exact: true })).toHaveValue('duotone');
  await expect(page.locator('#halftoneInkB')).toHaveValue('#00ff00');
  await expectRange(page, 'halftoneBalance', '0.25');
  await page.getByLabel('Краски', { exact: true }).selectOption('cmyk');
  await expect(page.locator('#halftoneInk, #halftoneInkB')).toHaveCount(0);
  await selectMode(page, 'pixel-art');
  await tools(page, 'color');
  await expectRange(page, 'artColors', '6');
});

test('view comparison and settings survive phone tools and a desktop breakpoint', async ({
  page,
}, info) => {
  test.skip(info.project.name === 'desktop', 'Phone navigation.');
  await page.goto('/');
  await expect(page.locator('#export')).toBeEnabled({ timeout: 30000 });
  await page.getByRole('combobox', { name: 'Расположение превью' }).selectOption('stack');
  await page.getByRole('button', { name: 'Стиль', exact: true }).click();
  await expect(page.locator('#original')).toBeHidden();
  await page.locator('#artIterations').fill('8');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-tool="style"]')).toBeFocused();
  await expect(page.locator('#original')).toBeVisible();
  await page.getByRole('button', { name: 'Стиль', exact: true }).click();
  await page.locator('#artColumns').fill('32');
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.getByRole('region', { name: /^Инструменты:/ })).toHaveCount(0);
  await expect(page.getByRole('complementary', { name: 'Настройки изображения' })).toBeVisible();
  await expect(page.locator('#artColumns')).toHaveValue('32');
  await tools(page, 'style');
  await expectRange(page, 'artIterations', '8');
  await closeTools(page);
});
