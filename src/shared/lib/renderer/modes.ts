import type { HalftoneOptions } from './halftone';
import type { PixelArtOptions } from './pixel-art';
import type { RGB, Settings } from './types';

export const modeOrder = [
  'pixel-art',
  'pixels',
  'halftone',
  'overlay',
  'ascii',
  'ascii-fx',
  'png2xp',
] as const;
export type RenderMode = (typeof modeOrder)[number];

type PaletteOptions = Pick<Settings, 'dither' | 'strength'>;
export type PixelOptions = PaletteOptions & Pick<Settings, 'pixelate' | 'pixelSize' | 'background'>;
export type AsciiOptions = PaletteOptions &
  Pick<
    Settings,
    | 'font'
    | 'fontSize'
    | 'gapX'
    | 'gapY'
    | 'chars'
    | 'matching'
    | 'shapeWeight'
    | 'background'
    | 'overlayFill'
    | 'opacity'
    | 'allowEmpty'
    | 'emptyThreshold'
  >;
export type GlyphProfileOptions = Pick<Settings, 'font' | 'gapX' | 'gapY' | 'chars' | 'allowEmpty'>;
type CellOptions = PaletteOptions &
  Pick<Settings, 'cellSize' | 'cellAspect' | 'background' | 'backgroundOpacity' | 'opacity'>;
export type AsciiFxOptions = CellOptions & GlyphProfileOptions & Pick<Settings, 'emptyThreshold'>;
export type Png2xpOptions = CellOptions & Pick<Settings, 'blockShading'>;

type Selection<Id, Kind, Options> = {
  id: Id;
  kind: Kind;
  paletteEnabled: boolean;
  options: Options;
};
export type ActiveMode =
  | Selection<'pixels', 'pixels', PixelOptions>
  | Selection<'ascii' | 'overlay', 'ascii', AsciiOptions>
  | Selection<'ascii-fx', 'cells', AsciiFxOptions>
  | Selection<'png2xp', 'cells', Png2xpOptions>
  | Selection<'halftone', 'halftone', HalftoneOptions>
  | Selection<'pixel-art', 'pixel-art', PixelArtOptions>;

const rgb = (hex: string): RGB => {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

/** Snapshot only the selected renderer's inputs; never reset editable session values. */
export function selectMode(s: Readonly<Settings>): ActiveMode {
  const paletteEnabled = s.paletteEnabled;
  const colors = { dither: s.dither, strength: s.strength };
  switch (s.mode) {
    case 'pixel-art':
      return {
        id: s.mode,
        kind: 'pixel-art',
        paletteEnabled: false,
        options: { columns: s.artColumns, colorCount: s.artColors, iterations: s.artIterations },
      };
    case 'halftone':
      return {
        id: s.mode,
        kind: 'halftone',
        paletteEnabled: false,
        options: {
          size: s.halftoneSize,
          angle: s.halftoneAngle,
          shape: s.halftoneShape,
          colorMode: s.halftoneColor,
          ink: rgb(s.halftoneInk),
          paper: rgb(s.halftonePaper),
          inkB: rgb(s.halftoneInkB),
          angleB: s.halftoneAngleB,
          balance: s.halftoneBalance,
          offsetX: s.halftoneOffsetX,
          offsetY: s.halftoneOffsetY,
        },
      };
    case 'pixels':
      return {
        id: s.mode,
        kind: 'pixels',
        paletteEnabled,
        options: {
          ...colors,
          pixelate: s.pixelate,
          pixelSize: s.pixelSize,
          background: s.background,
        },
      };
    case 'png2xp':
      return {
        id: s.mode,
        kind: 'cells',
        paletteEnabled,
        options: {
          ...colors,
          cellSize: s.cellSize,
          cellAspect: s.cellAspect,
          blockShading: s.blockShading,
          background: s.background,
          backgroundOpacity: s.backgroundOpacity,
          opacity: s.opacity,
        },
      };
    case 'ascii-fx':
      return {
        id: s.mode,
        kind: 'cells',
        paletteEnabled,
        options: {
          ...colors,
          cellSize: s.cellSize,
          cellAspect: s.cellAspect,
          background: s.background,
          backgroundOpacity: s.backgroundOpacity,
          opacity: s.opacity,
          font: s.font,
          gapX: s.gapX,
          gapY: s.gapY,
          chars: s.chars,
          allowEmpty: s.allowEmpty,
          emptyThreshold: s.emptyThreshold,
        },
      };
    default:
      // Unsupported runtime mode values previously followed the ordinary ASCII path.
      return {
        id: s.mode === 'overlay' ? 'overlay' : 'ascii',
        kind: 'ascii',
        paletteEnabled,
        options: {
          ...colors,
          font: s.font,
          fontSize: s.fontSize,
          gapX: s.gapX,
          gapY: s.gapY,
          chars: s.chars,
          matching: s.matching,
          shapeWeight: s.shapeWeight,
          background: s.background,
          overlayFill: s.mode === 'overlay' ? s.overlayFill : 0,
          opacity: s.opacity,
          allowEmpty: s.allowEmpty,
          emptyThreshold: s.emptyThreshold,
        },
      };
  }
}
