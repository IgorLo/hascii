import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }, info) => {
  test.skip(info.project.name === 'desktop', 'Compact mobile motion artifacts.');
  await page.goto('/');
  await expect(page.locator('#export')).toBeEnabled({ timeout: 30000 });
});

test('a completed panel exit stays invisible while preview motion finishes', async ({ page }) => {
  const tone = page.locator('[data-tool="tone"]');
  await tone.click();
  await expect(page.locator('#brightness')).toBeVisible();
  await page.evaluate(() =>
    Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))),
  );
  await tone.click();
  await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBeGreaterThan(0);
  const visible = await page.evaluate(async () => {
    const animations = document.getAnimations();
    animations.forEach((animation) => animation.pause());
    const exit = animations.find(
      (animation) =>
        animation.effect instanceof KeyframeEffect &&
        animation.effect.target instanceof HTMLElement &&
        animation.effect.target.matches('.mobile-panel'),
    )!;
    const end = exit.effect!.getComputedTiming().endTime as number;
    animations.forEach((animation) => {
      animation.currentTime = end + 1;
    });
    exit.finish();
    await new Promise(requestAnimationFrame);
    const painted = [...document.querySelectorAll('.mobile-panel')].flatMap((panel) => {
      const style = getComputedStyle(panel);
      const bounds = panel.getBoundingClientRect();
      return Number(style.opacity) > 0 && bounds.height > 1
        ? [{ height: bounds.height, opacity: style.opacity }]
        : [];
    });
    animations.forEach((animation) => animation.finish());
    return painted;
  });
  expect(visible).toEqual([]);
  await expect(page.getByRole('region', { name: /^Инструменты:/ })).toBeHidden();
});

test('opening and closing do not introduce scrollbars or change content width', async ({
  page,
}) => {
  const sampleMotion = async () => {
    await expect
      .poll(() => page.evaluate(() => document.getAnimations().length))
      .toBeGreaterThan(0);
    return page.evaluate(() => {
      const animations = document.getAnimations();
      animations.forEach((animation) => animation.pause());
      const panel = animations.find(
        (animation) =>
          animation.effect instanceof KeyframeEffect &&
          animation.effect.target instanceof HTMLElement &&
          animation.effect.target.matches('.mobile-panel'),
      )!;
      const end = panel.effect!.getComputedTiming().endTime as number;
      const body = document.querySelector<HTMLElement>('.mobile-panel .panel-body')!;
      animations.forEach((animation) => {
        animation.currentTime = end;
      });
      const finalWidth = body.clientWidth;
      const frames = [0.2, 0.5, 0.8].map((progress) => {
        animations.forEach((animation) => {
          animation.currentTime = end * progress;
        });
        const style = getComputedStyle(body);
        return {
          width: body.clientWidth,
          scrollbar:
            ['auto', 'scroll'].includes(style.overflowY) && body.scrollHeight > body.clientHeight,
        };
      });
      animations.forEach((animation) => animation.finish());
      return { finalWidth, frames };
    });
  };
  const tone = page.locator('[data-tool="tone"]');
  await tone.click();
  await expect(page.locator('#brightness')).toBeVisible();
  const opening = await sampleMotion();
  expect(opening.frames).toEqual(
    opening.frames.map(() => ({ width: opening.finalWidth, scrollbar: false })),
  );
  await tone.click();
  const closing = await sampleMotion();
  expect(closing.frames).toEqual(
    closing.frames.map(() => ({ width: closing.finalWidth, scrollbar: false })),
  );
});
