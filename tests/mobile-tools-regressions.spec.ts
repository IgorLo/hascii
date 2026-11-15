import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }, info) => {
  test.skip(info.project.name === 'desktop', 'Mobile navigation regressions.');
  await page.goto('/');
  await expect(page.locator('#export')).toBeEnabled({ timeout: 30000 });
});

test('bottom navigation stays still when tools open and close', async ({ page }) => {
  const nav = page.getByRole('navigation', { name: 'Инструменты изображения' });
  for (const viewport of [
    { width: 320, height: 640 },
    { width: 393, height: 852 },
    { width: 852, height: 393 },
  ]) {
    await page.setViewportSize(viewport);
    const closed = await nav.boundingBox();
    for (const name of ['Стиль', 'Цвет', 'Тон']) {
      await nav.getByRole('button', { name, exact: true }).click();
      await expect(page.getByRole('region', { name: `Инструменты: ${name}` })).toBeVisible();
      expect(await nav.boundingBox()).toEqual(closed);
      await page.getByRole('button', { name: 'Показать результат', exact: true }).click();
      await expect(page.getByRole('region', { name: /^Инструменты:/ })).toBeHidden();
      expect(await nav.boundingBox()).toEqual(closed);
    }
  }
});

test('bottom navigation visibly identifies the active tool', async ({ page }) => {
  const nav = page.getByRole('navigation', { name: 'Инструменты изображения' });
  const tone = nav.getByRole('button', { name: 'Тон', exact: true });
  const color = nav.getByRole('button', { name: 'Цвет', exact: true });
  const inactive = await tone.evaluate((button) => getComputedStyle(button).color);
  await tone.click();
  await expect(tone).toHaveAttribute('aria-pressed', 'true');
  const selected = await tone.evaluate((button) => getComputedStyle(button).color);
  expect(selected).not.toBe(inactive);
  await color.click();
  await expect(color).toHaveAttribute('aria-pressed', 'true');
  await expect(tone).toHaveAttribute('aria-pressed', 'false');
  expect(await tone.evaluate((button) => getComputedStyle(button).color)).toBe(inactive);
  expect(await color.evaluate((button) => getComputedStyle(button).color)).toBe(selected);
});

test('pressing the active tool closes it, including its palette, without losing edits', async ({
  page,
}) => {
  const nav = page.getByRole('navigation', { name: 'Инструменты изображения' });
  const tone = nav.getByRole('button', { name: 'Тон', exact: true });
  await tone.focus();
  await tone.press('Enter');
  await page.locator('#brightness').fill('20');
  await tone.press('Enter');
  await expect(page.getByRole('region', { name: /^Инструменты:/ })).toBeHidden();
  await expect(tone).toHaveAttribute('aria-pressed', 'false');
  await expect(tone).toBeFocused();
  await page.goForward();
  await expect(page.locator('#brightness')).toHaveValue('20');
  await expect(tone).toHaveAttribute('aria-pressed', 'true');
  await tone.click();
  await expect(page.getByRole('region', { name: /^Инструменты:/ })).toBeHidden();
  await page.locator('[data-mode="pixels"]').click();
  const color = nav.getByRole('button', { name: 'Цвет', exact: true });
  await color.click();
  await color.click();
  await expect(page.getByRole('region', { name: /^Инструменты:/ })).toBeHidden();
  await color.click();
  await page.locator('#palette').click();
  await expect(page.getByRole('dialog', { name: 'Выбор палитры' })).toBeVisible();
  await color.click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('region', { name: /^Инструменты:/ })).toBeHidden();
  await expect(color).toHaveAttribute('aria-pressed', 'false');
  await expect(color).toBeFocused();
  await expect(page).toHaveURL(/\/$/);
});

test('forward cannot restore an unavailable palette screen', async ({ page }) => {
  await page.locator('[data-mode="pixels"]').click();
  await page.getByRole('button', { name: 'Цвет', exact: true }).click();
  await page.locator('#palette').click();
  await expect(page.getByRole('dialog', { name: 'Выбор палитры' })).toBeVisible();
  await page.goBack();
  await page.locator('#paletteEnabled').uncheck();
  await page.goForward();
  await page.getByRole('button', { name: 'Показать результат', exact: true }).click();
  await expect(page.getByRole('region', { name: /^Инструменты:/ })).toBeHidden();
  await expect(page).toHaveURL(/\/$/);
});

test('a tool tap during palette dismissal reaches the requested tool', async ({ page }) => {
  await page.locator('[data-mode="pixels"]').click();
  await page.getByRole('button', { name: 'Цвет', exact: true }).click();
  await page.locator('#palette').click();
  await expect(page.getByRole('dialog', { name: 'Выбор палитры' })).toBeVisible();
  await page.getByRole('button', { name: 'Тон', exact: true }).click();
  await expect(page.locator('#brightness')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Инструменты: Тон' })).toBeVisible();
});

test('import returns to the visible expanded color controls and their scroll', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.locator('[data-mode="pixels"]').click();
  await page.getByRole('button', { name: 'Цвет', exact: true }).click();
  const dither = page.locator('[data-details="dither"]');
  await dither.locator('summary').click();
  const trigger = page.locator('[data-open-details="import"]');
  await trigger.scrollIntoViewIfNeeded();
  const scroller = page.locator('.panel-body');
  const scroll = await scroller.evaluate((el) => el.scrollTop);
  expect(scroll).toBeGreaterThan(20);
  await trigger.click();
  await expect(page.getByRole('dialog', { name: 'Импорт палитры' })).toBeVisible();
  await page.goBack();
  await expect(dither).toHaveAttribute('open', '');
  await expect.poll(() => scroller.evaluate((el) => el.scrollTop)).toBeCloseTo(scroll, 0);
  await expect(trigger).toBeFocused();
  const body = await scroller.boundingBox();
  const button = await trigger.boundingBox();
  expect(button!.y + button!.height).toBeLessThanOrEqual(body!.y + body!.height + 1);
});

test('photo drawer announces loading and completion while the photo remains open', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Фото', exact: true }).click();
  const photo = page.getByRole('dialog', { name: 'Фото', exact: true });
  const status = photo.getByRole('status');
  await expect(status).toHaveText('Готово');
  await page.locator('#file').setInputFiles('tests/fixtures/photo.heic');
  await expect(status).toContainText(/Загружаем|HEIC|Обрабатываем/);
  await expect(status).toHaveText('Готово', { timeout: 30000 });
  await expect(page.locator('#sourceInfo')).toHaveText('1280 × 854');
});

test('keyboard editing from details focuses the requested slider', async ({ page }) => {
  await page.locator('[data-mode="ascii"]').click();
  await page.getByRole('button', { name: 'Стиль', exact: true }).click();
  await page.locator('[data-open-details="style"]').click();
  await page.locator('[data-details="style"] summary').click();
  await page.locator('#edit-opacity').focus();
  await page.locator('#edit-opacity').press('Enter');
  await expect(page.locator('#opacity')).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#opacity')).toHaveValue('0.95');
});
