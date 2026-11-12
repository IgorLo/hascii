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
  cellSize: 8,
  cellAspect: 1,
  blockShading: true,
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
  overlayFill: 0.3,
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
  it.each(['#000000', '#eee9de'])(
    'zero cell fill is exactly the same ASCII on %s',
    (background) => {
      const source = uniform(188);
      for (let i = 0; i < source.data.length; i += 4) source.data[i] = i % 256;
      const job = {
        id: 1,
        image: source,
        settings: { ...settings, background, overlayFill: 0 },
        palette: [
          [32, 32, 32],
          [240, 240, 240],
        ] as [number, number, number][],
      };
      const ascii = render(job);
      const overlay = render({
        ...job,
        settings: { ...job.settings, mode: 'overlay', pixelSize: 19, pixelate: false, blur: 9 },
      });
      expect(overlay.image!.data.every((v, i) => v === ascii.image!.data[i])).toBe(true);
    },
  );
  it('cell fill covers the gaps and ignores independent pixel size', () => {
    const image = run(
      {
        mode: 'overlay',
        overlayFill: 0.3,
        opacity: 0,
        allowEmpty: false,
        chars: '+',
        gapX: 3,
        gapY: 4,
      },
      192,
    ).image!;
    expect([...image.data].filter((_, i) => i % 4 !== 3).every((v) => Math.abs(v - 58) <= 1)).toBe(
      true,
    );
    const first = run({
      mode: 'overlay',
      overlayFill: 0.3,
      pixelSize: 1,
      allowEmpty: false,
    }).image!;
    const second = run({
      mode: 'overlay',
      overlayFill: 0.3,
      pixelSize: 23,
      pixelate: false,
      blur: 10,
      allowEmpty: false,
    }).image!;
    expect(first.data).toEqual(second.data);
  });
  it.each([
    [2, 1],
    [2, 1.5],
    [3, 1],
  ])('png2xp preserves shade coverage at width %s and aspect %s', (cellSize, cellAspect) => {
    const width = cellSize,
      height = Math.round(width * cellAspect);
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) data.set([188, 188, 188, 255], i);
    const result = render({
      id: 1,
      image: new ImageData(data, width, height),
      settings: { ...settings, mode: 'png2xp', cellSize, cellAspect },
      palette: [
        [0, 0, 0],
        [255, 255, 255],
      ],
    }).image!;
    expect([...result.data].filter((value, i) => i % 4 === 0 && value === 255)).toHaveLength(
      Math.round((width * height) / 2),
    );
  });
  it('ASCII FX keeps the first cell sampling stable with a partial last cell', () => {
    const data = new Uint8ClampedArray(9 * 8 * 4);
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 9; x++)
        data.set(x < 4 ? [0, 0, 0, 255] : [255, 255, 255, 255], (y * 9 + x) * 4);
    const image = render({
      id: 1,
      image: new ImageData(data, 9, 8),
      settings: {
        ...settings,
        mode: 'ascii-fx',
        chars: ' ',
        paletteEnabled: false,
        emptyThreshold: 0,
      },
      palette: [],
    }).image!;
    expect([...image.data.slice(0, 3)]).toEqual([128, 128, 128]);
    expect([...image.data.slice(8 * 4, 8 * 4 + 3)]).toEqual([255, 255, 255]);
  });
  it.each(['ascii-fx', 'png2xp'] as const)('%s disables every dither at zero strength', (mode) => {
    const source = uniform(188);
    for (let i = 0; i < source.data.length; i += 4) source.data[i] = i % 256;
    const job = {
      id: 1,
      image: source,
      settings: { ...settings, mode, strength: 0 },
      palette: [
        [0, 0, 0],
        [255, 255, 255],
      ] as [number, number, number][],
    };
    const plain = render(job).image!.data;
    for (const dither of ['bayer', 'floyd', 'atkinson'] as const) {
      expect(render({ ...job, settings: { ...job.settings, dither } }).image!.data).toEqual(plain);
    }
  });
  it.each(['none', 'bayer', 'floyd', 'atkinson'] as const)(
    'png2xp paints only palette colors with %s',
    (dither) => {
      const source = uniform(188);
      for (let i = 0; i < source.data.length; i += 4) source.data[i] = i % 256;
      const image = render({
        id: 1,
        image: source,
        settings: { ...settings, mode: 'png2xp', dither, strength: 0.8 },
        palette: [
          [0, 0, 0],
          [255, 255, 255],
        ],
      }).image!;
      for (let i = 0; i < image.data.length; i += 4) {
        expect([
          [0, 0, 0],
          [255, 255, 255],
        ]).toContainEqual([...image.data.slice(i, i + 3)]);
      }
    },
  );
  it('png2xp uses a half-coverage shade for a linear-light black/white midpoint', () => {
    const job = {
      id: 1,
      image: uniform(188),
      settings: { ...settings, mode: 'png2xp' as const, cellSize: 8 },
      palette: [
        [0, 0, 0],
        [255, 255, 255],
      ] as [number, number, number][],
    };
    const shaded = render(job).image!;
    expect([...shaded.data].filter((value, i) => i % 4 === 0 && value === 255)).toHaveLength(288);
    const solid = render({ ...job, settings: { ...job.settings, blockShading: false } }).image!;
    expect([...solid.data].filter((_, i) => i % 4 === 0).every((v) => v === 255)).toBe(true);
  });
  it.each(['ascii-fx', 'png2xp'] as const)(
    '%s handles odd/tiny images and large or single-color palettes',
    (mode) => {
      for (const [width, height] of [
        [1, 1],
        [7, 5],
      ])
        for (const count of [1, 1024]) {
          const data = new Uint8ClampedArray(width * height * 4);
          for (let i = 0; i < data.length; i += 4) data.set([17, 17, 17, 255], i);
          const result = render({
            id: 11,
            image: new ImageData(data, width, height),
            settings: { ...settings, mode, cellAspect: 1.5 },
            palette:
              count === 1
                ? [[17, 17, 17]]
                : [
                    ...Array.from(
                      { length: 1023 },
                      (_, i) => [i % 256, Math.floor(i / 256), 255] as [number, number, number],
                    ),
                    [17, 17, 17],
                  ],
          });
          expect([result.id, result.image!.width, result.image!.height]).toEqual([
            11,
            width,
            height,
          ]);
          expect(
            [...result.image!.data].every((value, i) => value === (i % 4 === 3 ? 255 : 17)),
          ).toBe(true);
        }
    },
  );
  it.each(['ascii-fx', 'png2xp'] as const)(
    '%s applies foreground and background opacity',
    (mode) => {
      const image = run({ mode, opacity: 0, backgroundOpacity: 0 }).image!;
      expect([...image.data].every((value, i) => value === (i % 4 === 3 ? 255 : 0))).toBe(true);
    },
  );
  it('ASCII FX rejects an empty forbidden alphabet and png2xp ignores it', () => {
    expect(() => run({ mode: 'ascii-fx', chars: '', allowEmpty: false })).toThrow(
      'Добавьте хотя бы один символ',
    );
    expect(run({ mode: 'png2xp', chars: '', allowEmpty: false }).image).toBeDefined();
  });
  it.each(['horizontal', 'vertical'])(
    'png2xp preserves a %s two-color boundary in one cell',
    (direction) => {
      const source = uniform(0);
      for (let y = 0; y < 24; y++)
        for (let x = 0; x < 24; x++) {
          source.data[(y * 24 + x) * 4 + ((direction === 'horizontal' ? y : x) < 12 ? 0 : 2)] = 255;
        }
      const result = render({
        id: 1,
        image: source,
        settings: { ...settings, mode: 'png2xp', cellSize: 24, cellAspect: 1 },
        palette: [
          [255, 0, 0],
          [0, 0, 255],
        ],
      });
      expect([result.columns, result.rows]).toEqual([1, 1]);
      const pixel = (x: number, y: number) => [
        ...result.image!.data.slice((y * 24 + x) * 4, (y * 24 + x) * 4 + 3),
      ];
      expect(pixel(4, 4)).toEqual([255, 0, 0]);
      expect(pixel(19, 19)).toEqual([0, 0, 255]);
    },
  );
  it('ASCII FX preserves two colors inside one cell instead of averaging the whole cell', () => {
    const source = uniform(0);
    for (let y = 0; y < 24; y++)
      for (let x = 0; x < 24; x++) {
        const i = (y * 24 + x) * 4;
        source.data[i + (y < 12 ? 0 : 2)] = 255;
      }
    const result = render({
      id: 9,
      image: source,
      settings: {
        ...settings,
        mode: 'ascii-fx',
        cellSize: 24,
        cellAspect: 1,
        blockShading: true,
        chars: '▀▄█',
        allowEmpty: false,
      },
      palette: [
        [255, 0, 0],
        [0, 0, 255],
      ],
    });
    expect([result.columns, result.rows]).toEqual([1, 1]);
    const pixels = result.image!.data;
    expect([...pixels.slice((4 * 24 + 12) * 4, (4 * 24 + 12) * 4 + 3)]).toEqual([255, 0, 0]);
    expect([...pixels.slice((19 * 24 + 12) * 4, (19 * 24 + 12) * 4 + 3)]).toEqual([0, 0, 255]);
  });
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
  it.each([0, 0.5, 1])(
    'flat overlay cells preserve the same color as ASCII at fill %s',
    (overlayFill) => {
      const image = run({ mode: 'overlay', overlayFill, opacity: 0 }).image!;
      expect([...image.data].filter((_, i) => i % 4 !== 3).every((v) => v === 255)).toBe(true);
    },
  );
  it('glyphs remain visible over a fully transparent cell fill', () => {
    const image = run({ mode: 'overlay', overlayFill: 0, allowEmpty: false }).image!;
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
