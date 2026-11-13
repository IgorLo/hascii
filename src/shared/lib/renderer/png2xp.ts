// Adapted from MIT Asciicker png2xp, msokalski/gumix, revision
// 8ff75d0c5a8d2745a8ad6a8a841dd31a46e81635. See static/licenses/asciicker.txt.
// Differences: arbitrary palettes, browser-local sampling, adjustable cell geometry,
// row-major error diffusion and optional Bayer/Floyd in addition to Atkinson.
import { clamp } from './color';
import { bayer, createDither } from './dither';
import type { Png2xpOptions } from './modes';
import type { RGB } from './types';

type Kind = 'solid' | 'horizontal' | 'vertical' | 'shade25' | 'shade50';
interface Cell {
  kind: Kind;
  foreground: RGB;
  background: RGB;
  mean: RGB;
}
const linear = Array.from({ length: 256 }, (_, i) => {
  const v = i / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
});
const encode = (v: number) =>
  Math.round(255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055));
const error = (a: RGB, b: RGB) =>
  2 * Math.abs(a[0] - b[0]) + 3 * Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
const mean = (colors: RGB[]): RGB =>
  [0, 1, 2].map((k) =>
    encode(colors.reduce((sum, c) => sum + linear[Math.round(clamp(c[k]))], 0) / colors.length),
  ) as RGB;
const mix = (background: RGB, foreground: RGB, fraction: number): RGB =>
  [0, 1, 2].map((k) =>
    encode(linear[background[k]] * (1 - fraction) + linear[foreground[k]] * fraction),
  ) as RGB;

function fitter(palette: RGB[], shading: boolean) {
  const nearestCache = new Map<number, RGB>();
  const shadeCache = new Map<number, Cell>();
  const pairCache = new Map<number, Cell>();
  const indices = new Map(palette.map((color, i) => [color, i]));
  const shadePair = (background: RGB, foreground: RGB, fraction: number): Cell => {
    const slot = palette.length
      ? (indices.get(background)! * palette.length + indices.get(foreground)!) * 2 +
        (fraction === 0.5 ? 1 : 0)
      : -1;
    if (slot >= 0) {
      const cached = pairCache.get(slot);
      if (cached) return cached;
    }
    const cell: Cell = {
      kind: fraction === 0.25 ? 'shade25' : 'shade50',
      background,
      foreground,
      mean: mix(background, foreground, fraction),
    };
    if (slot >= 0) {
      if (pairCache.size >= 16384) pairCache.clear();
      pairCache.set(slot, cell);
    }
    return cell;
  };
  const allShades: Cell[] | undefined =
    shading && palette.length && palette.length <= 32 ? [] : undefined;
  if (allShades)
    for (const background of palette)
      for (const foreground of palette)
        for (const fraction of [0.25, 0.5])
          allShades.push(shadePair(background, foreground, fraction));
  const key = (c: RGB) => (c[0] << 16) | (c[1] << 8) | c[2];
  const nearest = (color: RGB): RGB => {
    if (!palette.length) return color;
    const slot = key(color),
      cached = nearestCache.get(slot);
    if (cached) return cached;
    let best = palette[0],
      distance = Infinity;
    for (const p of palette) {
      const d = error(p, color);
      if (d < distance) {
        distance = d;
        best = p;
      }
    }
    if (nearestCache.size >= 8192) nearestCache.clear();
    nearestCache.set(slot, best);
    return best;
  };
  // Small palettes are exhaustive. For larger imports, use the nearest 16 colors
  // for shade pairs; half-block colors still search the complete palette.
  const candidates = (target: RGB, fallback: RGB[]) => {
    if (!palette.length) return fallback;
    if (palette.length <= 32) return palette;
    const shortlist: { color: RGB; distance: number }[] = [];
    for (const color of palette) {
      const distance = error(color, target);
      if (shortlist.length === 16 && distance >= shortlist[15].distance) continue;
      const index = shortlist.findIndex((p) => distance < p.distance);
      shortlist.splice(index < 0 ? shortlist.length : index, 0, { color, distance });
      if (shortlist.length > 16) shortlist.pop();
    }
    return shortlist.map((p) => p.color);
  };
  return (samples: RGB[]): Cell => {
    const target = mean(samples);
    const top = nearest(mean(samples.slice(0, 2))),
      bottom = nearest(mean(samples.slice(2)));
    const left = nearest(mean([samples[0], samples[2]])),
      right = nearest(mean([samples[1], samples[3]]));
    const horizontal =
      error(top, samples[0]) +
      error(top, samples[1]) +
      error(bottom, samples[2]) +
      error(bottom, samples[3]);
    const vertical =
      error(left, samples[0]) +
      error(right, samples[1]) +
      error(left, samples[2]) +
      error(right, samples[3]);
    let cell: Cell =
      vertical < horizontal
        ? { kind: 'vertical', foreground: left, background: right, mean: mean([left, right]) }
        : { kind: 'horizontal', foreground: bottom, background: top, mean: mean([top, bottom]) };
    if (shading) {
      const slot = key(target);
      let shade = palette.length ? shadeCache.get(slot) : undefined;
      if (!shade) {
        let score = Infinity;
        const consider = (candidate: Cell) => {
          const distance = error(target, candidate.mean);
          if (distance < score) {
            score = distance;
            shade = candidate;
          }
        };
        if (allShades) for (const candidate of allShades) consider(candidate);
        else {
          const colors = candidates(target, [...samples, target]);
          for (const background of colors)
            for (const foreground of colors)
              for (const fraction of [0.25, 0.5])
                consider(shadePair(background, foreground, fraction));
        }
        if (palette.length) {
          if (shadeCache.size >= 8192) shadeCache.clear();
          shadeCache.set(slot, shade!);
        }
      }
      const shadeError = samples.reduce((sum, color) => sum + error(color, shade!.mean), 0);
      if (shadeError < Math.min(horizontal, vertical)) cell = shade!;
    }
    if (error(cell.foreground, cell.background) === 0) cell.kind = 'solid';
    return cell;
  };
}

