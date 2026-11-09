import { error, json } from '@sveltejs/kit';

import { parsePaletteSlug, validPalette } from '@/shared/lib/palettes';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, fetch }) => {
  let slug: string;
  try { slug = parsePaletteSlug(params.slug); } catch { error(400, 'Некорректное имя палитры.'); }
  let response: Response;
  try {
    response = await fetch(`https://lospec.com/palette-list/${slug}.json`, { signal: AbortSignal.timeout(15000), redirect: 'error' });
  } catch { error(502, 'Lospec недоступен. Попробуй ещё раз позже.'); }
  if (!response.ok) error(response.status === 404 ? 404 : 502, 'Lospec не вернул палитру.');
  let data: unknown;
  try { data = await response.json(); } catch { error(502, 'Lospec вернул некорректный ответ.'); }
  if (!data || typeof data !== 'object') error(502, 'Неподдерживаемая палитра.');
  const raw = data as Record<string, unknown>;
  const palette = { id: slug, name: raw.name, author: typeof raw.author === 'string' ? raw.author : 'Lospec', colors: raw.colors, url: `https://lospec.com/palette-list/${slug}` };
  if (!validPalette(palette)) error(502, 'Ожидается палитра из 1–1024 HEX-цветов.');
  return json(palette, { headers: { 'Cache-Control': 'no-store' } });
};
