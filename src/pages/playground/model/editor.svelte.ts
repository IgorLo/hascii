import { SvelteSet } from 'svelte/reactivity';

import { builtInPalettes, parsePaletteSlug, validPalette } from '@/shared/lib/palettes';
import type { Palette, Result, Settings } from '@/shared/lib/renderer';

import { RenderController } from './render-controller';
import { defaults, presetSettings } from './settings';

export class EditorModel {
  settings = $state<Settings>({ ...defaults });
  palettes = $state<Palette[]>([...builtInPalettes]);
  status = $state('Загружаем пример…');
  error = $state('');
  storageWarning = $state('');
  sourceInfo = $state('—');
  outputInfo = $state('—');
  recipe = $state('Загрузка…');
  canExport = $state(false);
  importing = $state(false);
  importStatus = $state('Импортированные палитры сохраняются в этом браузере.');
  private imported: Palette[] = [];
  private source: HTMLImageElement | undefined;
  private sourceName = 'reference';
  private controller: RenderController | undefined;
  private resultCanvas: HTMLCanvasElement | undefined;
  private loadVersion = 0;
  private loading = false;
  private disposed = false;
  private exportVersion = 0;
  private importAbort: AbortController | undefined;
  private downloadUrls = new SvelteSet<string>();
  private downloadTimers = new SvelteSet<ReturnType<typeof setTimeout>>();

  mount(original: HTMLCanvasElement, result: HTMLCanvasElement) {
    this.resultCanvas = result;
    try {
      const saved: unknown = JSON.parse(localStorage.getItem('hascii-palettes') || '[]');
      if (Array.isArray(saved)) this.imported = saved.filter(validPalette);
      this.palettes = [
        ...builtInPalettes,
        ...this.imported.filter((p) => !builtInPalettes.some((b) => b.id === p.id)),
      ];
      const chars = localStorage.getItem('hascii-chars');
      if (chars !== null) this.settings.chars = chars;
    } catch {
      /* Storage is optional; malformed data starts a fresh session. */
    }
    try {
      this.controller = new RenderController({
        pending: () => {
          this.canExport = false;
          this.exportVersion++;
          this.status = 'Обрабатываем…';
        },
        original: (image) => {
          original.width = image.width;
          original.height = image.height;
          original.getContext('2d')?.putImageData(image, 0, 0);
        },
        complete: (value) => this.complete(value),
        error: (message) => {
          this.error = message;
          this.status = 'Ошибка обработки';
          this.canExport = false;
        },
      });
      void this.loadSample();
    } catch {
      this.error = 'Не удалось запустить обработку. Обнови страницу в актуальном браузере.';
    }
    return () => this.destroy();
  }

  private complete(result: Result) {
    if (result.error) {
      this.error = result.error;
      this.status = 'Проверь настройки';
      return;
    }
    if (!result.image || !this.resultCanvas) return;
    this.resultCanvas.width = result.image.width;
    this.resultCanvas.height = result.image.height;
    this.resultCanvas.getContext('2d')?.putImageData(result.image, 0, 0);
    this.outputInfo = `${result.image.width} × ${result.image.height}`;
    this.status = `Готово · ${Math.round(result.ms)} мс`;
    this.canExport = true;
    const palette = this.palettes.find((p) => p.id === this.settings.palette)!;
    this.recipe = `${result.columns} × ${result.rows} ячеек · ${this.settings.paletteEnabled ? palette.name : 'исходные цвета'} · ${this.settings.paletteEnabled ? this.settings.dither : 'без дизеринга'}${result.glyphs ? ' · ' + result.glyphs + ' символов' : ''}`;
  }

  update<K extends keyof Settings>(key: K, value: Settings[K]) {
    this.settings[key] = value;
    if (key === 'chars') this.persist('hascii-chars', this.settings.chars);
    this.error = '';
    this.request();
  }

  preset(name: string) {
    this.settings = presetSettings(name, this.settings);
    this.error = '';
    this.request();
  }

  private request() {
    const palette = this.palettes.find((p) => p.id === this.settings.palette);
    if (this.loading) this.controller?.invalidate();
    else if (this.source && palette) this.controller?.request(this.source, this.settings, palette);
  }

