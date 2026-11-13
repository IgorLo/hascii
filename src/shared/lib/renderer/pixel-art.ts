/** Independent, bounded adaptation of Gerstner et al. (2012), Pixelated Image Abstraction.
 * See docs/research/2026-11-13-pia-implementation.md for deviations from the paper.
 * No canvas, Svelte state, network access, or original prototype code is used here.
 */
type Lab = [number, number, number];
export type PixelArtOptions = { columns: number; colorCount: number; iterations: number };

const MAX_CELLS = 16384;
const MAX_SAMPLES = 65536;
const linear = Float64Array.from({ length: 256 }, (_, value) => {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
});

function toLab(r: number, g: number, b: number): Lab {
  const red = linear[r],
    green = linear[g],
    blue = linear[b];
  const f = (value: number) =>
    value > 216 / 24389 ? Math.cbrt(value) : ((24389 / 27) * value + 16) / 116;
  const x = f((0.4124564 * red + 0.3575761 * green + 0.1804375 * blue) / 0.95047);
  const y = f(0.2126729 * red + 0.7151522 * green + 0.072175 * blue);
  const z = f((0.0193339 * red + 0.119192 * green + 0.9503041 * blue) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

function toRgb(lab: Lab): Lab {
  const y = (lab[0] + 16) / 116;
  const inverse = (v: number) => (v > 6 / 29 ? v ** 3 : 3 * (6 / 29) ** 2 * (v - 4 / 29));
  const x = 0.95047 * inverse(y + lab[1] / 500);
  const yy = inverse(y);
  const z = 1.08883 * inverse(y - lab[2] / 200);
  const encode = (v: number) =>
    Math.round(
      255 * Math.max(0, Math.min(1, v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)),
    );
  return [
    encode(3.2404542 * x - 1.5371385 * yy - 0.4985314 * z),
    encode(-0.969266 * x + 1.8760108 * yy + 0.041556 * z),
    encode(0.0556434 * x - 0.2040259 * yy + 1.0572252 * z),
  ];
}

function distance(a: ArrayLike<number>, ai: number, b: ArrayLike<number>, bi: number) {
  return (a[ai] - b[bi]) ** 2 + (a[ai + 1] - b[bi + 1]) ** 2 + (a[ai + 2] - b[bi + 2]) ** 2;
}

function control(value: number, fallback: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(Number.isFinite(value) ? value : fallback)));
}

function seedPalette(means: Float64Array, count: number): Lab[] {
  const n = means.length / 3;
  const average: Lab = [0, 0, 0];
  for (let i = 0; i < means.length; i++) average[i % 3] += means[i] / n;
  const palette: Lab[] = [average];
  const nearest = new Float64Array(n).fill(Infinity);
  while (palette.length < count) {
    const last = palette[palette.length - 1];
    let farthest = 0;
    for (let i = 0; i < n; i++) {
      nearest[i] = Math.min(nearest[i], distance(means, i * 3, last, 0));
      if (nearest[i] > nearest[farthest]) farthest = i;
    }
    if (nearest[farthest] < 1e-8) break;
    palette.push([means[farthest * 3], means[farthest * 3 + 1], means[farthest * 3 + 2]]);
  }
  return palette;
}

/** Bilateral smoothing in the OUTPUT topology preserves edges between dissimilar means. */
function filterMeans(means: Float64Array, columns: number, rows: number) {
  const filtered = new Float64Array(means.length);
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < columns; x++) {
      const index = (y * columns + x) * 3;
      let total = 0;
      for (let yy = Math.max(0, y - 1); yy <= Math.min(rows - 1, y + 1); yy++)
        for (let xx = Math.max(0, x - 1); xx <= Math.min(columns - 1, x + 1); xx++) {
          const neighbor = (yy * columns + xx) * 3;
          const weight = Math.exp(
            -distance(means, index, means, neighbor) / 200 - ((xx - x) ** 2 + (yy - y) ** 2) / 2,
          );
          total += weight;
          for (let c = 0; c < 3; c++) filtered[index + c] += means[neighbor + c] * weight;
        }
      for (let c = 0; c < 3; c++) filtered[index + c] /= total;
    }
  return filtered;
}

