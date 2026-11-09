import { describe, expect, it } from 'vitest';

import { builtInPalettes, parsePaletteSlug, validPalette } from './index';

describe('palette boundary', () => {
  it('accepts a slug and a Lospec URL', () => {
    expect(parsePaletteSlug('sweetie-16')).toBe('sweetie-16');
    expect(parsePaletteSlug('https://lospec.com/palette-list/sweetie-16.json')).toBe('sweetie-16');
  });
  it.each([
    'https://evil.test/palette-list/a',
    '../a',
    '',
    'a'.repeat(121),
    'https://lospec.com/elsewhere/a',
  ])('rejects unsafe identifier %s', (input) => {
    expect(() => parsePaletteSlug(input)).toThrow();
  });
  it('validates palette colors and limits', () => {
    expect(builtInPalettes.every(validPalette)).toBe(true);
    expect(validPalette({ id: 'a', name: 'a', author: 'a', colors: ['<script>'] })).toBe(false);
    expect(validPalette({ id: 'a', name: 'a', author: 'a', colors: [] })).toBe(false);
    expect(
      validPalette({ id: 'a', name: 'a', author: 'a', colors: Array(1025).fill('ffffff') }),
    ).toBe(false);
    expect(validPalette(null)).toBe(false);
  });
});
