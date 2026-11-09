import type { Palette } from '../renderer';

export const builtInPalettes: Palette[] = [
  {
    id: 'neon',
    name: 'Neon ink · 4',
    author: 'Локальная палитра по референсу',
    colors: ['0c061b', 'fa327e', '37cbd3', 'd1f9fc'],
  },
  {
    id: 'pico-8',
    name: 'PICO-8',
    author: 'Lexaloffle',
    url: 'https://lospec.com/palette-list/pico-8',
    colors: [
      '000000',
      '1d2b53',
      '7e2553',
      '008751',
      'ab5236',
      '5f574f',
      'c2c3c7',
      'fff1e8',
      'ff004d',
      'ffa300',
      'ffec27',
      '00e436',
      '29adff',
      '83769c',
      'ff77a8',
      'ffccaa',
    ],
  },
  {
    id: 'gb',
    name: 'Pocket green · 4',
    author: 'Локальная ретропалитра',
    colors: ['0f380f', '306230', '8bac0f', '9bbc0f'],
  },
  { id: 'mono', name: 'Paper & ink · 2', author: 'Монохром', colors: ['000000', 'ffffff'] },
  {
    id: 'dust',
    name: 'Dust · 5',
    author: 'Локальная палитра',
    colors: ['25283d', '705d56', 'b88b76', 'dbb69b', 'eee9de'],
  },
];

export function validPalette(value: unknown): value is Palette {
  if (!value || typeof value !== 'object') return false;
  const p = value as Partial<Palette>;
  return (
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    typeof p.author === 'string' &&
    Array.isArray(p.colors) &&
    p.colors.length > 0 &&
    p.colors.length <= 1024 &&
    p.colors.every((c) => typeof c === 'string' && /^[0-9a-f]{6}$/i.test(c)) &&
    (p.url === undefined ||
      (typeof p.url === 'string' &&
        /^https:\/\/lospec\.com\/palette-list\/[a-z0-9-]+$/.test(p.url)))
  );
}

export function parsePaletteSlug(input: string): string {
  let slug = input.trim();
  if (/^https?:\/\//.test(slug)) {
    const url = new URL(slug);
    if (
      !['lospec.com', 'www.lospec.com'].includes(url.hostname) ||
      !url.pathname.startsWith('/palette-list/')
    ) {
      throw new Error('Нужна ссылка на палитру lospec.com.');
    }
    slug = url.pathname
      .slice('/palette-list/'.length)
      .replace(/\/$/, '')
      .replace(/\.json$/, '');
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 120) {
    throw new Error('Вставь ссылку на палитру или её имя, например sweetie-16.');
  }
  return slug;
}
