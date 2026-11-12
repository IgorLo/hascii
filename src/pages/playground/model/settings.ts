import type { Settings } from '@/shared/lib/renderer';

export const baseline = ' .,:;!iIl+*tfjrxnuvczXYUJCLQ0OZmwqpdbkhao#MW&8%B@$';
export const defaults: Settings = {
  mode: 'pixels',
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
  palette: 'neon',
  dither: 'bayer',
  strength: 0.65,
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
  overlayFill: 0.3,
  opacity: 1,
  allowEmpty: true,
  emptyThreshold: 6,
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
  const next = { ...defaults, chars: current.chars, resolution: current.resolution };
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
