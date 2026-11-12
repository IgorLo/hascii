import type { AsciiProfile } from '@ascii-fx/core';

import { surface } from './canvas';
import type { Settings } from './types';

let cached: { key: string; profile: AsciiProfile } | undefined;

/** Bounded, ephemeral profile using the same font and spacing as the output grid. */
export function glyphProfile(s: Settings, cw: number, ch: number): AsciiProfile {
  const characters = [...new Set(Array.from((s.allowEmpty ? ' ' : '') + s.chars))]
    .filter((char) => !/[\r\n\t]/.test(char) && (s.allowEmpty || char.trim()))
    .slice(0, 512);
  const key = JSON.stringify([s.font, cw, ch, s.gapX, s.gapY, characters]);
  if (cached?.key === key) return cached.profile;
  const glyph = surface(cw, ch);
  glyph.ctx.font = `${Math.max(2, ch - s.gapY)}px ${s.font}`;
  glyph.ctx.textAlign = 'center';
  glyph.ctx.textBaseline = 'middle';
  glyph.ctx.fillStyle = '#fff';
  const tiles = characters
    .map((char) => {
      glyph.ctx.clearRect(0, 0, cw, ch);
      glyph.ctx.fillText(char, cw / 2, ch / 2, Math.max(1, cw - s.gapX));
      const rgba = glyph.ctx.getImageData(0, 0, cw, ch).data;
      return { char, alpha: Uint8Array.from({ length: cw * ch }, (_, i) => rgba[i * 4 + 3]) };
    })
    .filter((tile) => tile.char === ' ' || tile.alpha.some((alpha) => alpha > 0));
  if (!tiles.length) throw new Error('Добавьте хотя бы один символ.');
  const columns = Math.ceil(Math.sqrt(tiles.length));
  const width = columns * cw,
    height = Math.ceil(tiles.length / columns) * ch;
  const data = new Uint8Array(width * height);
  const masksLo = new Uint32Array(tiles.length),
    masksHi = new Uint32Array(tiles.length);
  const coverage = new Uint16Array(tiles.length);
  tiles.forEach(({ alpha }, index) => {
    const tx = (index % columns) * cw,
      ty = Math.floor(index / columns) * ch;
    for (let y = 0; y < ch; y++)
      data.set(alpha.subarray(y * cw, (y + 1) * cw), (ty + y) * width + tx);
    coverage[index] = Math.round((alpha.reduce((sum, a) => sum + a, 0) * 65535) / (cw * ch * 255));
    for (let sy = 0; sy < 8; sy++)
      for (let sx = 0; sx < 8; sx++) {
        const x0 = Math.floor((sx * cw) / 8),
          y0 = Math.floor((sy * ch) / 8);
        const x1 = Math.max(x0 + 1, Math.floor(((sx + 1) * cw) / 8));
        const y1 = Math.max(y0 + 1, Math.floor(((sy + 1) * ch) / 8));
        let sum = 0;
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) sum += alpha[y * cw + x];
        if (sum >= (x1 - x0) * (y1 - y0) * 127.5) {
          const bit = sy * 8 + sx;
          if (bit < 32) masksLo[index] |= 1 << bit;
          else masksHi[index] |= 1 << (bit - 32);
        }
      }
  });
  // Runtime fingerprints identify this local atlas only; frames/profiles are never serialized.
  let hash = 0x811c9dc5;
  for (const byte of data) hash = Math.imul(hash ^ byte, 0x01000193) >>> 0;
  const profile: AsciiProfile = {
    version: 1,
    id: 'hascii-runtime',
    fingerprint: hash.toString(16).padStart(64, '0'),
    charsetHash: '0'.repeat(64),
    fontHash: '0'.repeat(64),
    glyphs: tiles.map((tile) => tile.char),
    glyphCount: tiles.length,
    metrics: {
      unitsPerEm: 1000,
      ascent: 1000,
      descent: 0,
      lineGap: 0,
      advanceUnits: Math.round((cw / ch) * 1000),
      cellWidth: cw,
      cellHeight: ch,
      baseline: Math.round(ch / 2),
    },
    atlas: {
      width,
      height,
      pitchWidth: cw,
      pitchHeight: ch,
      cellWidth: cw,
      cellHeight: ch,
      padding: 0,
      columns,
      data,
    },
    structural: { masksLo, masksHi, coverage },
    metadata: {
      id: 'hascii-runtime',
      charset: 'custom',
      fontFamily: s.font,
      compilerVersion: 'hascii-canvas-v1',
    },
  };
  cached = { key, profile };
  return profile;
}
