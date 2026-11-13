import { expect, type Page } from '@playwright/test';

const labels = { photo: 'Фото', style: 'Стиль', color: 'Цвет', tone: 'Тон' } as const;
type Section = keyof typeof labels;

export async function closeTools(page: Page) {
  const back = page.getByRole('button', { name: 'Назад к настройкам', exact: true });
  if (await back.isVisible()) await back.click();
  const close = page.getByRole('button', { name: 'Показать результат', exact: true });
  if (await close.isVisible()) await close.click();
}

export async function tools(page: Page, section: Section) {
  await closeTools(page);
  const trigger = page.locator(`[data-tool="${section}"]`);
  const phone = await trigger.isVisible();
  if (phone) await trigger.click();
  else {
    const heading = page.getByRole('button', { name: labels[section], exact: true });
    if ((await heading.getAttribute('aria-expanded')) === 'false') await heading.click();
  }
  const container = page.getByRole(phone ? 'dialog' : 'region', {
    name: labels[section],
    exact: true,
  });
  // The legacy acceptance journeys exercise every feature, including advanced fields.
  // Separate feature tests assert that these disclosures start collapsed.
  for (const detail of await container.locator('details').all()) {
    const summary = detail.locator('summary').first();
    if ((await summary.isVisible()) && (await detail.getAttribute('open')) === null) {
      await summary.click();
    }
  }
}

export async function selectMode(page: Page, mode: string) {
  await closeTools(page);
  const choice = page.locator(`[data-mode="${mode}"]`);
  if (!(await choice.isVisible())) {
    await page.getByRole('button', { name: 'Стиль', exact: true }).click();
  }
  await choice.click();
  await expect(page.locator('#export')).toBeEnabled({ timeout: 30000 });
}

export async function setRange(page: Page, key: string, value: string) {
  const row = page.locator(`#edit-${key}`);
  const compact = await row.isVisible();
  if (compact) await row.click();
  await page.locator(`#${key}`).fill(value);
  if (compact) await page.getByRole('button', { name: 'Назад к настройкам', exact: true }).click();
}

export async function expectRange(page: Page, key: string, value: string) {
  const row = page.locator(`#edit-${key}`);
  const compact = await row.isVisible();
  if (compact) await row.click();
  await expect(page.locator(`#${key}`)).toHaveValue(value);
  if (compact) await page.getByRole('button', { name: 'Назад к настройкам', exact: true }).click();
}
