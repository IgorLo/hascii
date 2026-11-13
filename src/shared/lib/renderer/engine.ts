import { surface } from './canvas';
import { clamp, luma, quantize } from './color';
import { renderHalftone } from './halftone';
import { renderPixelArt } from './pixel-art';
import { renderPng2xp } from './png2xp';
import { renderAsciiFx } from './two-color';
import type { Job, Result, RGB, Settings } from './types.js';
export { nearest, quantize } from './color';
function rgbAt(data: Uint8ClampedArray, w: number, h: number, x: number, y: number): RGB {
  const i =
    (Math.min(h - 1, Math.max(0, Math.floor(y))) * w +
      Math.min(w - 1, Math.max(0, Math.floor(x)))) *
    4;
  return [data[i], data[i + 1], data[i + 2]];
}
interface Glyph {
  char: string;
  mean: number;
  features: Float32Array;
}
let atlasKey = '';
let atlas: Glyph[] = [];
function glyphAtlas(s: Settings, cw: number, ch: number): Glyph[] {
  const key = JSON.stringify([s.font, s.fontSize, s.chars, s.allowEmpty, cw, ch]);
  if (key === atlasKey) return atlas;
  const a = surface(cw, ch),
    small = surface(6, 8);
  atlas = Array.from(new Set(Array.from(s.chars)))
    .filter((c) => !/[\r\n\t]/.test(c))
    .slice(0, 512)
    .map((char) => {
      a.ctx.clearRect(0, 0, cw, ch);
      a.ctx.fillStyle = 'white';
      a.ctx.font = `${s.fontSize}px ${s.font}`;
      a.ctx.textAlign = 'center';
      a.ctx.textBaseline = 'middle';
      a.ctx.fillText(char, cw / 2, ch / 2, cw);
      small.ctx.clearRect(0, 0, 6, 8);
      small.ctx.drawImage(a.canvas, 0, 0, 6, 8);
      const d = small.ctx.getImageData(0, 0, 6, 8).data;
      const features = new Float32Array(48);
      let mean = 0;
      for (let i = 0; i < 48; i++) {
        features[i] = d[i * 4 + 3] / 255;
        mean += features[i] / 48;
      }
      const norm = Math.sqrt(features.reduce((sum, v) => sum + (v - mean) ** 2, 0)) || 1;
      for (let i = 0; i < 48; i++) features[i] = (features[i] - mean) / norm;
      return { char, mean, features };
    })
    .filter((g) => g.mean > 0.00001);
  if (s.allowEmpty) atlas.unshift({ char: ' ', mean: 0, features: new Float32Array(48) });
  atlasKey = key;
  return atlas;
}
export function render(job: Job): Result {
  const start = performance.now(),
    s = job.settings,
    source = job.image;
  const w = source.width,
    h = source.height,
    corrected = new Uint8ClampedArray(source.data);
  for (let i = 0; i < corrected.length; i += 4) {
    const alpha = corrected[i + 3] / 255;
    let r = corrected[i] * alpha,
      g = corrected[i + 1] * alpha,
      b = corrected[i + 2] * alpha;
    if (s.correction) {
      const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      r = gray + (r - gray) * s.saturation;
      g = gray + (g - gray) * s.saturation;
      b = gray + (b - gray) * s.saturation;
      r = (r - 127.5) * s.contrast + 127.5 + s.brightness;
      g = (g - 127.5) * s.contrast + 127.5 + s.brightness;
      b = (b - 127.5) * s.contrast + 127.5 + s.brightness;
    }
    corrected[i] = clamp(r);
    corrected[i + 1] = clamp(g);
    corrected[i + 2] = clamp(b);
    corrected[i + 3] = 255;
  }
  if (s.mode === 'ascii-fx')
    return {
      id: job.id,
      ...renderAsciiFx(new ImageData(corrected, w, h), s, s.paletteEnabled ? job.palette : []),
      ms: performance.now() - start,
    };
  if (s.mode === 'png2xp')
    return {
      id: job.id,
      ...renderPng2xp(new ImageData(corrected, w, h), s, s.paletteEnabled ? job.palette : []),
      ms: performance.now() - start,
    };
  if (s.mode === 'halftone') {
    const color = (hex: string): RGB => {
      const value = Number.parseInt(hex.slice(1), 16);
      return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
    };
    return {
      id: job.id,
      ...renderHalftone(new ImageData(corrected, w, h), {
        size: s.halftoneSize,
        angle: s.halftoneAngle,
        shape: s.halftoneShape,
        colorMode: s.halftoneColor,
        ink: color(s.halftoneInk),
        paper: color(s.halftonePaper),
        inkB: color(s.halftoneInkB),
        angleB: s.halftoneAngleB,
        balance: s.halftoneBalance,
        offsetX: s.halftoneOffsetX,
        offsetY: s.halftoneOffsetY,
      }),
      ms: performance.now() - start,
    };
  }
  if (s.mode === 'pixel-art')
    return {
      id: job.id,
      ...renderPixelArt(new ImageData(corrected, w, h), {
        columns: s.artColumns,
        colorCount: s.artColors,
        iterations: s.artIterations,
      }),
      ms: performance.now() - start,
    };
  const original = surface(w, h);
  original.ctx.putImageData(new ImageData(corrected, w, h), 0, 0);
  const p = s.paletteEnabled ? job.palette : [];
  function grid(cw: number, ch: number) {
    const cols = Math.ceil(w / cw),
      rows = Math.ceil(h / ch),
      values = new Float32Array(cols * rows * 3),
      counts = new Uint32Array(cols * rows);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const cell = Math.floor(y / ch) * cols + Math.floor(x / cw),
          i = (y * w + x) * 4;
        counts[cell]++;
        for (let k = 0; k < 3; k++) values[cell * 3 + k] += corrected[i + k];
      }
    for (let i = 0; i < counts.length; i++)
      for (let k = 0; k < 3; k++) values[i * 3 + k] /= counts[i];
    return {
      cols,
      rows,
      values,
      colors: quantize(values, cols, rows, p, p.length ? s.dither : 'none', s.strength),
    };
  }
  const output = surface(w, h);
  let columns = 0,
    rows = 0,
    glyphCount = 0;
  if (s.mode === 'pixels') {
    const size = s.pixelate ? s.pixelSize : 1,
      g = grid(size, size);
    columns = g.cols;
    rows = g.rows;
    const low = surface(g.cols, g.rows);
    low.ctx.putImageData(new ImageData(g.colors, g.cols, g.rows), 0, 0);
    const bg = surface(w, h);
    bg.ctx.imageSmoothingEnabled = false;
    bg.ctx.drawImage(low.canvas, 0, 0, g.cols * size, g.rows * size);
    output.ctx.fillStyle = s.background;
    output.ctx.fillRect(0, 0, w, h);
    output.ctx.save();
    output.ctx.globalAlpha = 1;
    output.ctx.filter = 'none';
    output.ctx.drawImage(bg.canvas, 0, 0);
    output.ctx.restore();
  } else {
    output.ctx.fillStyle = s.background;
    output.ctx.fillRect(0, 0, w, h);
  }
  if (s.mode !== 'pixels') {
    const cw = Math.max(2, Math.round(s.fontSize * 0.62 + s.gapX)),
      ch = Math.max(2, Math.round(s.fontSize + s.gapY));
    const g = grid(cw, ch),
      glyphs = glyphAtlas(s, cw, ch);
    columns = g.cols;
    rows = g.rows;
    glyphCount = glyphs.length;
    if (!glyphs.length) throw Error('Добавьте хотя бы один символ.');
    // Experimental cell tint: use the exact ASCII color grid, including its gaps.
    // At zero opacity the entire result is identical to ordinary ASCII.
    if (s.mode === 'overlay' && s.overlayFill > 0) {
      output.ctx.save();
      output.ctx.globalAlpha = s.overlayFill;
      for (let y = 0; y < g.rows; y++)
        for (let x = 0; x < g.cols; x++) {
          const i = (y * g.cols + x) * 4;
          output.ctx.fillStyle = `rgb(${g.colors[i]},${g.colors[i + 1]},${g.colors[i + 2]})`;
          output.ctx.fillRect(x * cw, y * ch, cw, ch);
        }
      output.ctx.restore();
    }
    const maxMean = Math.max(...glyphs.map((a) => a.mean)) || 1,
      minMean = Math.min(...glyphs.map((a) => a.mean));
    const features = new Float32Array(48);
    const bg = Number.parseInt(s.background.slice(1), 16),
      bgLuma = luma(bg >> 16, (bg >> 8) & 255, bg & 255);
    output.ctx.font = `${s.fontSize}px ${s.font}`;
    output.ctx.textAlign = 'center';
    output.ctx.textBaseline = 'middle';
    output.ctx.globalAlpha = s.opacity;
    for (let y = 0; y < g.rows; y++)
      for (let x = 0; x < g.cols; x++) {
        const cell = y * g.cols + x,
          c: RGB = [g.colors[cell * 4], g.colors[cell * 4 + 1], g.colors[cell * 4 + 2]];
        const raw = luma(g.values[cell * 3], g.values[cell * 3 + 1], g.values[cell * 3 + 2]);
        const tone = bgLuma > 0.5 ? 1 - raw : raw;
        let mean = 0,
          norm = 1;
        if (s.matching === 'shape' || s.allowEmpty) {
          for (let sy = 0; sy < 8; sy++)
            for (let sx = 0; sx < 6; sx++) {
              const v = rgbAt(
                corrected,
                w,
                h,
                x * cw + ((sx + 0.5) * cw) / 6,
                y * ch + ((sy + 0.5) * ch) / 8,
              );
              const f = luma(...v) * (bgLuma > 0.5 ? -1 : 1);
              features[sy * 6 + sx] = f;
              mean += f / 48;
            }
          norm = Math.sqrt(features.reduce((sum, v) => sum + (v - mean) ** 2, 0));
          // Flat regions keep their quantized color instead of exposing the background.
          // Symbol opacity only applies to glyphs, not these solid color cells.
          if (
            s.allowEmpty &&
            s.emptyThreshold > 0 &&
            norm / Math.sqrt(48) <= s.emptyThreshold / 255
          ) {
            output.ctx.save();
            output.ctx.globalAlpha = 1;
            output.ctx.fillStyle = `rgb(${c.join(',')})`;
            output.ctx.fillRect(x * cw, y * ch, cw, ch);
            output.ctx.restore();
            continue;
          }
          for (let i = 0; i < 48; i++) features[i] = (features[i] - mean) / (norm || 1);
        }
        let best = glyphs[0],
          score = Infinity;
        for (const glyph of glyphs) {
          const density = (glyph.mean - minMean) / (maxMean - minMean || 1);
          const toneError = (density - tone) ** 2;
          let shapeError = 0;
          if (s.matching === 'shape' && norm > 0.08) {
            let dot = 0;
            for (let i = 0; i < 48; i++) dot += features[i] * glyph.features[i];
            shapeError = 1 - dot;
          }
          const mix = s.matching === 'shape' && norm > 0.08 ? s.shapeWeight : 0;
          const error = (1 - mix) * toneError + mix * shapeError;
          if (error < score) {
            best = glyph;
            score = error;
          }
        }
        output.ctx.save();
        output.ctx.beginPath();
        output.ctx.rect(x * cw, y * ch, cw, ch);
        output.ctx.clip();
        output.ctx.fillStyle = `rgb(${c.join(',')})`;
        output.ctx.fillText(best.char, x * cw + cw / 2, y * ch + ch / 2, cw);
        output.ctx.restore();
      }
    output.ctx.globalAlpha = 1;
  }
  return {
    id: job.id,
    image: output.ctx.getImageData(0, 0, w, h),
    ms: performance.now() - start,
    columns,
    rows,
    glyphs: glyphCount,
  };
}
