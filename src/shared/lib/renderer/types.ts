export type RGB = [number, number, number];
export interface Palette {
  id: string;
  name: string;
  author: string;
  colors: string[];
  url?: string;
}
export interface Settings {
  mode: 'pixels' | 'ascii' | 'overlay' | 'ascii-fx' | 'png2xp';
  cellSize: number;
  cellAspect: number;
  blockShading: boolean;
  resolution: number;
  correction: boolean;
  brightness: number;
  contrast: number;
  saturation: number;
  pixelate: boolean;
  pixelSize: number;
  paletteEnabled: boolean;
  palette: string;
  dither: 'none' | 'bayer' | 'floyd' | 'atkinson';
  strength: number;
  font: string;
  fontSize: number;
  gapX: number;
  gapY: number;
  chars: string;
  matching: 'tone' | 'shape';
  shapeWeight: number;
  background: string;
  blur: number;
  backgroundOpacity: number;
  overlayFill: number;
  opacity: number;
  allowEmpty: boolean;
  emptyThreshold: number;
}
export interface Job {
  id: number;
  image: ImageData;
  settings: Settings;
  palette: RGB[];
}
export interface Result {
  id: number;
  image?: ImageData;
  error?: string;
  ms: number;
  columns: number;
  rows: number;
  glyphs: number;
}
