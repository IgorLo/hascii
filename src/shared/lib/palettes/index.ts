import type { Palette } from '../renderer';

export const builtInPalettes: Palette[] = [
  {
    id: 'neon',
    name: 'Neon ink',
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
    name: 'Pocket green',
    author: 'Локальная ретропалитра',
    colors: ['0f380f', '306230', '8bac0f', '9bbc0f'],
  },
  { id: 'mono', name: 'Paper & ink', author: 'Монохром', colors: ['000000', 'ffffff'] },
  {
    id: 'dust',
    name: 'Dust',
    author: 'Локальная палитра',
    colors: ['25283d', '705d56', 'b88b76', 'dbb69b', 'eee9de'],
  },
  {
    id: 'lost-century',
    name: 'Lost Century',
    author: 'SurrealEmber',
    url: 'https://lospec.com/palette-list/lost-century',
    colors: [
      'd1b187',
      'c77b58',
      'ae5d40',
      '79444a',
      '4b3d44',
      'ba9158',
      '927441',
      '4d4539',
      '77743b',
      'b3a555',
      'd2c9a5',
      '8caba1',
      '4b726e',
      '574852',
      '847875',
      'ab9b8e',
    ],
  },
  {
    id: 'midnight-ablaze',
    name: 'Midnight ablaze',
    author: 'Inkpendude',
    url: 'https://lospec.com/palette-list/midnight-ablaze',
    colors: ['ff8274', 'd53c6a', '7c183c', '460e2b', '31051e', '1f0510', '130208'],
  },
  {
    id: 'blessing',
    name: 'Blessing',
    author: 'clarigariccus / Maruki',
    url: 'https://lospec.com/palette-list/blessing',
    colors: ['74569b', '96fbc7', 'f7ffae', 'ffb3cb', 'd8bfd8'],
  },
  {
    id: 'eulbink',
    name: 'Eulbink',
    author: 'Inkpendude',
    url: 'https://lospec.com/palette-list/eulbink',
    colors: ['ffffff', '0ce6f2', '0098db', '1e579c', '203562', '252446', '201533'],
  },
  {
    id: 'waldgeist',
    name: 'Waldgeist',
    author: 'Acid Burritos',
    url: 'https://lospec.com/palette-list/waldgeist',
    colors: [
      'a6884a',
      '906c30',
      '825337',
      '83473d',
      '66352e',
      '562923',
      '612638',
      '46332c',
      '323230',
      '3e4055',
      '382d35',
      '323b42',
      '1f2d36',
      '141f25',
      '0b1016',
      '245273',
      '4e7499',
      '5e7e8b',
      '798a92',
      '879ea3',
      'e3ddd1',
      'bdbbae',
      'af9e94',
      '907c75',
      'a29f7e',
      '969372',
      '78735d',
      '696353',
      '4f493b',
      '212528',
      '595c55',
      '4b4e4f',
      '57562a',
      '675f30',
      '727234',
      '73804b',
      '5f7b53',
      '3b6d62',
      '32534a',
    ],
  },
  {
    id: 'cl8uds',
    name: 'CL8UDS',
    author: '_Nicola',
    url: 'https://lospec.com/palette-list/cl8uds',
    colors: ['fcb08c', 'ef9d7f', 'd6938a', 'b48d92', 'a597a1', '8fa0bf', '9aabc9', 'a5b7d4'],
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
