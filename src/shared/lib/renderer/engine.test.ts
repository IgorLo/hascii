import { Canvas, ImageData as NativeImageData } from '@napi-rs/canvas';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { quantize, render } from './engine';
import type { Settings } from './types';

beforeAll(() => {
  vi.stubGlobal('OffscreenCanvas', Canvas);
  vi.stubGlobal('ImageData', NativeImageData);
});

const settings: Settings = {
  mode: 'ascii',
  resolution: 900,
  correction: false,
  brightness: 0,
  contrast: 1,
  saturation: 1,
  pixelate: true,
  pixelSize: 4,
  paletteEnabled: true,
  palette: 'test',
  dither: 'none',
  strength: 0,
  font: 'monospace',
  fontSize: 12,
  gapX: 0,
  gapY: 0,
  chars: '-+#',
  matching: 'shape',
  shapeWeight: 0.5,
  background: '#000000',
  blur: 0,
  backgroundOpacity: 1,
  opacity: 1,
  allowEmpty: true,
  emptyThreshold: 1,
};
function uniform(value: number) {
  const data = new Uint8ClampedArray(24 * 24 * 4);
  for (let i = 0; i < data.length; i += 4) {
    data.fill(value, i, i + 3);
    data[i + 3] = 255;
  }
  return new ImageData(data, 24, 24);
}
function run(overrides: Partial<Settings> = {}, value = 255) {
  return render({
    id: 7,
    image: uniform(value),
    settings: { ...settings, ...overrides },
    palette: [[value, value, value]],
  });
}
describe('renderer regressions', () => {
  it('preserves image dimensions and request identity', () => {
    const result = run({ mode: 'pixels' });
    expect([result.id, result.image?.width, result.image?.height]).toEqual([7, 24, 24]);
  });
  it.each(['none', 'bayer', 'floyd', 'atkinson'])('limits colors with %s', (algorithm) => {
    const out = quantize(
      Float32Array.from({ length: 12 * 3 }, (_, i) => (i * 27) % 256),
      4,
      3,
      [
        [0, 0, 0],
        [255, 255, 255],
      ],
      algorithm,
      0.8,
    );
    expect([...out].every((v) => v === 0 || v === 255)).toBe(true);
  });
  it.each([0, 0.35, 1])('flat ASCII cells retain their color at glyph opacity %s', (opacity) => {
    for (const value of [32, 240]) {
      const result = run({ opacity }, value).image!;
      expect([...result.data].filter((_, i) => i % 4 !== 3).every((v) => v === value)).toBe(true);
    }
  });
  it.each([0, 0.5, 1])('background opacity %s affects flat overlay cells', (backgroundOpacity) => {
    const image = run({ mode: 'overlay', backgroundOpacity, opacity: 0 }).image!;
    expect(
      [...image.data]
        .filter((_, i) => i % 4 !== 3)
        .every((v) => Math.abs(v - 255 * backgroundOpacity) <= 1),
    ).toBe(true);
  });
  it('glyphs remain visible over a fully transparent pixel layer', () => {
    const image = run({ mode: 'overlay', backgroundOpacity: 0, allowEmpty: false }).image!;
    expect([...image.data].some((v, i) => i % 4 === 0 && v > 0)).toBe(true);
  });
  it('pixel-only mode ignores background opacity', () => {
    expect(run({ mode: 'pixels', backgroundOpacity: 0 }).image!.data[0]).toBe(255);
  });
  it('rejects an empty alphabet when blank cells are forbidden', () => {
    expect(() => run({ chars: '', allowEmpty: false })).toThrow('Добавьте хотя бы один символ');
    expect(run({ chars: '', allowEmpty: true }).image).toBeDefined();
  });
});
