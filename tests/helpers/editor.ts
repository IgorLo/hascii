import { expect, type Locator, type Page } from '@playwright/test';

const labels = { photo: 'Фото', style: 'Стиль', color: 'Цвет', tone: 'Тон' } as const;
type Section = keyof typeof labels;

async function expandAll(container: Locator) {
  await expect(container).toBeVisible();
  for (const detail of await container.locator('details').all()) {
    const summary = detail.locator('summary').first();
    if ((await summary.isVisible()) && (await detail.getAttribute('open')) === null)
      await summary.click();
  }
}

export async function closeTools(page: Page) {
  const picker = page.getByRole('dialog', { name: 'Выбор палитры' });
  if (await picker.isVisible()) {
    await page.keyboard.press('Escape');
    await expect(picker).toBeHidden();
  }
  const back = page.getByRole('button', { name: 'Назад к настройкам', exact: true });
  if (await back.isVisible()) {
    await back.click();
    await expect(page.getByRole('dialog')).toBeHidden();
  }
  if (await page.locator('.editor-shell.adjusting').isVisible()) {
    // Native dialog close precedes SvelteKit's asynchronous history traversal.
    await expect
      .poll(
        async () =>
          (await page.locator('.mobile-panel').isVisible()) ||
          (await page.getByRole('dialog').isVisible()) ||
          !(await page.locator('.editor-shell.adjusting').isVisible()),
      )
      .toBe(true);
  }
  const close = page.getByRole('button', { name: 'Показать результат', exact: true });
  if (await close.isVisible()) {
    try {
      await close.click({ timeout: 1000 });
    } catch (error) {
      // Escape/history can finish presenting the closed state during this click.
      if (await close.isVisible()) throw error;
    }
    await expect(page.getByRole('region', { name: /^Инструменты:/ })).toBeHidden();
    await expect(page.getByRole('dialog')).toBeHidden();
  }
}

async function styleDetails(page: Page) {
  await page.locator('[data-open-details="style"]').click();
  const panel = page.getByRole('dialog', { name: 'Подробности стиля' });
  await expect(panel).toBeVisible();
  await expandAll(panel);
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
  if (phone && section === 'style') {
    await styleDetails(page);
    return;
  }
  const container = page.getByRole(phone && section === 'photo' ? 'dialog' : 'region', {
    name: phone && section !== 'photo' ? `Инструменты: ${labels[section]}` : labels[section],
    exact: true,
  });
  await expandAll(container);
}

export async function openImport(page: Page) {
  const button = page.locator('[data-open-details="import"]');
  if (await button.isVisible()) await button.click();
}

export async function closeImport(page: Page) {
  const dialog = page.getByRole('dialog', { name: 'Импорт палитры' });
  if (await dialog.isVisible()) {
    await dialog.getByRole('button', { name: 'Назад к настройкам', exact: true }).click();
    await expect(dialog).toBeHidden();
  }
}

export async function selectMode(page: Page, mode: string) {
  await closeTools(page);
  await page.locator(`[data-mode="${mode}"]`).click();
  await expect(page.locator('#export')).toBeEnabled({ timeout: 30000 });
}

async function chooseRange(page: Page, key: string) {
  const row = page.locator(`#edit-${key}`);
  const compact = await row.isVisible();
  if (compact) {
    await row.click();
    await expect(page.getByRole('dialog')).toBeHidden();
  }
  const choice = page.locator(`[data-parameter="${key}"]`);
  if (!(await page.locator(`#${key}`).isVisible()) && (await choice.isVisible()))
    await choice.click();
  return compact;
}

export async function setRange(page: Page, key: string, value: string) {
  const compact = await chooseRange(page, key);
  await page.locator(`#${key}`).fill(value);
  if (compact) await styleDetails(page);
}

export async function expectRange(page: Page, key: string, value: string) {
  const compact = await chooseRange(page, key);
  await expect(page.locator(`#${key}`)).toHaveValue(value);
  if (compact) await styleDetails(page);
}
