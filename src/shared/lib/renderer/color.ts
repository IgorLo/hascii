import type { RGB } from './types';
export const clamp = (v: number) => Math.max(0, Math.min(255, v));
export const luma = (r: number, g: number, b: number) =>
  (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
export function nearest(c: RGB, p: RGB[]): RGB {
  let best = p[0],
    dist = Infinity;
  for (const v of p) {
    const d =
      0.2126 * (c[0] - v[0]) ** 2 + 0.7152 * (c[1] - v[1]) ** 2 + 0.0722 * (c[2] - v[2]) ** 2;
    if (d < dist) {
      dist = d;
      best = v;
    }
  }
  return best;
}
export const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export function quantize(
  input: Float32Array,
  w: number,
  h: number,
  p: RGB[],
  algorithm: string,
  strength: number,
): Uint8ClampedArray<ArrayBuffer> {
  const work = new Float32Array(input),
    out = new Uint8ClampedArray(w * h * 4);
  const kernel =
    algorithm === 'floyd'
      ? [
          [1, 0, 7 / 16],
          [-1, 1, 3 / 16],
          [0, 1, 5 / 16],
          [1, 1, 1 / 16],
        ]
      : algorithm === 'atkinson'
        ? [
            [1, 0, 1 / 8],
            [2, 0, 1 / 8],
            [-1, 1, 1 / 8],
            [0, 1, 1 / 8],
            [1, 1, 1 / 8],
            [0, 2, 1 / 8],
          ]
        : [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3,
        offset =
          algorithm === 'bayer'
            ? ((bayer[(y % 4) * 4 + (x % 4)] + 0.5) / 16 - 0.5) * 255 * strength
            : 0;
      const c: RGB = [
        clamp(work[i] + offset),
        clamp(work[i + 1] + offset),
        clamp(work[i + 2] + offset),
      ];
      const chosen = p.length ? nearest(c, p) : c;
      for (let k = 0; k < 3; k++) out[(y * w + x) * 4 + k] = chosen[k];
      out[(y * w + x) * 4 + 3] = 255;
      if (p.length)
        for (const [dx, dy, weight] of kernel) {
          const nx = x + dx,
            ny = y + dy;
          if (nx < 0 || nx >= w || ny >= h) continue;
          for (let k = 0; k < 3; k++)
            work[(ny * w + nx) * 3 + k] += (c[k] - chosen[k]) * weight * strength;
        }
    }
  return out;
}
