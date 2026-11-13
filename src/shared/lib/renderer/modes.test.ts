import { describe, expect, it } from 'vitest';

import { modeOrder, selectMode, type Settings } from './index';

const settings: Settings = {
  mode: 'pixel-art',
  halftoneSize: 12,
  halftoneAngle: 45,
  halftoneShape: 'round',
  halftoneColor: 'mono',
  halftoneInk: '#182d75',
  halftonePaper: '#ffffff',
  halftoneInkB: '#e83d86',
  halftoneAngleB: 75,
  halftoneBalance: 0.5,
  halftoneOffsetX: 0,
  halftoneOffsetY: 0,
  artColumns: 64,
  artColors: 8,
  artIterations: 12,
  cellSize: 8,
  cellAspect: 1,
  blockShading: true,
  resolution: 900,
  correction: true,
  brightness: 0,
  contrast: 1,
  saturation: 1,
  pixelate: true,
  pixelSize: 4,
  paletteEnabled: true,
  palette: 'pico-8',
  dither: 'atkinson',
  strength: 0.1,
  font: 'monospace',
  fontSize: 12,
  gapX: 0,
  gapY: 0,
  chars: ' .+#',
  matching: 'tone',
  shapeWeight: 0.45,
  background: '#0c061b',
  blur: 3,
  backgroundOpacity: 1,
  overlayFill: 0.8,
  opacity: 1,
  allowEmpty: true,
  emptyThreshold: 0,
};

describe('rendering mode projection', () => {
  it('owns the established mode order', () => {
    expect(modeOrder).toEqual([
      'pixel-art',
      'pixels',
      'halftone',
      'overlay',
      'ascii',
      'ascii-fx',
      'png2xp',
    ]);
  });
  it('isolates Pixel Art from unrelated settings without mutating the session', () => {
    const source = {
      ...settings,
      pixelSize: 19,
      fontSize: 37,
      halftoneSize: 30,
      palette: 'other',
      strength: 1,
    };
    const before = structuredClone(source);
    expect(selectMode(source)).toEqual({
      id: 'pixel-art',
      kind: 'pixel-art',
      paletteEnabled: false,
      options: { columns: 64, colorCount: 8, iterations: 12 },
    });
    expect(source).toEqual(before);
  });
  it('translates Halftone settings to its ink and screen inputs', () => {
    expect(selectMode({ ...settings, mode: 'halftone' })).toEqual({
      id: 'halftone',
      kind: 'halftone',
      paletteEnabled: false,
      options: {
        size: 12,
        angle: 45,
        shape: 'round',
        colorMode: 'mono',
        ink: [24, 45, 117],
        paper: [255, 255, 255],
        inkB: [232, 61, 134],
        angleB: 75,
        balance: 0.5,
        offsetX: 0,
        offsetY: 0,
      },
    });
  });
  it('gives block fitting only its own settings', () => {
    expect(selectMode({ ...settings, mode: 'png2xp', paletteEnabled: false })).toEqual({
      id: 'png2xp',
      kind: 'cells',
      paletteEnabled: false,
      options: {
        cellSize: 8,
        cellAspect: 1,
        blockShading: true,
        dither: 'atkinson',
        strength: 0.1,
        background: '#0c061b',
        backgroundOpacity: 1,
        opacity: 1,
      },
    });
  });
  it('retains glyph spacing for ASCII FX while excluding legacy matching inputs', () => {
    expect(selectMode({ ...settings, mode: 'ascii-fx', gapX: 2, gapY: 3 })).toEqual({
      id: 'ascii-fx',
      kind: 'cells',
      paletteEnabled: true,
      options: {
        cellSize: 8,
        cellAspect: 1,
        dither: 'atkinson',
        strength: 0.1,
        background: '#0c061b',
        backgroundOpacity: 1,
        opacity: 1,
        font: 'monospace',
        gapX: 2,
        gapY: 3,
        chars: ' .+#',
        allowEmpty: true,
        emptyThreshold: 0,
      },
    });
  });
  it('uses cell tint only for overlay and keeps other mode values in the session', () => {
    const ascii = selectMode({ ...settings, mode: 'ascii' });
    const overlay = selectMode({ ...settings, mode: 'overlay' });
    expect(ascii.kind).toBe('ascii');
    expect(overlay.kind).toBe('ascii');
    expect(overlay.options).toEqual({ ...ascii.options, overlayFill: 0.8 });
    expect(ascii.options).toHaveProperty('overlayFill', 0);
    expect(settings.overlayFill).toBe(0.8);
  });
  it('projects only pixel-grid and palette quantization inputs for Pixels', () => {
    expect(selectMode({ ...settings, mode: 'pixels' })).toEqual({
      id: 'pixels',
      kind: 'pixels',
      paletteEnabled: true,
      options: {
        pixelate: true,
        pixelSize: 4,
        background: '#0c061b',
        dither: 'atkinson',
        strength: 0.1,
      },
    });
  });
});
