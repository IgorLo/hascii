import { ImageData as NativeImageData } from '@napi-rs/canvas';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { renderPixelArt } from './pixel-art';

beforeAll(() => vi.stubGlobal('ImageData', NativeImageData));

function fixture(width: number, height: number, color: (x: number, y: number) => number[]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) data.set([...color(x, y), 255], (y * width + x) * 4);
  return new ImageData(data, width, height);
}

const options = { columns: 8, colorCount: 3, iterations: 6 };

function colors(image: ImageData) {
  const result = new Set<string>();
  for (let i = 0; i < image.data.length; i += 4)
    result.add(`${image.data[i]},${image.data[i + 1]},${image.data[i + 2]}`);
  return result;
}

describe('Pixelated Image Abstraction', () => {
  it('limits the automatic palette and returns a source-sized nearest-neighbor grid', () => {
    const source = fixture(48, 32, (x, y) => [x * 5, y * 7, (x * y) % 256]);
    const result = renderPixelArt(source, options);
    expect([
      result.image.width,
      result.image.height,
      result.columns,
      result.rows,
      result.glyphs,
    ]).toEqual([48, 32, 8, 5, 0]);
    expect(colors(result.image).size).toBeLessThanOrEqual(3);
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 48; x++) {
        const originX = Math.ceil((Math.floor(x / 6) * 48) / 8);
        const originY = Math.ceil((Math.floor((y * 5) / 32) * 32) / 5);
        const offset = (y * 48 + x) * 4;
        const origin = (originY * 48 + originX) * 4;
        expect(result.image.data.slice(offset, offset + 4)).toEqual(
          result.image.data.slice(origin, origin + 4),
        );
      }
  });

  it('is deterministic and leaves the source unchanged', () => {
    const source = fixture(35, 29, (x, y) => [(x * 31) % 256, (y * 53) % 256, (x * y) % 256]);
    const original = source.data.slice();
    expect(renderPixelArt(source, options).image.data).toEqual(
      renderPixelArt(source, options).image.data,
    );
    expect(source.data).toEqual(original);
  });

  it.each([
    [1, 1, 1, 1],
    [1, 33, 1, 33],
    [1, 900, 1, 900],
    [33, 1, 8, 1],
    [16, 48, 8, 24],
  ])(
    'preserves a constant image and square logical pixels at %s × %s',
    (width, height, columns, rows) => {
      const source = fixture(width, height, () => [29, 117, 203]);
      const result = renderPixelArt(source, options);
      expect([result.columns, result.rows]).toEqual([columns, rows]);
      expect(colors(result.image)).toEqual(new Set(['29,117,203']));
      expect([...result.image.data].every((value, i) => i % 4 !== 3 || value === 255)).toBe(true);
    },
  );

  it('keeps a narrow dark feature straddling output cells through spatial refinement', () => {
    // A box downsample averages this 3px stripe to at least 191 in every 8px cell.
    const source = fixture(64, 32, (x) => Array(3).fill(x >= 7 && x <= 9 ? 0 : 255));
    const result = renderPixelArt(source, { ...options, colorCount: 2, iterations: 8 });
    const row = Array.from({ length: 64 }, (_, x) => result.image.data[(16 * 64 + x) * 4]);
    expect(Math.min(...row.slice(0, 24))).toBeLessThan(80);
    expect(row[60]).toBeGreaterThan(245);
    expect(colors(result.image).size).toBe(2);
  });

  it('reduces an oversized portrait grid while retaining the source aspect', () => {
    const source = fixture(32, 900, () => [200, 30, 80]);
    const result = renderPixelArt(source, { columns: 128, colorCount: 32, iterations: 1 });
    expect(result.columns).toBeLessThanOrEqual(32);
    expect(result.rows).toBeLessThanOrEqual(900);
    expect(result.columns * result.rows).toBeLessThanOrEqual(16384);
    expect(Math.abs(result.columns / result.rows - 32 / 900)).toBeLessThan(1 / result.rows);
    expect(colors(result.image)).toEqual(new Set(['200,30,80']));
  });

  it('bounds work and normalizes nonfinite controls without breaking the palette', () => {
    const source = fixture(64, 64, (x, y) => [x * 4, y * 4, (x + y) * 2]);
    const result = renderPixelArt(source, { columns: Infinity, colorCount: NaN, iterations: -30 });
    expect(Number.isFinite(result.columns * result.rows)).toBe(true);
    expect(result.columns * result.rows).toBeLessThanOrEqual(16384);
    expect(colors(result.image).size).toBeLessThanOrEqual(8);
  });
});
