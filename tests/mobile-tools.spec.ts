import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }, info) => {
  test.skip(info.project.name === 'desktop', 'Live mobile tools.');
  await page.goto('/sample-husky.png');
  await page.goto('/');
  await expect(page.locator('#export')).toBeEnabled({ timeout: 30000 });
});

test('tone opens three live sliders without an intermediate parameter screen', async ({ page }) => {
  await page.getByRole('button', { name: 'Тон', exact: true }).click();
  for (const key of ['brightness', 'contrast', 'saturation']) {
    await expect(page.locator(`#${key}`)).toBeVisible();
  }
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.evaluate(() =>
    Promise.all(
      document.getAnimations().map((animation) => animation.finished.catch(() => undefined)),
    ),
  );
  const result = page.locator('#result');
  const before = await result.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
  const geometry = await page.locator('#brightness').boundingBox();
  await page.locator('#brightness').fill('25');
  await page.locator('#contrast').fill('1.2');
  await expect(page.locator('#export')).toBeEnabled();
  expect(await result.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL())).not.toBe(before);
  expect(await page.locator('#brightness').boundingBox()).toEqual(geometry);
  const panel = await page.getByRole('region', { name: 'Инструменты: Тон' }).boundingBox();
  const image = await result.boundingBox();
  expect(image!.y + image!.height).toBeLessThanOrEqual(panel!.y + 1);
  await expect(result).toBeInViewport({ ratio: 0.99 });
});

test('section and parameter choices do not add back steps', async ({ page }) => {
  const initial = await page.evaluate(() => history.length);
  await page.getByRole('button', { name: 'Тон', exact: true }).click();
  await expect.poll(() => page.evaluate(() => history.length)).toBe(initial + 1);
  await page.locator('#brightness').fill('20');
  await page.getByRole('button', { name: 'Цвет', exact: true }).click();
  await expect(page.locator('#artColors')).toBeVisible();
  await page.locator('#artColors').fill('6');
  expect(await page.evaluate(() => history.length)).toBe(initial + 1);
  await page.goBack();
  await expect(page.getByRole('region', { name: /^Инструменты:/ })).toBeHidden();
  await expect(page).toHaveURL(/\/$/);
  await page.goForward();
  await expect(page.locator('#artColors')).toHaveValue('6');
  await page.getByRole('button', { name: 'Тон', exact: true }).click();
  await expect(page.locator('#brightness')).toHaveValue('20');
});

test('long ASCII group has one slider and returns from details to its selected parameter', async ({
  page,
}) => {
  await page.locator('[data-mode="ascii"]').click();
  await page.getByRole('button', { name: 'Стиль', exact: true }).click();
  await page.locator('[data-parameter="gapX"]').click();
  await page.locator('#gapX').fill('4');
  await expect(page.locator('input[type="range"]')).toHaveCount(1);
  await page.locator('[data-open-details="style"]').click();
  await expect(page.getByRole('dialog', { name: 'Подробности стиля' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('#gapX')).toHaveValue('4');
  await expect(page.locator('[data-open-details="style"]')).toBeFocused();
  await page.goBack();
  await expect(page.getByRole('region', { name: /^Инструменты:/ })).toBeHidden();
  await expect(page.locator('[data-tool="style"]')).toBeFocused();
});

test('palette and photo screens close one level without leaving the editor', async ({ page }) => {
  await page.locator('[data-mode="pixels"]').click();
  await page.getByRole('button', { name: 'Цвет', exact: true }).click();
  await page.locator('#palette').click();
  const picker = page.getByRole('dialog', { name: 'Выбор палитры' });
  await expect(picker).toBeVisible();
  await page.goBack();
  await expect(picker).toBeHidden();
  await expect(page.getByRole('region', { name: 'Инструменты: Цвет' })).toBeVisible();
  await expect(page.locator('#palette')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('region', { name: /^Инструменты:/ })).toBeHidden();
  await page.getByRole('button', { name: 'Фото', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Фото', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('[data-tool="photo"]')).toBeFocused();
});

test('short phone keeps a useful picture and all three tone sliders reachable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.getByRole('button', { name: 'Тон', exact: true }).click();
  const paintedHeight = await page.locator('#result').evaluate((canvas: HTMLCanvasElement) => {
    const bounds = canvas.getBoundingClientRect();
    return Math.min(bounds.height, (bounds.width * canvas.height) / canvas.width);
  });
  expect(paintedHeight).toBeGreaterThan(160);
  for (const key of ['brightness', 'contrast', 'saturation'])
    await expect(page.locator(`#${key}`)).toBeInViewport({ ratio: 0.99 });
});