function refinePalette(
  means: Float64Array,
  palette: Lab[],
  masses: Float64Array,
  temperature: number,
) {
  const sums = new Float64Array(palette.length * 3);
  const weights = new Float64Array(palette.length);
  const likelihood = new Float64Array(palette.length);
  for (let i = 0; i < means.length; i += 3) {
    let nearest = Infinity;
    for (let k = 0; k < palette.length; k++) {
      likelihood[k] = distance(means, i, palette[k], 0);
      nearest = Math.min(nearest, likelihood[k]);
    }
    let total = 0;
    for (let k = 0; k < palette.length; k++) {
      // Subtracting the minimum distance prevents underflow as the temperature cools.
      likelihood[k] = Math.max(1e-6, masses[k]) * Math.exp((nearest - likelihood[k]) / temperature);
      total += likelihood[k];
    }
    for (let k = 0; k < palette.length; k++) {
      const weight = likelihood[k] / total;
      weights[k] += weight;
      for (let c = 0; c < 3; c++) sums[k * 3 + c] += means[i + c] * weight;
    }
  }
  for (let k = 0; k < palette.length; k++) {
    if (weights[k] > 1e-8) for (let c = 0; c < 3; c++) palette[k][c] = sums[k * 3 + c] / weights[k];
    masses[k] = weights[k] / (means.length / 3);
  }
}

function associate(means: Float64Array, palette: Lab[], assignments: Uint8Array) {
  for (let i = 0; i < assignments.length; i++) {
    let best = Infinity;
    for (let k = 0; k < palette.length; k++) {
      const error = distance(means, i * 3, palette[k], 0);
      if (error < best) {
        best = error;
        assignments[i] = k;
      }
    }
  }
}

