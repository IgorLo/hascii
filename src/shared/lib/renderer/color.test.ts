import { describe, expect, it } from 'vitest';

import { quantize } from './color';
import type { RGB } from './types';

describe('blue-noise palette dithering', () => {
  it('preserves a midtone through dispersed palette pixels deterministically', () => {
    const pixels = new Float32Array(64 * 64 * 3).fill(128);
    const palette: RGB[] = [
      [0, 0, 0],
      [255, 255, 255],
    ];
    const result = quantize(pixels, 64, 64, palette, 'blue-noise', 1);
    const whites = [...result].filter((v, i) => i % 4 === 0 && v === 255).length;
    expect(whites).toBeGreaterThan(1900);
    expect(whites).toBeLessThan(2200);
    expect(result).toEqual(quantize(pixels, 64, 64, palette, 'blue-noise', 1));
    expect([...result].every((v) => v === 0 || v === 255)).toBe(true);
  });
  it('at zero strength gives the original nearest palette result', () => {
    const pixels = new Float32Array([20, 20, 20, 130, 130, 130, 240, 240, 240]);
    const palette: RGB[] = [
      [0, 0, 0],
      [255, 255, 255],
    ];
    expect(quantize(pixels, 3, 1, palette, 'blue-noise', 0)).toEqual(
      quantize(pixels, 3, 1, palette, 'none', 1),
    );
  });
});
