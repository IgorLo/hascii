<script lang="ts">
  import { onMount } from 'svelte';
  import { MediaQuery } from 'svelte/reactivity';
  import { Button, Drawer, FileInput, Link, Panel, Select } from 'svelte-ascii-ui';

  import { asset, resolve } from '$app/paths';

  import { EditorModel } from '../model/editor.svelte';
  import Controls from './Controls.svelte';
  import ModePicker from './ModePicker.svelte';

  const editor = new EditorModel();
  let original: HTMLCanvasElement;
  let result: HTMLCanvasElement;
  const mobile = new MediaQuery('(max-width: 760px)', false);
  let selectedView = $state<string | null>(null);
  const view = $derived(selectedView ?? (mobile.current ? 'result' : 'side'));
  let toolsOpen = $state(false);
  let section = $state<'photo' | 'tone' | 'color' | 'ascii'>('photo');
  const artMode = $derived(['halftone', 'pixel-art'].includes(editor.settings.mode));
  const sections = $derived([
    { value: 'photo', label: 'Фото', title: 'Фото и пресеты' },
    { value: 'tone', label: 'Тон', title: 'Холст и тон' },
    { value: 'color', label: 'Цвет', title: 'Цвет и дизеринг' },
    {
      value: 'ascii',
      label: artMode ? 'Режим' : 'ASCII',
      title: artMode ? 'Настройки режима' : 'Символы и фон',
    },
  ] as const);
  const sectionTitle = $derived(sections.find((item) => item.value === section)!.title);
  let dragging = $state(false);
  const views = [
    { value: 'side', label: 'Рядом' },
    { value: 'stack', label: 'Сверху вниз' },
    { value: 'result', label: 'Только результат' },
  ];
  onMount(() => editor.mount(original, result));
</script>