  private persist(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      this.storageWarning =
        'Браузер не разрешил локальное сохранение. Текущая сессия продолжает работать.';
    }
  }

  async importPalette(input: string) {
    if (this.importing) return;
    this.importing = true;
    this.importStatus = 'Запрашиваем Lospec…';
    this.importAbort = new AbortController();
    try {
      const slug = parsePaletteSlug(input);
      if (!slug)
        throw new Error('Вставь ссылку на палитру Lospec или её имя, например sweetie-16.');
      const response = await fetch('/api/palette/' + slug, {
        signal: AbortSignal.any([this.importAbort.signal, AbortSignal.timeout(20000)]),
      });
      if (!response.ok)
        throw new Error('Lospec не вернул палитру. Проверь имя и подключение к интернету.');
      const data = await response.json();
      const palette: Palette = {
        id: slug,
        name: data.name,
        author: typeof data.author === 'string' ? data.author : 'Lospec',
        colors: data.colors,
        url: 'https://lospec.com/palette-list/' + slug,
      };
      if (!validPalette(palette))
        throw new Error('Получен неподдерживаемый ответ Lospec (ожидается 1–1024 HEX-цветов).');
      if (this.disposed) return;
      this.palettes = [...this.palettes.filter((p) => p.id !== slug), palette];
      this.imported = [...this.imported.filter((p) => p.id !== slug), palette];
      this.persist('hascii-palettes', JSON.stringify(this.imported));
      this.settings.palette = slug;
      this.settings.paletteEnabled = true;
      this.request();
      this.importStatus = `Добавлена «${palette.name}», ${palette.colors.length} цветов. Сохранена локально.`;
    } catch (error) {
      if (!this.disposed)
        this.importStatus = error instanceof Error ? error.message : String(error);
    } finally {
      this.importing = false;
    }
  }

  loadSample() {
    return this.loadImage('/sample.png', 'reference');
  }

  loadFile(file?: File) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.error = 'Выбери файл изображения.';
      return;
    }
    if (file.size > 40 * 1024 * 1024) {
      this.error = 'Используй изображение до 40 МБ.';
      return;
    }
    const url = URL.createObjectURL(file);
    void this.loadImage(url, file.name).finally(() => URL.revokeObjectURL(url));
  }

  private async loadImage(url: string, name: string) {
    const version = ++this.loadVersion;
    this.loading = true;
    this.controller?.invalidate();
    this.status = 'Загружаем изображение…';
    this.error = '';
    const image = new Image();
    image.src = url;
    try {
      await image.decode();
      if (version !== this.loadVersion || this.disposed) return;
      this.source = image;
      this.sourceName = name;
      this.sourceInfo = `${image.naturalWidth} × ${image.naturalHeight}`;
    } catch {
      if (version === this.loadVersion && !this.disposed)
        this.error = 'Не удалось открыть изображение. Попробуй PNG, JPG или WebP.';
    } finally {
      if (version === this.loadVersion && !this.disposed) {
        this.loading = false;
        this.request();
      }
    }
  }

  exportPng() {
    if (!this.canExport || !this.resultCanvas) return;
    const version = this.exportVersion;
    const filename = this.sourceName.replace(/\.[^.]+$/, '') + '-hascii.png';
    this.resultCanvas.toBlob((blob) => {
      if (!blob || this.disposed || !this.canExport || version !== this.exportVersion) return;
      const url = URL.createObjectURL(blob);
      this.downloadUrls.add(url);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      const timer = setTimeout(() => {
        URL.revokeObjectURL(url);
        this.downloadUrls.delete(url);
        this.downloadTimers.delete(timer);
      }, 5000);
      this.downloadTimers.add(timer);
    }, 'image/png');
  }

  private destroy() {
    this.disposed = true;
    this.loadVersion++;
    this.controller?.destroy();
    this.importAbort?.abort();
    for (const url of this.downloadUrls) URL.revokeObjectURL(url);
    this.downloadUrls.clear();
    for (const timer of this.downloadTimers) clearTimeout(timer);
    this.downloadTimers.clear();
    this.source = undefined;
    this.resultCanvas = undefined;
  }
}
