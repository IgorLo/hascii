import { describe, expect, it } from 'vitest';

import { selectMode } from '@/shared/lib/renderer';

import { formatRecipe, modeChoices, modePresentation } from './mode-presentation';
import { defaults } from './settings';

describe('mode presentation', () => {
  it('keeps the established choices and order', () => {
    expect(modeChoices).toEqual([
      { value: 'pixel-art', label: 'Pixel Art' },
      { value: 'pixels', label: 'Пиксели' },
      { value: 'halftone', label: 'Halftone' },
      { value: 'overlay', label: 'Фон + ASCII' },
      { value: 'ascii', label: 'ASCII' },
      { value: 'ascii-fx', label: 'ASCII FX' },
      { value: 'png2xp', label: 'png2xp' },
    ]);
  });
  it('keeps visible symbol controls distinct from active pixel parameters', () => {
    const view = modePresentation(selectMode({ ...defaults, mode: 'pixels' }));
    expect(view.controls).toBe('symbols');
    expect(view.pixelGrid).toBe(true);
    expect(view.sections).toEqual([
      { id: 'photo', title: '01 / Отправная точка', label: 'Фото', drawerTitle: 'Фото и пресеты' },
      { id: 'tone', title: '02 / Холст и тон', label: 'Тон', drawerTitle: 'Холст и тон' },
      { id: 'color', title: '03 / Цвет и дизеринг', label: 'Цвет', drawerTitle: 'Цвет и дизеринг' },
      { id: 'ascii', title: '04 / Символы', label: 'ASCII', drawerTitle: 'Символы и фон' },
    ]);
  });
  it.each(['halftone', 'pixel-art'] as const)(
    '%s uses specialized controls and the existing tool labels',
    (mode) => {
      const view = modePresentation(selectMode({ ...defaults, mode }));
      expect(view.controls).toBe('art');
      expect(view.pixelGrid).toBe(false);
      expect(view.sections[3]).toEqual({
        id: 'ascii',
        title: '04 / Настройки режима',
        label: 'Режим',
        drawerTitle: 'Настройки режима',
      });
    },
  );
  it.each(['ascii-fx', 'png2xp'] as const)(
    '%s uses cell controls with the correct block choice',
    (mode) => {
      const view = modePresentation(selectMode({ ...defaults, mode }));
      expect(view.controls).toBe('cells');
      expect(view.blocks).toBe(mode === 'png2xp');
      expect(view.sections[3].label).toBe('ASCII');
    },
  );
  it('formats automatic-palette and ink recipes from selected renderer inputs', () => {
    const result = { columns: 64, rows: 80, glyphs: 0 };
    expect(formatRecipe(selectMode(defaults), result, 'PICO-8')).toBe(
      'Pixel Art · 64 × 80 пикселей · до 8 цветов · автоматическая палитра',
    );
    expect(
      formatRecipe(
        selectMode({ ...defaults, mode: 'halftone', halftoneColor: 'duotone' }),
        result,
        'PICO-8',
      ),
    ).toBe('Halftone · 12 px · 45° · две краски');
  });
  it('keeps selected palette, disabled palette and glyph-count recipe text', () => {
    const result = { columns: 12, rows: 9, glyphs: 5 };
    expect(formatRecipe(selectMode({ ...defaults, mode: 'ascii' }), result, 'PICO-8')).toBe(
      '12 × 9 ячеек · PICO-8 · atkinson · 5 символов',
    );
    expect(
      formatRecipe(
        selectMode({ ...defaults, mode: 'pixels', paletteEnabled: false }),
        { ...result, glyphs: 0 },
        'PICO-8',
      ),
    ).toBe('12 × 9 ячеек · исходные цвета · без дизеринга');
  });
});
