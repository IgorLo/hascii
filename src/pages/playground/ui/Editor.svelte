<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, FileInput, Link, Panel } from 'svelte-ascii-ui';

  import type { Settings } from '@/shared/lib/renderer';
  import { resolve } from '$app/paths';

  import { EditorModel } from '../model/editor.svelte';
  import Controls from './Controls.svelte';

  const editor = new EditorModel();
  let original: HTMLCanvasElement;
  let result: HTMLCanvasElement;
  let view = $state('side');
  let dragging = $state(false);
  const modes: { value: Settings['mode']; label: string }[] = [
    { value: 'pixels', label: 'Пиксели' },
    { value: 'ascii', label: 'ASCII' },
    { value: 'overlay', label: 'Фон + ASCII' },
  ];
  const views = [
    { value: 'side', label: 'Рядом' },
    { value: 'stack', label: 'Сверху вниз' },
    { value: 'result', label: 'Только результат' },
  ];
  onMount(() => editor.mount(original, result));
</script>

<svelte:head>
  <title>hascii — image playground</title>
  <meta
    name="description"
    content="Локальный редактор пикселей и ASCII: палитры, дизеринг и символы. Изображения остаются на устройстве."
  />
</svelte:head>

<header class="app-header">
  <span class="brand"
    ><Link href={resolve('/')} aria-label="hascii — главная"
      ><span aria-hidden="true">&gt;_</span>hascii</Link
    ></span
  >
  <span class="tag">LOCAL IMAGE PLAYGROUND</span>
  <Button
    id="export"
    size="s"
    variant="primary"
    disabled={!editor.canExport}
    onclick={() => editor.exportPng()}>Сохранить PNG</Button
  >
</header>

<main class="workspace">
  <aside aria-label="Настройки изображения">
    <div class="intro">
      <span class="eyebrow">// ИЗОБРАЖЕНИЕ → ФАКТУРА</span>
      <h1>Меньше цветов.<br />Больше характера.</h1>
      <p>Пиксели, символы и немного контролируемого шума.</p>
    </div>
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
        accept="image/*"
        aria-label="Загрузить изображение"
        chooseLabel="[+] Загрузить изображение"
        emptyText="PNG, JPG, WebP"
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
    <Controls {editor} />
    <footer class="hint">
      Изображение остаётся на устройстве.<br />Только импорт палитры обращается к Lospec.
    </footer>
  </aside>

  <article class="preview-area" aria-label="Превью изображения">
    <div class="toolbar">
      <div class="button-row" role="group" aria-label="Режим отрисовки">
        {#each modes as mode (mode.value)}
          <Button
            size="s"
            data-mode={mode.value}
            aria-pressed={editor.settings.mode === mode.value}
            variant={editor.settings.mode === mode.value ? 'primary' : 'default'}
            onclick={() => editor.update('mode', mode.value)}>{mode.label}</Button
          >
        {/each}
      </div>
      <span id="status" role="status">{editor.status}</span>
    </div>
    <div class="preview-toolbar">
      <span>Превью</span>
      <div class="button-row" role="group" aria-label="Расположение превью">
        {#each views as item (item.value)}
          <Button
            size="s"
            data-view={item.value}
            aria-pressed={view === item.value}
            variant={view === item.value ? 'primary' : 'default'}
            onclick={() => (view = item.value)}>{item.label}</Button
          >
        {/each}
      </div>
      <small class="hint">Расположение не влияет на PNG</small>
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
        Пример уже обработан: он показывает фактуру, но для экспериментов лучше загрузить обычную
        фотографию. Размытие и сглаживание букв добавляют промежуточные оттенки даже при
        ограниченной палитре.
      </p>
    </div>
  </article>
</main>

<style>
  .app-header {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
    padding: 18px 28px;
    border-bottom: 1px dashed var(--muted);
  }
  .brand {
    color: var(--text);
    font-size: 24px;
    text-decoration: none;
  }
  .brand span {
    color: var(--accent);
    margin-right: 0.4ch;
  }
  .tag {
    color: var(--muted);
    font-size: 10px;
    letter-spacing: 1px;
    flex: 1;
  }
  .workspace {
    display: grid;
    grid-template-columns: 360px minmax(0, 1fr);
  }
  aside {
    display: grid;
    align-content: start;
    gap: 18px;
    padding: 28px 20px;
    border-right: 1px dashed var(--muted);
  }
  .eyebrow {
    color: var(--accent);
    font-size: 10px;
  }
  h1 {
    font-size: 24px;
    line-height: 1.25;
    letter-spacing: -1px;
    font-weight: 400;
    margin: 16px 0;
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
      max-height: calc(100dvh - 81px);
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
  @media (max-width: 700px) {
    .app-header {
      padding: 16px;
      gap: 12px;
    }
    .tag {
      display: none;
    }
    .brand {
      margin-right: auto;
    }
    .workspace {
      display: flex;
      flex-direction: column;
    }
    aside {
      border-right: none;
      padding: 20px 16px;
    }
    .preview-area {
      padding: 20px 16px;
    }
  }
</style>
