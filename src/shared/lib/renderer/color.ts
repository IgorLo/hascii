import { createDither } from './dither';
import type { RGB } from './types';
export { bayer } from './dither';
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
  const policy = createDither({
    algorithm,
    strength,
    width: w,
    height: h,
    addError: (x, y, red, green, blue) => {
      const i = (y * w + x) * 3;
      work[i] += red;
      work[i + 1] += green;
      work[i + 2] += blue;
    },
  });
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3,
        offset = policy.biasAt(x, y);
      const c: RGB = [
        clamp(work[i] + offset),
        clamp(work[i + 1] + offset),
        clamp(work[i + 2] + offset),
      ];
      const chosen = p.length ? nearest(c, p) : c;
      for (let k = 0; k < 3; k++) out[(y * w + x) * 4 + k] = chosen[k];
      out[(y * w + x) * 4 + 3] = 255;
      if (p.length) policy.diffuse(x, y, c, chosen);
    }
  return out;
}
