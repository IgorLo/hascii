import { describe, expect, it } from 'vitest';

import { createDither } from './dither';

describe('dithering policy', () => {
  it('uses centered Bayer ranks at the requested strength', () => {
    const policy = createDither({
      algorithm: 'bayer',
      strength: 1,
      width: 2,
      height: 2,
      addError: () => {},
    });
    expect([
      policy.biasAt(0, 0),
      policy.biasAt(1, 0),
      policy.biasAt(0, 1),
      policy.biasAt(1, 1),
    ]).toEqual([-119.53125, 7.96875, 71.71875, -55.78125]);
  });
  it('clips Floyd error at an edge without redistributing missing weights', () => {
    const pixels = new Float32Array(2 * 2 * 3);
    const policy = createDither({
      algorithm: 'floyd',
      strength: 1,
      width: 2,
      height: 2,
      addError: (x, y, r, g, b) => {
        const i = (y * 2 + x) * 3;
        pixels[i] += r;
        pixels[i + 1] += g;
        pixels[i + 2] += b;
      },
    });
    policy.diffuse(0, 0, [160, 80, 40], [0, 0, 0]);
    expect([...pixels]).toEqual([0, 0, 0, 70, 35, 17.5, 50, 25, 12.5, 10, 5, 2.5]);
  });
  it('retains Atkinson six-eighths diffusion and signed channel errors', () => {
    const pixels = new Float32Array(4 * 3 * 3);
    const policy = createDither({
      algorithm: 'atkinson',
      strength: 0.5,
      width: 4,
      height: 3,
      addError: (x, y, r, g, b) => {
        const i = (y * 4 + x) * 3;
        pixels[i] += r;
        pixels[i + 1] += g;
        pixels[i + 2] += b;
      },
    });
    policy.diffuse(1, 0, [16, 0, 48], [0, 32, 0]);
    const pixel = (x: number, y: number) => [...pixels.slice((y * 4 + x) * 3, (y * 4 + x) * 3 + 3)];
    expect(
      [
        [2, 0],
        [3, 0],
        [0, 1],
        [1, 1],
        [2, 1],
        [1, 2],
      ].map(([x, y]) => pixel(x, y)),
    ).toEqual(Array(6).fill([1, -2, 3]));
    expect([...pixels].filter((_, i) => i % 3 === 0).reduce((sum, value) => sum + value, 0)).toBe(
      6,
    );
  });
});
