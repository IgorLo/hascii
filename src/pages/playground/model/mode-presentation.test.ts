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
  it('shows pixel controls for pixels and stable task sections in every mode', () => {
    const view = modePresentation(selectMode({ ...defaults, mode: 'pixels' }));
    expect(view.controls).toBe('pixels');
    expect(view.pixelGrid).toBe(true);
    expect(view.sections).toEqual([
      { id: 'photo', title: 'Фото', label: 'Фото', drawerTitle: 'Фото' },
      { id: 'style', title: 'Стиль', label: 'Стиль', drawerTitle: 'Стиль' },
      { id: 'color', title: 'Цвет', label: 'Цвет', drawerTitle: 'Цвет' },
      { id: 'tone', title: 'Тон', label: 'Тон', drawerTitle: 'Тон' },
    ]);
  });
  it.each(['halftone', 'pixel-art'] as const)(
    '%s uses specialized controls without renaming task sections',
    (mode) => {
      const view = modePresentation(selectMode({ ...defaults, mode }));
      expect(view.controls).toBe('art');
      expect(view.pixelGrid).toBe(false);
      expect(view.sections.map(({ id, label }) => ({ id, label }))).toEqual([
        { id: 'photo', label: 'Фото' },
        { id: 'style', label: 'Стиль' },
        { id: 'color', label: 'Цвет' },
        { id: 'tone', label: 'Тон' },
      ]);
    },
  );
  it.each(['ascii-fx', 'png2xp'] as const)(
    '%s uses cell controls with the correct block choice',
    (mode) => {
      const view = modePresentation(selectMode({ ...defaults, mode }));
      expect(view.controls).toBe('cells');
      expect(view.blocks).toBe(mode === 'png2xp');
      expect(view.sections[1].label).toBe('Стиль');
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
