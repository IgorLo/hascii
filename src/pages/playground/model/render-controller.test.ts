import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Job, Result } from '@/shared/lib/renderer';

import { RenderController } from './render-controller';
import { defaults } from './settings';

class FakeWorker {
  static current: FakeWorker;
  onmessage?: (event: MessageEvent<Result>) => void;
  onerror?: () => void;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() {
    FakeWorker.current = this;
  }
  reply(id: number) {
    this.onmessage?.({
      data: { id, ms: 1, columns: 1, rows: 1, glyphs: 0 },
    } as MessageEvent<Result>);
  }
}
const source = { naturalWidth: 1200, naturalHeight: 600 } as HTMLImageElement;
const palette = { id: 'x', name: 'x', author: 'x', colors: ['ffffff'] };
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
  vi.stubGlobal('Worker', FakeWorker);
  vi.stubGlobal('document', {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ({
        drawImage: vi.fn(),
        getImageData: (_x: number, _y: number, width: number, height: number) => ({
          width,
          height,
          data: new Uint8ClampedArray(width * height * 4),
        }),
      }),
    }),
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe('latest-render queue', () => {
  it('coalesces changes, discards stale replies and renders the latest revision', () => {
    const complete = vi.fn();
    const controller = new RenderController({
      pending: vi.fn(),
      original: vi.fn(),
      complete,
      error: vi.fn(),
    });
    controller.request(source, { ...defaults }, palette);
    vi.advanceTimersByTime(180);
    const worker = FakeWorker.current;
    const first = worker.postMessage.mock.calls[0][0] as Job;
    controller.request(source, { ...defaults, brightness: 10 }, palette);
    controller.request(source, { ...defaults, brightness: 20 }, palette);
    expect(worker.postMessage).toHaveBeenCalledTimes(1);
    worker.reply(first.id);
    expect(complete).not.toHaveBeenCalled();
    vi.advanceTimersByTime(180);
    const latest = worker.postMessage.mock.calls[1][0] as Job;
    expect(latest.settings.brightness).toBe(20);
    expect([latest.image.width, latest.image.height]).toEqual([900, 450]);
    worker.reply(latest.id);
    expect(complete).toHaveBeenCalledOnce();
    controller.destroy();
  });
  it('does not upscale and destroys pending timers and worker', () => {
    const controller = new RenderController({
      pending: vi.fn(),
      original: vi.fn(),
      complete: vi.fn(),
      error: vi.fn(),
    });
    controller.request(
      { naturalWidth: 10, naturalHeight: 5 } as HTMLImageElement,
      { ...defaults },
      palette,
    );
    vi.advanceTimersByTime(180);
    const worker = FakeWorker.current;
    expect(worker.postMessage.mock.calls[0][0].image.width).toBe(10);
    controller.request(source, { ...defaults }, palette);
    controller.destroy();
    vi.runAllTimers();
    expect(worker.postMessage).toHaveBeenCalledTimes(1);
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
});
