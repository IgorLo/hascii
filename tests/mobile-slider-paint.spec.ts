import { createCanvas, loadImage } from '@napi-rs/canvas';
import { expect, test } from '@playwright/test';

test('the color slider keeps its painted rail after Tone and back', async ({ page }, info) => {
  test.skip(info.project.name === 'desktop', 'Compact tool transition paint.');
  await page.setViewportSize({ width: 390, height: 664 });
  await page.goto('/');
  await expect(page.locator('#export')).toBeEnabled({ timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  const settle = () =>
    page.evaluate(async () => {
      await Promise.all(
        document.getAnimations().map((animation) => animation.finished.catch(() => undefined)),
      );
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
  const paintedRail = async (name: string) => {
    const bounds = (await page.locator('#artColors').boundingBox())!;
    // Sample the dashed rail beyond the thumb, away from labels, caps and focus outlines.
    const png = await page.screenshot({ scale: 'css' });
    await info.attach(name, { body: png, contentType: 'image/png' });
    const image = await loadImage(png);
    const width = Math.floor(bounds.width * 0.4);
    const context = createCanvas(width, 4).getContext('2d');
    context.drawImage(
      image,
      -Math.ceil(bounds.x + bounds.width * 0.55),
      -Math.floor(bounds.y + bounds.height / 2) + 1,
    );
    const { data } = context.getImageData(0, 0, width, 4);
    let colored = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i] > 60 && data[i + 1] > 35) colored++;
    return colored;
  };
  await page.locator('[data-tool="color"]').click();
  await expect(page.locator('#artColors')).toBeVisible();
  await settle();
  const initial = await paintedRail('first-color');
  expect(initial).toBeGreaterThan(20);
  for (let cycle = 0; cycle < 3; cycle++) {
    await page.locator('[data-tool="tone"]').click();
    await expect(page.locator('#brightness')).toBeVisible();
    await settle();
    await page.locator('[data-tool="color"]').click();
    await expect(page.locator('#artColors')).toHaveValue('8');
    await settle();
    expect(await paintedRail(`returned-color-${cycle}`)).toBeGreaterThan(initial * 0.75);
  }
});