export function renderPixelArt(
  source: ImageData,
  options: PixelArtOptions,
): { image: ImageData; columns: number; rows: number; glyphs: number } {
  const { width, height } = source;
  let columns = Math.min(width, control(options.columns, 64, 8, 128));
  let rows = Math.min(height, Math.max(1, Math.round((columns * height) / width)));
  if (columns * rows > MAX_CELLS) {
    columns = Math.max(1, Math.floor(Math.sqrt((MAX_CELLS * width) / height)));
    rows = Math.min(
      height,
      Math.max(1, Math.round((columns * height) / width)),
      Math.floor(MAX_CELLS / columns),
    );
  }
  const count = columns * rows;
  const iterations = control(options.iterations, 12, 1, 24);
  const colorCount = Math.min(count, control(options.colorCount, 8, 2, 32));
  const scale = Math.min(4, Math.sqrt(MAX_SAMPLES / count));
  const sampleWidth = Math.min(width, Math.max(columns, Math.floor(columns * scale)));
  const sampleHeight = Math.min(height, Math.max(rows, Math.floor(rows * scale)));
  const samples = new Float64Array(sampleWidth * sampleHeight * 3);
  const means = new Float64Array(count * 3);
  const centers = new Float64Array(count * 2);
  const population = new Uint32Array(count);
  for (let y = 0; y < sampleHeight; y++)
    for (let x = 0; x < sampleWidth; x++) {
      // A stratified point sample avoids a pre-blur that would erase thin features.
      const sx = Math.min(width - 1, Math.floor(((x + 0.5) * width) / sampleWidth));
      const sy = Math.min(height - 1, Math.floor(((y + 0.5) * height) / sampleHeight));
      const offset = (sy * width + sx) * 4;
      const lab = toLab(source.data[offset], source.data[offset + 1], source.data[offset + 2]);
      samples.set(lab, (y * sampleWidth + x) * 3);
      const region =
        Math.floor((y * rows) / sampleHeight) * columns + Math.floor((x * columns) / sampleWidth);
      population[region]++;
      for (let c = 0; c < 3; c++) means[region * 3 + c] += lab[c];
    }
  for (let i = 0; i < count; i++) {
    for (let c = 0; c < 3; c++) means[i * 3 + c] /= population[i];
    centers[i * 2] = (i % columns) + 0.5;
    centers[i * 2 + 1] = Math.floor(i / columns) + 0.5;
  }
  const palette = seedPalette(means, colorCount);
  const masses = new Float64Array(palette.length).fill(1 / palette.length);
  const assignments = new Uint8Array(count);
  associate(means, palette, assignments);
  const sums = new Float64Array(count * 5);
  const nextCenters = new Float64Array(centers.length);
  for (let iteration = 0; iteration < iterations; iteration++) {
    sums.fill(0);
    population.fill(0);
    for (let y = 0; y < sampleHeight; y++)
      for (let x = 0; x < sampleWidth; x++) {
        const px = ((x + 0.5) * columns) / sampleWidth;
        const py = ((y + 0.5) * rows) / sampleHeight;
        const sample = (y * sampleWidth + x) * 3;
        let best = Infinity,
          selected = 0;
        // Search a bounded 3x3 neighborhood in the fixed output topology.
        for (
          let yy = Math.max(0, Math.floor(py) - 1);
          yy <= Math.min(rows - 1, Math.floor(py) + 1);
          yy++
        )
          for (
            let xx = Math.max(0, Math.floor(px) - 1);
            xx <= Math.min(columns - 1, Math.floor(px) + 1);
            xx++
          ) {
            const region = yy * columns + xx;
            const spatial = (px - centers[region * 2]) ** 2 + (py - centers[region * 2 + 1]) ** 2;
            // Crucially, geometry uses the CURRENT PALETTE color, not the region mean.
            const error =
              distance(samples, sample, palette[assignments[region]], 0) + 625 * spatial;
            if (error < best) {
              best = error;
              selected = region;
            }
          }
        population[selected]++;
        for (let c = 0; c < 3; c++) sums[selected * 5 + c] += samples[sample + c];
        sums[selected * 5 + 3] += px;
        sums[selected * 5 + 4] += py;
      }
    for (let i = 0; i < count; i++) {
      // Empty regions retain their last color/center, and remain available next pass.
      if (population[i]) {
        for (let c = 0; c < 3; c++) means[i * 3 + c] = sums[i * 5 + c] / population[i];
        nextCenters[i * 2] = sums[i * 5 + 3] / population[i];
        nextCenters[i * 2 + 1] = sums[i * 5 + 4] / population[i];
      } else {
        nextCenters[i * 2] = centers[i * 2];
        nextCenters[i * 2 + 1] = centers[i * 2 + 1];
      }
    }
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < columns; x++) {
        const i = y * columns + x;
        let neighbors = 0,
          nx = 0,
          ny = 0;
        for (const j of [
          x > 0 ? i - 1 : -1,
          x < columns - 1 ? i + 1 : -1,
          y > 0 ? i - columns : -1,
          y < rows - 1 ? i + columns : -1,
        ]) {
          if (j < 0) continue;
          nx += nextCenters[j * 2];
          ny += nextCenters[j * 2 + 1];
          neighbors++;
        }
        centers[i * 2] = Math.max(
          x - 0.25,
          Math.min(
            x + 1.25,
            nextCenters[i * 2] * 0.6 + (neighbors ? nx / neighbors : nextCenters[i * 2]) * 0.4,
          ),
        );
        centers[i * 2 + 1] = Math.max(
          y - 0.25,
          Math.min(
            y + 1.25,
            nextCenters[i * 2 + 1] * 0.6 +
              (neighbors ? ny / neighbors : nextCenters[i * 2 + 1]) * 0.4,
          ),
        );
      }
    const filtered = filterMeans(means, columns, rows);
    refinePalette(filtered, palette, masses, Math.max(1, 64 * 0.5 ** iteration));
    associate(filtered, palette, assignments);
  }
  const rgb = palette.map(toRgb);
  const output = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const region = Math.floor((y * rows) / height) * columns + Math.floor((x * columns) / width);
      const color = rgb[assignments[region]];
      const offset = (y * width + x) * 4;
      output[offset] = color[0];
      output[offset + 1] = color[1];
      output[offset + 2] = color[2];
      output[offset + 3] = 255;
    }
  return { image: new ImageData(output, width, height), columns, rows, glyphs: 0 };
}