export function renderPng2xp(image: ImageData, s: Png2xpOptions, palette: RGB[]) {
  const cw = Math.max(2, Math.round(s.cellSize)),
    ch = Math.max(2, Math.round(cw * s.cellAspect));
  const columns = Math.ceil(image.width / cw),
    rows = Math.ceil(image.height / ch),
    sw = columns * 2,
    sh = rows * 2;
  const samples = new Float32Array(sw * sh * 3),
    counts = new Uint32Array(sw * sh);
  // Average each quarter-cell in linear light, rather than picking one pixel.
  for (let y = 0; y < image.height; y++)
    for (let x = 0; x < image.width; x++) {
      const cell = Math.floor((y * 2) / ch) * sw + Math.floor((x * 2) / cw),
        i = (y * image.width + x) * 4;
      counts[cell]++;
      for (let k = 0; k < 3; k++) samples[cell * 3 + k] += linear[image.data[i + k]];
    }
  for (let y = 0; y < sh; y++)
    for (let x = 0; x < sw; x++) {
      const i = y * sw + x;
      const fallback =
        (Math.min(image.height - 1, Math.floor(((y + 0.5) * ch) / 2)) * image.width +
          Math.min(image.width - 1, Math.floor(((x + 0.5) * cw) / 2))) *
        4;
      for (let k = 0; k < 3; k++)
        samples[i * 3 + k] = counts[i]
          ? encode(samples[i * 3 + k] / counts[i])
          : image.data[fallback + k];
    }
  const policy = createDither({
    algorithm: palette.length ? s.dither : 'none',
    strength: s.strength,
    width: columns,
    height: rows,
    addError: (x, y, red, green, blue) => {
      for (let q = 0; q < 4; q++) {
        const i = ((y * 2 + (q >> 1)) * sw + x * 2 + (q % 2)) * 3;
        samples[i] += red;
        samples[i + 1] += green;
        samples[i + 2] += blue;
      }
    },
  });
  const fit = fitter(palette, s.blockShading);
  // Rank native pixels instead of stretching a 4x4 mask. This preserves rounded
  // 25%/50% coverage even in 2x2 cells, tall cells and odd dimensions.
  const order = Array.from({ length: cw * ch }, (_, i) => i).sort(
    (a, b) =>
      bayer[(Math.floor(a / cw) % 4) * 4 + ((a % cw) % 4)] -
        bayer[(Math.floor(b / cw) % 4) * 4 + ((b % cw) % 4)] || a - b,
  );
  const ranks = new Uint32Array(cw * ch);
  order.forEach((pixel, rank) => {
    ranks[pixel] = rank;
  });
  const bg = Number.parseInt(s.background.slice(1), 16),
    base = [bg >> 16, (bg >> 8) & 255, bg & 255];
  const output = new Uint8ClampedArray(image.width * image.height * 4);
  const kinds = new Set<Kind>();
  for (let cy = 0; cy < rows; cy++)
    for (let cx = 0; cx < columns; cx++) {
      const bias = policy.biasAt(cx, cy);
      const four = [0, 1, 2, 3].map((q) => {
        const i = ((cy * 2 + (q >> 1)) * sw + cx * 2 + (q % 2)) * 3;
        return [0, 1, 2].map((k) => Math.round(clamp(samples[i + k] + bias))) as RGB;
      });
      const cell = fit(four);
      kinds.add(cell.kind);
      const target = mean(four);
      if (palette.length) policy.diffuse(cx, cy, target, cell.mean);
      const background = base.map((v, k) => v + (cell.background[k] - v) * s.backgroundOpacity);
      const foreground = background.map((v, k) => v + (cell.foreground[k] - v) * s.opacity);
      for (let py = 0; py < ch && cy * ch + py < image.height; py++)
        for (let px = 0; px < cw && cx * cw + px < image.width; px++) {
          const ink =
            cell.kind === 'vertical'
              ? px < cw / 2
              : cell.kind === 'horizontal'
                ? py >= ch / 2
                : cell.kind === 'shade25'
                  ? ranks[py * cw + px] < Math.round((cw * ch) / 4)
                  : cell.kind === 'shade50'
                    ? ranks[py * cw + px] < Math.round((cw * ch) / 2)
                    : false;
          const i = ((cy * ch + py) * image.width + cx * cw + px) * 4;
          for (let k = 0; k < 3; k++) output[i + k] = ink ? foreground[k] : background[k];
          output[i + 3] = 255;
        }
    }
  return {
    image: new ImageData(output, image.width, image.height),
    columns,
    rows,
    glyphs: kinds.size,
  };
}
