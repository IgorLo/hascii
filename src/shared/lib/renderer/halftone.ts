import type { RGB } from './types';

export interface HalftoneOptions {
  size: number;
  angle: number;
  shape: 'round' | 'diamond' | 'line';
  colorMode: 'mono' | 'cmyk' | 'duotone';
  ink: RGB;
  paper: RGB;
  inkB: RGB;
  angleB: number;
  balance: number;
  offsetX: number;
  offsetY: number;
}

const bounded = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
const bins = 1024;
const screens = new Map<string, Float32Array>();
function spot(x: number, y: number, shape: HalftoneOptions['shape']) {
  if (shape === 'line') return 2 * Math.abs(x);
  if (shape === 'diamond') return Math.abs(x) + Math.abs(y);
  return 2 * (x * x + y * y);
}

// Rank the spot function by area on a square cell. Deep shadows fill the
// corners instead of stopping at isolated circles with uncovered gaps.
function coverageScreen(shape: HalftoneOptions['shape']) {
  let screen = screens.get(shape);
  if (screen) return screen;
  const histogram = new Uint32Array(bins);
  const samples = 256;
  for (let y = 0; y < samples; y++)
    for (let x = 0; x < samples; x++) {
      const value = spot((x + 0.5) / samples - 0.5, (y + 0.5) / samples - 0.5, shape);
      histogram[Math.min(bins - 1, Math.floor(value * bins))]++;
    }
  screen = new Float32Array(bins);
  let sum = 0;
  for (let i = 0; i < bins; i++) {
    screen[i] = (sum + histogram[i] / 2 + 0.5) / (samples * samples + 1);
    sum += histogram[i];
  }
  screens.set(shape, screen);
  return screen;
}

function sampler(size: number, angle: number, shape: HalftoneOptions['shape']) {
  const radians = (angle * Math.PI) / 180;
  const cos = Math.cos(radians) / size;
  const sin = Math.sin(radians) / size;
  const screen = coverageScreen(shape);
  return (x: number, y: number, darkness: number) => {
    if (darkness <= 0) return false;
    if (darkness >= 1) return true;
    // An asymmetric phase avoids sampling four identical radial distances
    // when the requested screen is only two pixels wide.
    const u = x * cos + y * sin + 0.125;
    const v = -x * sin + y * cos + 0.25;
    const value = spot(u - Math.floor(u) - 0.5, v - Math.floor(v) - 0.5, shape);
    return darkness >= screen[Math.min(bins - 1, Math.floor(value * bins))];
  };
}

let separationKey = '';
let separation = new Uint8Array(0);
// Fit two independent ink coverages against a simple translucent-overprint
// model. A small RGB lookup keeps the per-output-pixel path inexpensive.
function separate(options: HalftoneOptions) {
  const key = JSON.stringify([options.paper, options.ink, options.inkB, options.balance]);
  if (key === separationKey) return separation;
  separationKey = key;
  separation = new Uint8Array(16 * 16 * 16 * 2);
  const candidates: { color: RGB; a: number; b: number }[] = [];
  for (let a = 0; a <= 8; a++)
    for (let b = 0; b <= 8; b++)
      candidates.push({
        a: a / 8,
        b: b / 8,
        color: options.paper.map(
          (paper, channel) =>
            paper *
            (1 - a / 8 + ((a / 8) * options.ink[channel]) / 255) *
            (1 - b / 8 + ((b / 8) * options.inkB[channel]) / 255),
        ) as RGB,
      });
  for (let r = 0; r < 16; r++)
    for (let g = 0; g < 16; g++)
      for (let b = 0; b < 16; b++) {
        let best = candidates[0];
        let error = Infinity;
        for (const candidate of candidates) {
          const dr = (candidate.color[0] - r * 17) / 255;
          const dg = (candidate.color[1] - g * 17) / 255;
          const db = (candidate.color[2] - b * 17) / 255;
          const preference = candidate.a - candidate.b - (options.balance - 0.5) * 1.2;
          const cost =
            0.2126 * dr * dr +
            0.7152 * dg * dg +
            0.0722 * db * db +
            0.012 * preference * preference;
          if (cost < error) {
            error = cost;
            best = candidate;
          }
        }
        const index = ((r * 16 + g) * 16 + b) * 2;
        separation[index] = Math.round(best.a * 255);
        separation[index + 1] = Math.round(best.b * 255);
      }
  return separation;
}

export function renderHalftone(source: ImageData, options: HalftoneOptions) {
  const { width, height, data } = source;
  const size = bounded(options.size, 2, 80);
  const a = sampler(size, options.angle, options.shape);
  const b = sampler(size, options.angleB, options.shape);
  const magenta = sampler(size, options.angle + 30, options.shape);
  const yellow = sampler(size, options.angle + 60, options.shape);
  const black = sampler(size, options.angle + 15, options.shape);
  const result = new Uint8ClampedArray(data.length);
  const lookup = options.colorMode === 'duotone' ? separate(options) : undefined;
  const offsetX = Math.round(bounded(options.offsetX, -80, 80));
  const offsetY = Math.round(bounded(options.offsetY, -80, 80));
  const inkAt = (x: number, y: number, ink: 0 | 1) => {
    if (x < 0 || x >= width || y < 0 || y >= height || !lookup) return 0;
    const i = (y * width + x) * 4;
    // Ink preference must never put colored marks into clean white margins.
    if (data[i] === 255 && data[i + 1] === 255 && data[i + 2] === 255) return 0;
    const index = (((data[i] >> 4) * 16 + (data[i + 1] >> 4)) * 16 + (data[i + 2] >> 4)) * 2;
    return lookup[index + ink] / 255;
  };
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      let r = options.paper[0],
        g = options.paper[1],
        blue = options.paper[2];
      if (options.colorMode === 'cmyk') {
        const red = data[i] / 255,
          green = data[i + 1] / 255,
          sourceBlue = data[i + 2] / 255;
        const k = 1 - Math.max(red, green, sourceBlue);
        const denominator = 1 - k || 1;
        if (a(x + 0.5, y + 0.5, (1 - red - k) / denominator)) r = 0;
        if (magenta(x + 0.5, y + 0.5, (1 - green - k) / denominator)) g = 0;
        if (yellow(x + 0.5, y + 0.5, (1 - sourceBlue - k) / denominator)) blue = 0;
        if (black(x + 0.5, y + 0.5, k)) r = g = blue = 0;
      } else {
        const darkness = lookup
          ? inkAt(x, y, 0)
          : 1 - (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
        if (a(x + 0.5, y + 0.5, darkness)) {
          r *= options.ink[0] / 255;
          g *= options.ink[1] / 255;
          blue *= options.ink[2] / 255;
        }
        if (lookup && b(x - offsetX + 0.5, y - offsetY + 0.5, inkAt(x - offsetX, y - offsetY, 1))) {
          r *= options.inkB[0] / 255;
          g *= options.inkB[1] / 255;
          blue *= options.inkB[2] / 255;
        }
      }
      result[i] = r;
      result[i + 1] = g;
      result[i + 2] = blue;
      result[i + 3] = 255;
    }
  return {
    image: new ImageData(result, width, height),
    columns: Math.ceil(width / size),
    rows: Math.ceil(height / size),
    glyphs: 0,
  };
}
