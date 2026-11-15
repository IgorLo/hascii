import { expect, type Locator, type Page, test } from '@playwright/test';

test.beforeEach(async ({ page }, info) => {
  test.skip(info.project.name === 'desktop', 'Full-screen phone tools.');
  await page.goto('/sample-husky.png');
  await page.goto('/');
  await expect(page.locator('#export')).toBeEnabled({ timeout: 30000 });
});

async function armEntrance(page: Page) {
  await page.evaluate(() => {
    const pause = (event: AnimationEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLDialogElement) || !target.matches('[data-mobile-settings]'))
        return;
      target.getAnimations().forEach((animation) => animation.pause());
      document.removeEventListener('animationstart', pause);
    };
    document.addEventListener('animationstart', pause);
  });
}

async function inspectEntrance(dialog: Locator) {
  await expect(dialog).toBeVisible();
  return dialog.evaluate((element) => {
    const animation = element
      .getAnimations()
      .find((item) => item.effect instanceof KeyframeEffect && item.effect.target === element);
    if (!animation) return null;
    animation.pause();
    const duration = Number(animation.effect!.getTiming().duration);
    const samples = [0, duration / 3, duration].map((time) => {
      animation.currentTime = time;
      const bounds = element.getBoundingClientRect();
      return { y: bounds.y, width: bounds.width, height: bounds.height };
    });
    animation.finish();
    return { samples, viewport: innerHeight, duration };
  });
}

async function expectEntrance(dialog: Locator) {
  const motion = await inspectEntrance(dialog);
  expect(motion, 'the full-screen panel should animate into view').not.toBeNull();
  const [start, middle, end] = motion!.samples;
  expect(motion!.duration).toBeLessThanOrEqual(250);
  expect(start.y).toBeGreaterThanOrEqual(motion!.viewport - 1);
  expect(middle.y).toBeGreaterThan(end.y);
  expect(middle.y).toBeLessThan(start.y);
  expect(end.y).toBeCloseTo(0, 0);
  for (const bounds of [start, middle]) {
    expect(bounds.width).toBeCloseTo(end.width, 0);
    expect(bounds.height).toBeCloseTo(end.height, 0);
  }
}

async function settle(page: Page) {
  await page.evaluate(() =>
    Promise.all(
      document.getAnimations().map((animation) => animation.finished.catch(() => undefined)),
    ),
  );
}

test('Photo rises from the bottom, including when restored with Forward', async ({ page }) => {
  const photo = page.getByRole('dialog', { name: 'Фото', exact: true });
  await armEntrance(page);
  await page.locator('[data-tool="photo"]').click();
  await expectEntrance(photo);
  await page.goBack();
  await expect(photo).toBeHidden();
  await expect(page.locator('[data-tool="photo"]')).toBeFocused();
  await armEntrance(page);
  await page.goForward();
  await expectEntrance(photo);
  await page.keyboard.press('Escape');
  await expect(photo).toBeHidden();
  await expect(page.locator('[data-tool="photo"]')).toBeFocused();
});

test('style details rise above Style and Back unwinds one screen at a time', async ({ page }) => {
  await page.locator('[data-tool="style"]').click();
  await settle(page);
  await page.locator('#artColumns').fill('80');
  await armEntrance(page);
  await page.locator('[data-open-details="style"]').click();
  await expectEntrance(page.getByRole('dialog', { name: 'Подробности стиля' }));
  await page.goBack();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('region', { name: 'Инструменты: Стиль' })).toBeVisible();
  await expect(page.locator('#artColumns')).toHaveValue('80');
  await expect(page.locator('[data-open-details="style"]')).toBeFocused();
  await page.goBack();
  await expect(page.getByRole('region', { name: /^Инструменты:/ })).toBeHidden();
  await expect(page.locator('[data-tool="style"]')).toBeFocused();
  await page.goBack();
  await expect(page).toHaveURL(/\/sample-husky\.png$/);
});

test('palette import rises above Color and dismisses to the same controls', async ({ page }) => {
  await page.locator('[data-mode="pixels"]').click();
  await page.locator('[data-tool="color"]').click();
  await settle(page);
  await page.locator('[data-details="dither"] summary').click();
  await armEntrance(page);
  await page.locator('[data-open-details="import"]').click();
  await expectEntrance(page.getByRole('dialog', { name: 'Импорт палитры' }));
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('region', { name: 'Инструменты: Цвет' })).toBeVisible();
  await expect(page.locator('[data-open-details="import"]')).toBeFocused();
});

test('reduced motion opens a usable modal without spatial animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('[data-tool="photo"]').click();
  const photo = page.getByRole('dialog', { name: 'Фото', exact: true });
  await expect(photo).toBeVisible();
  expect(await photo.evaluate((element) => element.getAnimations().length)).toBe(0);
  expect((await photo.boundingBox())!.y).toBeCloseTo(0, 0);
  await expect(photo.getByRole('button', { name: 'Закрыть фото' })).toBeFocused();
  await page.goBack();
  await expect(photo).toBeHidden();
});

test('import keeps its header and input visible when the keyboard shrinks the visual viewport', async ({
  page,
}) => {
  await page.locator('[data-mode="pixels"]').click();
  await page.locator('[data-tool="color"]').click();
  await settle(page);
  await page.locator('[data-details="dither"] summary').click();
  await page.locator('[data-open-details="import"]').click();
  const dialog = page.getByRole('dialog', { name: 'Импорт палитры' });
  await expect(dialog).toBeVisible();
  await settle(page);
  await dialog.locator('#paletteUrl').fill('sweetie-16');
  // Headless browsers have no OS keyboard. Reproduce its visual-viewport contract
  // while the layout viewport stays unchanged, as on a phone with an overlay keyboard.
  const height = await page.evaluate(() => {
    const height = Math.floor(innerHeight * 0.55);
    Object.defineProperty(visualViewport!, 'height', { configurable: true, value: height });
    visualViewport!.dispatchEvent(new Event('resize'));
    return height;
  });
  await expect.poll(async () => (await dialog.boundingBox())!.y).toBeGreaterThanOrEqual(0);
  const bounds = (await dialog.boundingBox())!;
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(height + 1);
  for (const control of [
    dialog.getByRole('button', { name: 'Закрыть подробности' }),
    dialog.locator('#paletteUrl'),
  ]) {
    const box = (await control.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(height);
  }
  await expect(dialog.locator('#paletteUrl')).toBeFocused();
  await expect(dialog.locator('#paletteUrl')).toHaveValue('sweetie-16');
});

test('Back can dismiss an entrance in progress and Forward starts it again', async ({ page }) => {
  const photo = page.getByRole('dialog', { name: 'Фото', exact: true });
  await armEntrance(page);
  await page.locator('[data-tool="photo"]').click();
  await expect(photo).toBeVisible();
  await expect
    .poll(() =>
      photo.evaluate((element) =>
        element.getAnimations().some((animation) => animation.playState === 'paused'),
      ),
    )
    .toBe(true);
  await page.goBack();
  await expect(photo).toBeHidden();
  await expect(page.locator('[data-tool="photo"]')).toBeFocused();
  await armEntrance(page);
  await page.goForward();
  await expectEntrance(photo);
  await page.keyboard.press('Escape');
  await expect(photo).toBeHidden();
});
