import {
  type ActiveMode,
  modeOrder,
  type RenderMode,
  type Result,
  type Settings,
} from '@/shared/lib/renderer';

import type { ranges } from './settings';

const labels: Record<RenderMode, string> = {
  'pixel-art': 'Pixel Art',
  pixels: 'Пиксели',
  halftone: 'Halftone',
  overlay: 'Фон + ASCII',
  ascii: 'ASCII',
  'ascii-fx': 'ASCII FX',
  png2xp: 'png2xp',
};
export const modeChoices = modeOrder.map((value) => ({ value, label: labels[value] }));
export type ToolSection = 'photo' | 'style' | 'color' | 'tone';
export const mobileParameterLabels: Partial<Record<keyof typeof ranges, string>> = {
  fontSize: 'Размер символа',
  overlayFill: 'Заливка',
  shapeWeight: 'Подбор формы',
  cellSize: 'Ширина ячейки',
  cellAspect: 'Пропорции',
  gapX: 'Интервал X',
  gapY: 'Интервал Y',
  emptyThreshold: 'Заливка участков',
  backgroundOpacity: 'Фон ячеек',
  opacity: 'Непрозрачность',
  halftoneSize: 'Шаг растра',
  halftoneAngle: 'Угол',
  halftoneAngleB: 'Угол 2',
  halftoneOffsetX: 'Сдвиг X',
  halftoneOffsetY: 'Сдвиг Y',
};
type Section = { id: ToolSection; title: string; label: string; drawerTitle: string };
const sections: Section[] = [
  { id: 'photo', title: 'Фото', label: 'Фото', drawerTitle: 'Фото' },
  { id: 'style', title: 'Стиль', label: 'Стиль', drawerTitle: 'Стиль' },
  { id: 'color', title: 'Цвет', label: 'Цвет', drawerTitle: 'Цвет' },
  { id: 'tone', title: 'Тон', label: 'Тон', drawerTitle: 'Тон' },
];

/** App presentation only: the renderer remains the owner of mathematical inputs. */
export function mobileStyleRanges(settings: Settings): (keyof typeof ranges)[] {
  if (settings.mode === 'pixel-art') return ['artColumns', 'artIterations'];
  if (settings.mode === 'pixels') return settings.pixelate ? ['pixelSize'] : [];
  if (settings.mode === 'halftone')
    return settings.halftoneColor === 'duotone'
      ? ['halftoneSize', 'halftoneAngle', 'halftoneAngleB', 'halftoneOffsetX', 'halftoneOffsetY']
      : ['halftoneSize', 'halftoneAngle'];
  const cells = settings.mode === 'ascii-fx' || settings.mode === 'png2xp';
  const keys: (keyof typeof ranges)[] = cells ? ['cellSize', 'cellAspect'] : ['fontSize'];
  if (settings.mode === 'overlay') keys.push('overlayFill');
  if (!cells && settings.matching === 'shape') keys.push('shapeWeight');
  if (settings.mode !== 'png2xp') {
    keys.push('gapX', 'gapY');
    if (settings.allowEmpty) keys.push('emptyThreshold');
  }
  if (cells) keys.push('backgroundOpacity');
  keys.push('opacity');
  return keys;
}

/** Presentation is intentionally separate from which mathematical inputs are active. */
export function modePresentation(mode: ActiveMode) {
  const controls =
    mode.kind === 'pixels'
      ? 'pixels'
      : mode.kind === 'cells'
        ? 'cells'
        : mode.kind === 'halftone' || mode.kind === 'pixel-art'
          ? 'art'
          : 'symbols';
  return {
    controls,
    pixelGrid: mode.kind === 'pixels',
    blocks: mode.id === 'png2xp',
    sections,
  };
}

export function formatRecipe(
  mode: ActiveMode,
  result: Pick<Result, 'columns' | 'rows' | 'glyphs'>,
  paletteName: string,
) {
  if (mode.id === 'halftone') {
    const colors = { mono: 'одна краска', cmyk: 'CMYK', duotone: 'две краски' };
    return `Halftone · ${mode.options.size} px · ${mode.options.angle}° · ${colors[mode.options.colorMode]}`;
  }
  if (mode.id === 'pixel-art')
    return `Pixel Art · ${result.columns} × ${result.rows} пикселей · до ${mode.options.colorCount} цветов · автоматическая палитра`;
  return `${result.columns} × ${result.rows} ячеек · ${mode.paletteEnabled ? paletteName : 'исходные цвета'} · ${mode.paletteEnabled ? mode.options.dither : 'без дизеринга'}${result.glyphs ? ' · ' + result.glyphs + ' символов' : ''}`;
}
