import { type ActiveMode, modeOrder, type RenderMode, type Result } from '@/shared/lib/renderer';

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
export type ToolSection = 'photo' | 'tone' | 'color' | 'ascii';
type Section = { id: ToolSection; title: string; label: string; drawerTitle: string };
const commonSections: Section[] = [
  { id: 'photo', title: '01 / Отправная точка', label: 'Фото', drawerTitle: 'Фото и пресеты' },
  { id: 'tone', title: '02 / Холст и тон', label: 'Тон', drawerTitle: 'Холст и тон' },
  { id: 'color', title: '03 / Цвет и дизеринг', label: 'Цвет', drawerTitle: 'Цвет и дизеринг' },
];
const symbolSections: Section[] = [
  ...commonSections,
  { id: 'ascii', title: '04 / Символы', label: 'ASCII', drawerTitle: 'Символы и фон' },
];
const artSections: Section[] = [
  ...commonSections,
  { id: 'ascii', title: '04 / Настройки режима', label: 'Режим', drawerTitle: 'Настройки режима' },
];

/** Presentation is intentionally separate from which mathematical inputs are active. */
export function modePresentation(mode: ActiveMode) {
  const controls =
    mode.kind === 'cells'
      ? 'cells'
      : mode.kind === 'halftone' || mode.kind === 'pixel-art'
        ? 'art'
        : 'symbols';
  return {
    controls,
    pixelGrid: mode.kind === 'pixels',
    blocks: mode.id === 'png2xp',
    sections: controls === 'art' ? artSections : symbolSections,
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
