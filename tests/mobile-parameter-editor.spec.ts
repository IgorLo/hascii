import { expect, test } from '@playwright/test';

import { closeTools, expectRange, selectMode, setRange, tools } from './helpers/editor';

test('phone parameter editing shows a large live result and returns to the same setting', async ({
  page,
}, info) => {
  test.skip(info.project.name === 'desktop', 'Phone parameter editor.');
  await page.goto('/');
  await expect(page.locator('#export')).toBeEnabled({ timeout: 30000 });
  await page.getByRole('button', { name: 'Стиль', exact: true }).click();
  const row = page.getByRole('button', { name: 'Изменить: Ширина в пикселях', exact: true });
  await expect(row).toHaveAccessibleDescription('64');
  await row.click();
  const panel = page.getByRole('region', { name: 'Редактирование параметра' });
  await expect(panel).toBeVisible();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('#artColumns')).toBeFocused();
  const result = page.locator('#result');
  // WebKit rounds fractional flex dimensions at the clipping ancestor.
  await expect(result).toBeInViewport({ ratio: 0.99 });
  const bounds = await result.boundingBox();
  const bar = await panel.boundingBox();
  expect(bounds!.height).toBeGreaterThan(page.viewportSize()!.height * 0.5);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(bar!.y);
  const before = await result.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
  await page.locator('#artColumns').fill('32');
  await expect(page.locator('#export')).toBeEnabled();
  await expect(page.locator('#recipe')).toContainText('32 ×');
  expect(await result.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL())).not.toBe(before);
  await page.getByRole('button', { name: 'Назад к настройкам', exact: true }).click();
  await expect(row).toBeFocused();
  await expect(row).toContainText('32');
  await row.click();
  await expect(page.locator('#artColumns')).toHaveValue('32');
  await page.keyboard.press('Escape');
  await expect(row).toBeFocused();
});

test('phone returns to the same scroll position in a long settings list', async ({
  page,
}, info) => {
  test.skip(info.project.name === 'desktop', 'Phone settings scroll restoration.');
  await page.goto('/');
  await expect(page.locator('#export')).toBeEnabled({ timeout: 30000 });
  await selectMode(page, 'ascii');
  await tools(page, 'style');
  const row = page.locator('#edit-opacity');
  await row.scrollIntoViewIfNeeded();
  const scroller = page.locator('.mobile-settings');
  const before = await scroller.evaluate((element) => element.scrollTop);
  expect(before).toBeGreaterThan(100);
  await row.click();
  await page.locator('#opacity').fill('0.6');
  await page.getByRole('button', { name: 'Назад к настройкам', exact: true }).click();
  await expect(row).toBeFocused();
  await expect(row).toHaveAccessibleDescription('0.6');
  expect(await scroller.evaluate((element) => element.scrollTop)).toBeCloseTo(before, 0);
});

test('landscape editing keeps a substantial preview and the entire control reachable', async ({
  page,
}, info) => {
  test.skip(info.project.name === 'desktop', 'Phone landscape layout.');
  const portrait = page.viewportSize()!;
  const landscape = { width: portrait.height, height: portrait.width };
  await page.goto('/');
  await expect(page.locator('#export')).toBeEnabled({ timeout: 30000 });
  await page.getByRole('button', { name: 'Стиль', exact: true }).click();
  await page.getByRole('button', { name: 'Изменить: Ширина в пикселях', exact: true }).click();
  await page.setViewportSize(landscape);
  await expect(page.getByRole('region', { name: 'Редактирование параметра' })).toBeVisible();
  const image = await page.locator('#result').boundingBox();
  const control = await page
    .getByRole('region', { name: 'Редактирование параметра' })
    .boundingBox();
  await expect(page.locator('#result')).toBeInViewport({ ratio: 0.99 });
  expect(image!.x + image!.width).toBeLessThanOrEqual(control!.x);
  expect(image!.height).toBeGreaterThan(landscape.height / 2);
  expect(image!.x).toBeGreaterThanOrEqual(0);
  expect(image!.y).toBeGreaterThanOrEqual(0);
  expect(image!.y + image!.height).toBeLessThanOrEqual(landscape.height);
  expect(control!.y + control!.height).toBeLessThanOrEqual(landscape.height);
  await expect(page.locator('#artColumns')).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Назад к настройкам' })).toBeInViewport();
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

test('phone advanced controls stay discoverable and view choice survives focused editing', async ({
  page,
}, info) => {
  test.skip(info.project.name === 'desktop', 'Phone parameter navigation.');
  await page.goto('/');
  await expect(page.locator('#export')).toBeEnabled({ timeout: 30000 });
  await page.getByRole('combobox', { name: 'Расположение превью' }).selectOption('stack');
  await page.getByRole('button', { name: 'Стиль', exact: true }).click();
  const advanced = page.locator('[data-details="style"]');
  await expect(advanced).not.toHaveAttribute('open', '');
  await expect(page.locator('#edit-artIterations')).toBeHidden();
  await advanced.locator('summary').click();
  await page.locator('#edit-artIterations').click();
  await expect(page.locator('#original')).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(page.locator('#edit-artIterations')).toBeFocused();
  await closeTools(page);
  await expect(page.locator('#original')).toBeVisible();
  await page.getByRole('button', { name: 'Стиль', exact: true }).click();
  await page.locator('#edit-artColumns').click();
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.getByRole('region', { name: 'Редактирование параметра' })).toHaveCount(0);
  await expect(page.getByRole('complementary', { name: 'Настройки изображения' })).toBeVisible();
  await expect(page.locator('#artColumns')).toBeVisible();
});
