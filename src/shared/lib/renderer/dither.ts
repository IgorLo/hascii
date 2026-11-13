import { blueNoiseThreshold } from './blue-noise';
import type { RGB } from './types';

// Also used as an independent native-pixel rank pattern by png2xp shading.
export const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const floyd = [
  [1, 0, 7 / 16],
  [-1, 1, 3 / 16],
  [0, 1, 5 / 16],
  [1, 1, 1 / 16],
] as const;
const atkinson = [
  [1, 0, 1 / 8],
  [2, 0, 1 / 8],
  [-1, 1, 1 / 8],
  [0, 1, 1 / 8],
  [1, 1, 1 / 8],
  [0, 2, 1 / 8],
] as const;

type Options = {
  algorithm: string;
  strength: number;
  width: number;
  height: number;
  addError: (x: number, y: number, red: number, green: number, blue: number) => void;
};

/** Palette-agnostic spatial policy. Callers retain sample layout and color fitting. */
export function createDither({ algorithm, strength, width, height, addError }: Options) {
  const kernel = algorithm === 'floyd' ? floyd : algorithm === 'atkinson' ? atkinson : [];
  return {
    biasAt(x: number, y: number) {
      return algorithm === 'bayer'
        ? ((bayer[(y % 4) * 4 + (x % 4)] + 0.5) / 16 - 0.5) * 255 * strength
        : algorithm === 'blue-noise'
          ? (blueNoiseThreshold(x, y) - 0.5) * 255 * strength
          : 0;
    },
    diffuse(x: number, y: number, target: RGB, chosen: RGB) {
      if (!kernel.length) return;
      const red = target[0] - chosen[0];
      const green = target[1] - chosen[1];
      const blue = target[2] - chosen[2];
      for (const [dx, dy, weight] of kernel) {
        const nx = x + dx,
          ny = y + dy;
        if (nx < 0 || nx >= width || ny >= height) continue;
        // Keep multiplication order and one Float32 write per channel at the caller.
        addError(
          nx,
          ny,
          red * weight * strength,
          green * weight * strength,
          blue * weight * strength,
        );
      }
    },
  };
}
