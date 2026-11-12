import { compositeFrame, FLAG_FLAT, matchFrame, packRGBA } from '@ascii-fx/core';

import { quantize } from './color';
import { glyphProfile } from './glyph-profile';
import type { RGB, Settings } from './types';

export function renderAsciiFx(image: ImageData, s: Settings, palette: RGB[]) {
  const cw = Math.max(2, Math.round(s.cellSize)),
    ch = Math.max(2, Math.round(cw * s.cellAspect));
  const columns = Math.ceil(image.width / cw),
    rows = Math.ceil(image.height / ch);
  // Match the fixed-size output cells, not a uniform subdivision of an odd source.
  // Edge replication keeps a partial final cell from shifting all previous cells.
  const width = columns * cw,
    height = rows * ch;
  let source: { width: number; height: number; data: Uint8ClampedArray } = image;
  if (width !== image.width || height !== image.height) {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      const row = Math.min(y, image.height - 1) * image.width * 4;
      data.set(image.data.subarray(row, row + image.width * 4), y * width * 4);
      for (let x = image.width; x < width; x++)
        data.set(
          image.data.subarray(row + (image.width - 1) * 4, row + image.width * 4),
          (y * width + x) * 4,
        );
    }
    source = { width, height, data };
  }
  const profile = glyphProfile(s, cw, ch);
  const frame = matchFrame(source, {
    profile,
    columns,
    rows,
    color: 'full',
    alpha: 'ignore',
    flatThreshold: s.allowEmpty ? s.emptyThreshold : 0,
  });
  const count = columns * rows;
  const planes = [frame.foreground!, frame.background!].map((plane) => {
    const values = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      values[i * 3] = plane[i] & 255;
      values[i * 3 + 1] = (plane[i] >>> 8) & 255;
      values[i * 3 + 2] = (plane[i] >>> 16) & 255;
    }
    return quantize(values, columns, rows, palette, palette.length ? s.dither : 'none', s.strength);
  });
  const bg = Number.parseInt(s.background.slice(1), 16);
  const base = [bg >> 16, (bg >> 8) & 255, bg & 255];
  for (let i = 0; i < count; i++) {
    const background = base.map((value, k) =>
      Math.round(value + (planes[1][i * 4 + k] - value) * s.backgroundOpacity),
    ) as RGB;
    const foreground = background.map((value, k) =>
      Math.round(value + (planes[0][i * 4 + k] - value) * s.opacity),
    ) as RGB;
    frame.background![i] = packRGBA(...background);
    frame.foreground![i] = packRGBA(...(frame.flags[i] & FLAG_FLAT ? background : foreground));
  }
  const pixels = compositeFrame(frame);
  const output = new Uint8ClampedArray(image.width * image.height * 4);
  for (let y = 0; y < image.height; y++)
    output.set(
      pixels.data.subarray(y * pixels.width * 4, (y * pixels.width + image.width) * 4),
      y * image.width * 4,
    );
  return {
    image: new ImageData(output, image.width, image.height),
    columns,
    rows,
    glyphs: profile.glyphCount,
  };
}
