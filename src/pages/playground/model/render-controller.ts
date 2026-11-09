import type { Job, Palette, Result, RGB, Settings } from '@/shared/lib/renderer';

interface Callbacks {
  pending: () => void;
  original: (image: ImageData) => void;
  complete: (result: Result) => void;
  error: (message: string) => void;
}

/** Browser-owned queue: only one job runs, and only the newest revision can publish. */
export class RenderController {
  private worker: Worker;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private revision = 0;
  private busy = false;
  private disposed = false;
  private lastStarted = 0;
  private pending: { source: HTMLImageElement; settings: Settings; palette: Palette } | undefined;

  constructor(private callbacks: Callbacks) {
    this.worker = new Worker(new URL('../../../shared/lib/renderer/worker.ts', import.meta.url), {
      type: 'module',
    });
    this.worker.onmessage = (event: MessageEvent<Result>) => {
      this.busy = false;
      if (this.disposed) return;
      if (event.data.id === this.revision) this.callbacks.complete(event.data);
      this.schedule();
    };
    this.worker.onerror = () => {
      this.busy = false;
      this.pending = undefined;
      this.callbacks.error(
        'Не удалось выполнить обработку. Обнови страницу в актуальном браузере.',
      );
    };
  }

  invalidate() {
    this.revision++;
    this.pending = undefined;
    this.callbacks.pending();
  }

  request(source: HTMLImageElement, settings: Settings, palette: Palette) {
    this.invalidate();
    this.pending = { source, settings: { ...settings }, palette };
    this.schedule();
  }

  private schedule() {
    if (this.disposed || this.busy || this.timer !== undefined || !this.pending) return;
    this.timer = setTimeout(
      () => {
        this.timer = undefined;
        this.dispatch();
      },
      Math.max(0, 180 - (performance.now() - this.lastStarted)),
    );
  }

  private dispatch() {
    const next = this.pending;
    if (!next || this.disposed) return;
    this.pending = undefined;
    try {
      const { source, settings, palette } = next;
      const ratio = Math.min(
        1,
        settings.resolution / Math.max(source.naturalWidth, source.naturalHeight),
      );
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(source.naturalWidth * ratio));
      canvas.height = Math.max(1, Math.round(source.naturalHeight * ratio));
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Canvas недоступен в этом браузере.');
      context.drawImage(source, 0, 0, canvas.width, canvas.height);
      const image = context.getImageData(0, 0, canvas.width, canvas.height);
      this.callbacks.original(image);
      const colors: RGB[] = palette.colors.map((hex) => [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
      ]);
      const job: Job = { id: this.revision, image, settings, palette: colors };
      this.busy = true;
      this.lastStarted = performance.now();
      this.worker.postMessage(job, [image.data.buffer]);
    } catch (error) {
      this.busy = false;
      this.callbacks.error(error instanceof Error ? error.message : 'Ошибка обработки.');
    }
  }

  destroy() {
    this.disposed = true;
    clearTimeout(this.timer);
    this.pending = undefined;
    this.worker.terminate();
  }
}