{#snippet upload()}
  <section
    id="drop"
    class={['drop-zone', { dragging }]}
    aria-label="Загрузка изображения"
    ondragover={(event) => {
      event.preventDefault();
      dragging = true;
    }}
    ondragleave={() => (dragging = false)}
    ondrop={(event) => {
      event.preventDefault();
      dragging = false;
      editor.loadFile(event.dataTransfer?.files[0]);
    }}
  >
    <FileInput
      id="file"
      size="s"
      accept="image/*,.heic,.heif"
      aria-label="Загрузить изображение"
      chooseLabel="[+] Загрузить изображение"
      emptyText="Фото с телефона, HEIC, JPG, PNG, WebP"
      clearLabel="Убрать выбор"
      onchange={(event) => {
        editor.loadFile(event.currentTarget.files?.[0]);
        event.currentTarget.value = '';
      }}
    />
    <p class="hint">или перетащи его сюда · до 40 МБ</p>
  </section>
  <Button id="sample" size="s" onclick={() => void editor.loadSample()}
    >&lt; Вернуть картинку-пример</Button
  >
{/snippet}

<header class="app-header">
  <h1 class="brand">
    <img class="brand-image" src={asset('/hascii-mark.png')} alt="" width="900" height="656" />
    <Link href={resolve('/')} aria-label="HASCII — главная" size="inherit">HASCII</Link>
  </h1>
  <Button
    id="export"
    aria-label="Сохранить PNG"
    size="s"
    variant="primary"
    disabled={!editor.canExport}
    onclick={() => editor.exportPng()}>{mobile.current ? 'PNG ↓' : 'Сохранить PNG'}</Button
  >
</header>

<main class="workspace">
  {#if !mobile.current}
    <aside class="aui-scrollbar" aria-label="Настройки изображения">
      <div class="intro">
        <p>Пиксели, символы и немного контролируемого шума.</p>
      </div>
      {@render upload()}
      <Controls {editor} />
      <footer class="hint">
        Изображение остаётся на устройстве.<br />Только импорт палитры обращается к Lospec.
      </footer>
    </aside>
  {/if}

  <article class="preview-area aui-scrollbar" aria-label="Превью изображения">
    <div class="toolbar">
      <ModePicker value={editor.settings.mode} onchange={(mode) => editor.update('mode', mode)} />
      <span id="status" role="status">{editor.status}</span>
    </div>
    <div class="preview-toolbar">
      {#if mobile.current}
        <Select
          showPlaceholder={false}
          size="s"
          aria-label="Расположение превью"
          options={views.map((item) => ({ value: item.value, label: item.label }))}
          bind:value={() => view, (value) => (selectedView = value || 'result')}
        />
      {:else}
        <span>Превью</span>
        <div class="button-row" role="group" aria-label="Расположение превью">
          {#each views as item (item.value)}
            <Button
              size="s"
              data-view={item.value}
              aria-pressed={view === item.value}
              variant={view === item.value ? 'primary' : 'default'}
              onclick={() => (selectedView = item.value)}>{item.label}</Button
            >
          {/each}
        </div>
        <small class="hint">Расположение не влияет на PNG</small>
      {/if}
    </div>
    <div id="previews" class="previews" data-view={view} aria-busy={!editor.canExport}>
      <figure class="original-figure" hidden={view === 'result'}>
        <figcaption>
          <span>01 / ОРИГИНАЛ</span><span id="sourceInfo">{editor.sourceInfo}</span>
        </figcaption>
        <Panel size="s"
          ><div class="canvas-wrap">
            <canvas id="original" bind:this={original} aria-label="Исходное изображение"></canvas>
          </div></Panel
        >
      </figure>
      <figure>
        <figcaption>
          <span>02 / РЕЗУЛЬТАТ</span><span id="outputInfo">{editor.outputInfo}</span>
        </figcaption>
        <Panel size="s"
          ><div class="canvas-wrap">
            <canvas id="result" bind:this={result} aria-label="Обработанное изображение"></canvas>
          </div></Panel
        >
      </figure>
    </div>
    <p id="recipe" class="recipe">{editor.recipe}</p>
    <p id="error" class="error" role="alert">{editor.error}</p>
    {#if editor.storageWarning}<p class="error" role="status">{editor.storageWarning}</p>{/if}
    <div class="note">
      <strong>Своя текстура, один шаг за раз.</strong>
      <p>
        Начни с пресета, выбери палитру, затем переключись на символы. «По форме» старается
        сохранить линии и границы; «По яркости» даёт более ровную текстовую фактуру.
      </p>
      <p>
        Пример с хаски сгенерирован. Можно загрузить свою фотографию. Размытие и сглаживание букв
        добавляют промежуточные оттенки даже при ограниченной палитре.
      </p>
    </div>
  </article>
</main>

{#if mobile.current}
  <nav class="mobile-tools" aria-label="Инструменты изображения">
    {#each sections as item (item.value)}
      <Button
        size="s"
        fullWidth
        style="min-height: 48px"
        aria-haspopup="dialog"
        data-tool={item.value}
        onclick={(event) => {
          event.currentTarget.focus();
          section = item.value;
          toolsOpen = true;
        }}
      >
        {item.label}
      </Button>
    {/each}
  </nav>
  <Drawer
    data-mobile-settings
    bind:open={toolsOpen}
    title={sectionTitle}
    closeLabel="Закрыть настройки"
    style="width: 100%; max-width: 100%; height: 100dvh; max-height: 100dvh; padding-top: env(safe-area-inset-top); padding-left: env(safe-area-inset-left); padding-right: env(safe-area-inset-right);"
  >
    <div class="mobile-settings aui-scrollbar">
      {#if section === 'photo'}{@render upload()}{/if}
      <Controls {editor} {section} />
      {#if editor.error}<p class="error" role="alert">{editor.error}</p>{/if}
    </div>
    {#snippet footer()}
      <div class="mobile-settings-footer">
        <span class="hint" role="status">{editor.status}</span>
        <Button fullWidth size="m" style="min-height: 48px" onclick={() => (toolsOpen = false)}>
          Показать результат
        </Button>
      </div>
    {/snippet}
  </Drawer>
{/if}

<style>
  .mobile-tools {
    position: fixed;
    inset-inline: 0;
    bottom: 0;
    z-index: 10;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 4px;
    padding: 10px max(8px, env(safe-area-inset-right)) calc(10px + env(safe-area-inset-bottom))
      max(8px, env(safe-area-inset-left));
    background: var(--bg);
    border-top: 1px dashed var(--muted);
  }
  .mobile-settings {
    height: 100%;
    overflow: auto;
    align-content: start;
    overscroll-behavior: contain;
    min-width: 0;
    display: grid;
    gap: 16px;
    padding-block: 8px;
  }
  .mobile-settings-footer {
    width: 100%;
    display: grid;
    gap: 8px;
    padding-bottom: env(safe-area-inset-bottom);
  }

  .app-header {
    min-height: 88px;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
    padding: 18px 28px;
    border-bottom: 1px dashed var(--muted);
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
    color: var(--text);
    font-size: 40px;
    line-height: 1;
    font-weight: 400;
    margin: 0 auto 0 0;
    text-decoration: none;
  }
  .brand-image {
    display: block;
    height: 1em;
    width: auto;
    box-sizing: border-box;
    padding: 2px;
    border: 1px dashed var(--muted);
    image-rendering: pixelated;
  }
  .workspace {
    display: grid;
    grid-template-columns: minmax(0, 380px) minmax(0, 1fr);
  }
  aside {
    min-width: 0;
    display: grid;
    align-content: start;
    gap: 18px;
    padding: 28px 20px;
    border-right: 1px dashed var(--muted);
  }
  .intro p {
    color: var(--muted);
    font-size: 12px;
    line-height: 1.7;
  }
  .drop-zone {
    min-width: 0;
  }
  .drop-zone.dragging {
    outline: 2px dashed var(--accent);
    outline-offset: 6px;
  }
  .preview-area {
    padding: 28px;
    min-width: 0;
  }
  .toolbar,
  .preview-toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 20px;
  }
  .toolbar {
    justify-content: space-between;
  }
  .button-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  #status {
    font-size: 11px;
    color: var(--muted);
  }
  .preview-toolbar {
    font-size: 11px;
  }
  .previews {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;
    align-items: start;
  }
  .previews[data-view='stack'],
  .previews[data-view='result'] {
    grid-template-columns: minmax(0, 1fr);
  }
  figure {
    margin: 0;
    min-width: 0;
  }
  figcaption {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 8px;
    color: var(--muted);
    font-size: 10px;
    margin-bottom: 10px;
  }
  .canvas-wrap {
    display: grid;
    place-items: center;
    min-height: 100px;
    background: repeating-conic-gradient(#ffffff05 0% 25%, transparent 0% 50%) 0 / 16px 16px;
  }
  canvas {
    display: block;
    width: 100%;
    height: auto;
    image-rendering: pixelated;
  }
  .recipe {
    color: var(--accent);
    font-size: 11px;
    line-height: 1.7;
  }
  .error {
    color: var(--danger);
    font-size: 12px;
    line-height: 1.6;
  }
  .error:empty {
    display: none;
  }
  .note {
    color: var(--muted);
    font-size: 12px;
    line-height: 1.8;
    max-width: 80ch;
    margin-top: 28px;
  }
  .note strong {
    color: var(--text);
    font-weight: 400;
  }
  .hint {
    color: var(--muted);
    font-size: 11px;
    line-height: 1.7;
  }
  @media (min-width: 1000px) {
    aside,
    .preview-area {
      max-height: calc(100dvh - 88px);
      overflow-y: auto;
    }
  }
  @media (max-width: 999px) {
    .workspace {
      grid-template-columns: 320px minmax(0, 1fr);
    }
    .previews {
      grid-template-columns: minmax(0, 1fr);
    }
    .preview-area {
      padding: 20px;
    }
  }
  @media (max-width: 760px) {
    .app-header {
      min-height: 72px;
      padding: max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) 12px
        max(12px, env(safe-area-inset-left));
      gap: 8px;
    }
    .brand {
      font-size: clamp(22px, 6vw, 32px);
      gap: 8px;
      margin-right: auto;
    }
    .workspace {
      display: flex;
      flex-direction: column;
      padding-bottom: calc(88px + env(safe-area-inset-bottom));
    }
    aside {
      border-right: none;
      padding: 20px 16px;
    }
    .preview-area {
      padding: 16px 12px;
    }
    .note {
      display: none;
    }
    .preview-toolbar {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 8px;
    }
    .previews[data-view='side'] {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .previews[data-view='result'] canvas {
      max-height: 55dvh;
      object-fit: contain;
    }
    .toolbar {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }
    .recipe {
      overflow-wrap: anywhere;
    }
  }
</style>
