import { createCanvas } from '@napi-rs/canvas';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }, info) => {
  test.skip(info.project.name === 'desktop', 'Compact mobile panel motion.');
  await page.goto('/');
  await expect(page.locator('#export')).toBeEnabled({ timeout: 30000 });
});

test('compact panels interpolate their layout when opening, switching and closing', async ({
  page,
}) => {
  const nav = page.getByRole('navigation', { name: 'Инструменты изображения' });
  const hasLayoutMotion = () =>
    page.evaluate(() =>
      document.getAnimations().some((animation) => {
        const frames = (animation.effect as KeyframeEffect).getKeyframes();
        return (
          frames.length > 1 &&
          ((frames[0].height !== undefined && frames[0].height !== frames.at(-1)!.height) ||
            (frames[0].clipPath !== undefined && frames[0].clipPath !== frames.at(-1)!.clipPath))
        );
      }),
    );
  const settle = () =>
    page.evaluate(() =>
      Promise.all(
        document.getAnimations().map((animation) => animation.finished.catch(() => undefined)),
      ),
    );
  await nav.getByRole('button', { name: 'Тон', exact: true }).click();
  await expect.poll(hasLayoutMotion).toBe(true);
  await settle();
  await nav.getByRole('button', { name: 'Стиль', exact: true }).click();
  await expect.poll(hasLayoutMotion).toBe(true);
  await settle();
  await page.goBack();
  await expect.poll(hasLayoutMotion).toBe(true);
  await settle();
  await expect(page.getByRole('region', { name: /^Инструменты:/ })).toBeHidden();
  await expect(page.locator('[data-tool="style"]')).toBeFocused();
});

test('the close button has balanced insets above and below', async ({ page }) => {
  for (const width of [320, 393]) {
    await page.setViewportSize({ width, height: width === 320 ? 640 : 852 });
    const tone = page.locator('[data-tool="tone"]');
    await tone.click();
    const panel = page.getByRole('region', { name: 'Инструменты: Тон' });
    await expect(page.locator('#brightness')).toBeVisible();
    await page.evaluate(() =>
      Promise.all(
        document.getAnimations().map((animation) => animation.finished.catch(() => undefined)),
      ),
    );
    const container = (await panel.boundingBox())!;
    const close = (await panel.getByRole('button', { name: 'Показать результат' }).boundingBox())!;
    const label = (await page.locator('label[for="brightness"]').boundingBox())!;
    const inset = container.x + container.width - close.x - close.width;
    expect(Math.abs(close.y - container.y - inset)).toBeLessThanOrEqual(1);
    expect(Math.abs(label.y - close.y - close.height - inset)).toBeLessThanOrEqual(1);
    await tone.click();
    await expect(panel).toBeHidden();
  }
});

test('the moving preview stays fully visible through panel expansion', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.locator('[data-tool="tone"]').click();
  await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBeGreaterThan(0);
  const clipping = await page.evaluate(() => {
    document.getAnimations().forEach((animation) => {
      animation.pause();
      animation.currentTime = 0;
    });
    const image = document.querySelector('#result')!;
    const bounds = image.getBoundingClientRect();
    const clipped: string[] = [];
    for (let parent = image.parentElement; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      const box = parent.getBoundingClientRect();
      const clipsX = ['hidden', 'clip', 'auto', 'scroll'].includes(style.overflowX);
      const clipsY = ['hidden', 'clip', 'auto', 'scroll'].includes(style.overflowY);
      if (
        (clipsX && (bounds.left < box.left - 1 || bounds.right > box.right + 1)) ||
        (clipsY && (bounds.top < box.top - 1 || bounds.bottom > box.bottom + 1))
      )
        clipped.push(parent.tagName);
    }
    document.getAnimations().forEach((animation) => animation.finish());
    return clipped;
  });
  expect(clipping).toEqual([]);
});

test('a small imported image fills the available compact preview', async ({ page }) => {
  const image = createCanvas(64, 64);
  const context = image.getContext('2d');
  context.fillStyle = '#aa2244';
  context.fillRect(0, 0, 64, 64);
  await page.locator('[data-tool="photo"]').click();
  await page.locator('#file').setInputFiles({
    name: 'small.png',
    mimeType: 'image/png',
    buffer: image.toBuffer('image/png'),
  });
  await expect(page.locator('#outputInfo')).toHaveText('64 × 64');
  await page
    .getByRole('dialog', { name: 'Фото', exact: true })
    .getByRole('button', { name: 'Показать результат', exact: true })
    .click();
  await page.locator('[data-tool="tone"]').click();
  await expect(page.locator('#brightness')).toBeVisible();
  const bounds = (await page.locator('#result').boundingBox())!;
  expect(bounds.width).toBeGreaterThan(200);
  expect(bounds.height).toBeGreaterThan(200);
  expect(bounds.width).toBeCloseTo(bounds.height, 0);
});

test('rapid tool changes and closing interrupt motion without restoring a stale panel', async ({
  page,
}) => {
  const tone = page.locator('[data-tool="tone"]');
  await tone.click();
  await page.locator('#brightness').fill('20');
  for (const section of ['color', 'style', 'tone'])
    await page.locator(`[data-tool="${section}"]`).click();
  await expect(tone).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#brightness')).toHaveValue('20');
  await tone.click();
  await expect(page.getByRole('region', { name: /^Инструменты:/ })).toBeHidden();
  await page.evaluate(() =>
    Promise.all(
      document.getAnimations().map((animation) => animation.finished.catch(() => undefined)),
    ),
  );
  await expect(page.getByRole('region', { name: /^Инструменты:/ })).toBeHidden();
  await expect(tone).toBeFocused();
  await page.goForward();
  await expect(page.locator('#brightness')).toHaveValue('20');
});

for (const preference of ['reduced-motion', 'unsupported-browser']) {
  test(`${preference} keeps tool changes immediate and usable`, async ({ page }) => {
    if (preference === 'reduced-motion') await page.emulateMedia({ reducedMotion: 'reduce' });
    else {
      await page.addInitScript(() =>
        Object.defineProperty(Element.prototype, 'animate', {
          value: undefined,
          configurable: true,
        }),
      );
      await page.reload();
      await expect(page.locator('#export')).toBeEnabled();
    }
    await page.locator('[data-tool="tone"]').click();
    await expect(page.locator('#brightness')).toBeVisible();
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    await page.locator('#brightness').fill('20');
    await page.locator('[data-tool="style"]').click();
    await expect(page.locator('#artColumns')).toBeVisible();
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    await page.goBack();
    await expect(page.getByRole('region', { name: /^Инструменты:/ })).toBeHidden();
  });
}
