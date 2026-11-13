import { ImageData as NativeImageData } from '@napi-rs/canvas';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { type HalftoneOptions, renderHalftone } from './halftone';

beforeAll(() => vi.stubGlobal('ImageData', NativeImageData));
const options: HalftoneOptions = {
  size: 12,
  angle: 0,
  shape: 'round',
  colorMode: 'mono',
  ink: [0, 0, 0],
  paper: [255, 255, 255],
  inkB: [220, 30, 130],
  angleB: 75,
  balance: 0.5,
  offsetX: 0,
  offsetY: 0,
};
function solid(value: number, width = 96, height = 96) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) data.set([value, value, value, 255], i);
  return new ImageData(data, width, height);
}
describe('halftone image conversion', () => {
  it('still shows paper and ink for a two-pixel screen at zero angle', () => {
    for (const shape of ['round', 'diamond', 'line'] as const) {
      const image = renderHalftone(solid(128), { ...options, size: 2, angle: 0, shape }).image;
      const ink = [...image.data].filter((v, i) => i % 4 === 0 && v === 0).length / (96 * 96);
      expect(ink).toBeGreaterThan(0.2);
      expect(ink).toBeLessThan(0.8);
    }
  });
  it('keeps white margins clean even with yellow ink and an extreme balance', () => {
    const image = renderHalftone(solid(255), {
      ...options,
      colorMode: 'duotone',
      ink: [255, 255, 0],
      inkB: [0, 0, 0],
      balance: 1,
    }).image;
    expect([...image.data].every((value) => value === 255)).toBe(true);
  });
  it('shows both single inks and their overlap when a dark region is printed out of register', () => {
    const source = solid(255, 48, 24);
    for (let y = 0; y < 24; y++)
      for (let x = 0; x < 24; x++) source.data.set([0, 0, 0, 255], (y * 48 + x) * 4);
    const image = renderHalftone(source, {
      ...options,
      colorMode: 'duotone',
      ink: [0, 255, 255],
      inkB: [255, 0, 255],
      offsetX: 12,
    }).image;
    const pixel = (x: number) => [...image.data.slice((12 * 48 + x) * 4, (12 * 48 + x) * 4 + 3)];
    expect(pixel(6)).toEqual([0, 255, 255]);
    expect(pixel(18)).toEqual([0, 0, 255]);
    expect(pixel(30)).toEqual([255, 0, 255]);
    expect(pixel(42)).toEqual([255, 255, 255]);
  });
  it('keeps a partially cyan dark color chromatic rather than losing cyan under black dots', () => {
    const source = solid(0, 192, 192);
    for (let i = 0; i < source.data.length; i += 4) source.data.set([64, 128, 128, 255], i);
    const image = renderHalftone(source, { ...options, colorMode: 'cmyk', angle: 45 }).image;
    const means = [0, 0, 0];
    for (let i = 0; i < image.data.length; i += 4)
      for (let c = 0; c < 3; c++) means[c] += image.data[i + c] / (192 * 192);
    expect(means[0]).toBeGreaterThan(49);
    expect(means[0]).toBeLessThan(79);
    expect(means[1]).toBeGreaterThan(113);
    expect(means[1]).toBeLessThan(143);
    expect(means[2]).toBeCloseTo(means[1], 0);
  });
  it('keeps white paper clean and full black completely inked for every spot shape', () => {
    for (const shape of ['round', 'diamond', 'line'] as const) {
      for (const value of [0, 255]) {
        const result = renderHalftone(solid(value), { ...options, shape }).image;
        expect([...result.data].filter((_, i) => i % 4 !== 3).every((v) => v === value)).toBe(true);
      }
    }
  });
  it('represents a midtone by roughly half ink coverage and changes its pattern with period', () => {
    const first = renderHalftone(solid(128), options).image;
    const black = [...first.data].filter((v, i) => i % 4 === 0 && v === 0).length;
    expect(black / (96 * 96)).toBeGreaterThan(0.43);
    expect(black / (96 * 96)).toBeLessThan(0.57);
    expect(renderHalftone(solid(128), { ...options, size: 8 }).image.data).not.toEqual(first.data);
  });
  it('keeps tiny and narrow images finite and opaque in each color mode', () => {
    for (const colorMode of ['mono', 'cmyk', 'duotone'] as const) {
      const result = renderHalftone(solid(90, 1, 9), { ...options, colorMode }).image;
      expect(result.width).toBe(1);
      expect(result.height).toBe(9);
      expect([...result.data].filter((_, i) => i % 4 === 3)).toEqual(Array(9).fill(255));
    }
  });
  it('translates the entire second ink layer and exposes paper at the shifted border', () => {
    const image = solid(0, 24, 24);
    const settings: HalftoneOptions = {
      ...options,
      colorMode: 'duotone',
      ink: [255, 255, 255],
      inkB: [0, 0, 0],
    };
    const plain = renderHalftone(image, settings).image;
    const shifted = renderHalftone(image, { ...settings, offsetX: 6 }).image;
    expect(plain.data[0]).toBe(0);
    expect(shifted.data[0]).toBe(255);
    expect(shifted.data[(12 * 24 + 12) * 4]).toBe(0);
  });
});
