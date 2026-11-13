import type { Settings } from '@/shared/lib/renderer';

export const baseline = ' .,:;!iIl+*tfjrxnuvczXYUJCLQ0OZmwqpdbkhao#MW&8%B@$';
export const defaults: Settings = {
  mode: 'pixel-art',
  halftoneSize: 12,
  halftoneAngle: 45,
  halftoneShape: 'round',
  halftoneColor: 'mono',
  halftoneInk: '#182d75',
  halftonePaper: '#ffffff',
  halftoneInkB: '#e83d86',
  halftoneAngleB: 75,
  halftoneBalance: 0.5,
  halftoneOffsetX: 0,
  halftoneOffsetY: 0,
  artColumns: 64,
  artColors: 8,
  artIterations: 12,
  cellSize: 8,
  cellAspect: 1,
  blockShading: true,
  resolution: 900,
  correction: true,
  brightness: 0,
  contrast: 1,
  saturation: 1,
  pixelate: true,
  pixelSize: 4,
  paletteEnabled: true,
  palette: 'pico-8',
  dither: 'atkinson',
  strength: 0.1,
  font: 'Consolas, monospace',
  fontSize: 12,
  gapX: 0,
  gapY: 0,
  chars: baseline,
  matching: 'tone',
  shapeWeight: 0.45,
  background: '#0c061b',
  blur: 3,
  backgroundOpacity: 1,
  overlayFill: 0.8,
  opacity: 1,
  allowEmpty: true,
  emptyThreshold: 0,
};
export const characterSets: Record<string, string> = {
  Буквы: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  Цифры: '0123456789',
  Знаки: ' .,:;!?+-=*/\\|()[]{}<>~^_@#$%&',
  Рамки: '─│┌┐└┘├┤┬┴┼═║╔╗╚╝╠╣╦╩╬╱╲╳',
  Блоки: ' ░▒▓█▀▄▌▐▖▗▘▙▚▛▜▝▞▟',
  Геометрия: '○●◐◑◒◓◔◕◇◆□■△▲▽▼◀▶',
};
export const presets = [
  { value: 'neon', label: 'Неоновый растр' },
  { value: 'ascii', label: 'Цветной ASCII' },
  { value: 'soft', label: 'Мягкий фон' },
  { value: 'gameboy', label: 'Карманное ретро' },
];
export function presetSettings(name: string, current: Settings): Settings {
  const next: Settings = {
    ...defaults,
    mode: 'pixels',
    chars: current.chars,
    resolution: current.resolution,
  };
  if (name === 'neon') Object.assign(next, { palette: 'neon', dither: 'bayer', strength: 0.65 });
  if (name === 'ascii')
    Object.assign(next, {
      mode: 'ascii',
      palette: 'pico-8',
      dither: 'floyd',
      strength: 0.7,
      fontSize: 12,
    });
  if (name === 'soft')
    Object.assign(next, {
      mode: 'overlay',
      palette: 'dust',
      overlayFill: 0.3,
      fontSize: 15,
      matching: 'shape',
      shapeWeight: 0.55,
      opacity: 0.85,
    });
  if (name === 'gameboy')
    Object.assign(next, { palette: 'gb', pixelSize: 5, dither: 'atkinson', strength: 1 });
  return next;
}
export type NumericSetting = {
  [K in keyof Settings]: Settings[K] extends number ? K : never;
}[keyof Settings];
export const ranges: Record<
  Exclude<NumericSetting, 'resolution'>,
  { label: string; min: number; max: number; step: number }
> = {
  halftoneSize: { label: 'Шаг растра, px', min: 2, max: 40, step: 1 },
  halftoneAngle: { label: 'Угол растра, °', min: 0, max: 180, step: 1 },
  halftoneAngleB: { label: 'Угол второй краски, °', min: 0, max: 180, step: 1 },
  halftoneBalance: { label: 'Баланс красок', min: 0, max: 1, step: 0.05 },
  halftoneOffsetX: { label: 'Сдвиг второй краски по X, px', min: -20, max: 20, step: 1 },
  halftoneOffsetY: { label: 'Сдвиг второй краски по Y, px', min: -20, max: 20, step: 1 },
  artColumns: { label: 'Ширина в пикселях', min: 8, max: 128, step: 1 },
  artColors: { label: 'Цветов в палитре', min: 2, max: 32, step: 1 },
  artIterations: { label: 'Уточнений', min: 2, max: 24, step: 1 },
  cellSize: { label: 'Ширина ячейки', min: 2, max: 40, step: 1 },
  cellAspect: { label: 'Высота / ширина ячейки', min: 0.5, max: 2.5, step: 0.1 },
  brightness: { label: 'Яркость', min: -100, max: 100, step: 1 },
  contrast: { label: 'Контраст', min: 0.25, max: 3, step: 0.05 },
  saturation: { label: 'Насыщенность', min: 0, max: 2.5, step: 0.05 },
  pixelSize: { label: 'Размер пикселя', min: 1, max: 24, step: 1 },
  strength: { label: 'Сила дизеринга', min: 0, max: 1, step: 0.05 },
  shapeWeight: { label: 'Важность формы', min: 0, max: 1, step: 0.05 },
  fontSize: { label: 'Размер символа', min: 8, max: 40, step: 1 },
  gapX: { label: 'Интервал по горизонтали', min: 0, max: 16, step: 1 },
  gapY: { label: 'Интервал по вертикали', min: 0, max: 20, step: 1 },
  blur: { label: 'Размытие фона', min: 0, max: 12, step: 0.5 },
  backgroundOpacity: { label: 'Непрозрачность пиксельного фона', min: 0, max: 1, step: 0.05 },
  overlayFill: { label: 'Непрозрачность заливки ячеек', min: 0, max: 1, step: 0.05 },
  opacity: { label: 'Непрозрачность символов', min: 0, max: 1, step: 0.05 },
  emptyThreshold: { label: 'Заливка однотонных участков', min: 0, max: 40, step: 1 },
};
