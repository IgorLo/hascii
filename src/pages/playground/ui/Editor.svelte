<script lang="ts">
  import { onDestroy, onMount, tick, untrack } from 'svelte';
  import { MediaQuery } from 'svelte/reactivity';
  import { Button, FileInput, Link, Select } from 'svelte-ascii-ui';

  import { selectMode } from '@/shared/lib/renderer';
  import { asset, resolve } from '$app/paths';

  import { EditorModel } from '../model/editor.svelte';
  import { MobileNavigation } from '../model/mobile-navigation.svelte';
  import { modePresentation } from '../model/mode-presentation';
  import Controls from './Controls.svelte';
  import { animateMobileLayout, captureMobileLayout } from './mobile-motion';
  import MobileTools from './MobileTools.svelte';
  import ModePicker from './ModePicker.svelte';

  const editor = new EditorModel();
  const navigation = new MobileNavigation();
  let original: HTMLCanvasElement;
  let result: HTMLCanvasElement;
  const mobile = new MediaQuery(
    '(max-width: 760px), (max-width: 1000px) and (max-height: 500px) and (pointer: coarse)',
    false,
  );
  const reducedMotion = new MediaQuery('(prefers-reduced-motion: reduce)', false);
  let shell: HTMLDivElement;
  let presentedTool = $state<App.PageState['hasciiEditor']>();
  let initialPresentation = true;
  let stopMotion: (() => void) | undefined;
  let motionRevision = 0;
  function cancelMotion() {
    motionRevision++;
    stopMotion?.();
    stopMotion = undefined;
  }
  onDestroy(cancelMotion);
  $effect(() => {
    const next = navigation.view;
    const allowMotion = mobile.current && !reducedMotion.current;
    let cancelled = false;
    untrack(() => {
      const previous = presentedTool;
      const fullScreen = [previous, next].some(
        (tool) =>
          tool?.section === 'photo' || tool?.detail === 'style' || tool?.detail === 'import',
      );
      const animate =
        !initialPresentation &&
        allowMotion &&
        !fullScreen &&
        previous?.section !== next?.section &&
        typeof Element.prototype.animate === 'function';
      const before = animate ? captureMobileLayout(shell, !next) : undefined;
      cancelMotion();
      const revision = motionRevision;
      presentedTool = next;
      if (before)
        void tick().then(() => {
          if (!cancelled && revision === motionRevision)
            stopMotion = animateMobileLayout(shell, before);
        });
      initialPresentation = false;
    });
    return () => {
      cancelled = true;
    };
  });
  let selectedView = $state<string | null>(null);
  const adjusting = $derived(mobile.current && presentedTool !== undefined);
  const view = $derived(
    adjusting ? 'result' : (selectedView ?? (mobile.current ? 'result' : 'side')),
  );
  const sections = $derived(modePresentation(selectMode(editor.settings)).sections);
  let dragging = $state(false);
  const views = [
    { value: 'side', label: 'Рядом' },
    { value: 'stack', label: 'Сверху вниз' },
    { value: 'result', label: 'Только результат' },
  ];
  onMount(() => editor.mount(original, result));

  let previousView: App.PageState['hasciiEditor'];
  let focusParameter: string | undefined;
  $effect(() => {
    const current = presentedTool;
    const previous = previousView;
    previousView = current;
    let target: string | undefined;
    if (previous && !current) target = `[data-tool="${previous.section}"]`;
    else if (previous?.detail && current && !current.detail) {
      target = focusParameter
        ? `#${focusParameter}`
        : previous.detail === 'palette'
          ? '#palette'
          : `[data-open-details="${previous.detail}"]`;
      focusParameter = undefined;
    } else if (
      current &&
      !current.detail &&
      current.section !== 'photo' &&
      previous?.section !== current.section
    )
      target = '.mobile-panel input:not(:disabled), .mobile-panel button:not(:disabled)';
    if (target)
      void tick().then(() =>
        document.querySelector<HTMLElement>(target)?.focus({ preventScroll: true }),
      );
  });
  $effect(() => {
    if (!mobile.current && navigation.view) navigation.leaveMobile();
  });
  $effect(() => {
    const current = navigation.view;
    if (!current?.detail) return;
    const available =
      current.detail === 'style'
        ? current.section === 'style'
        : current.section === 'color' &&
          editor.settings.paletteEnabled &&
          !['pixel-art', 'halftone'].includes(editor.settings.mode);
    // Forward can restore a detail whose owning control is now unavailable.
    if (!available) navigation.back();
  });
  function handleKeydown(event: KeyboardEvent) {
    if (
      event.key === 'Escape' &&
      !event.defaultPrevented &&
      adjusting &&
      !navigation.view?.detail &&
      navigation.view?.section !== 'photo'
    ) {
      event.preventDefault();
      navigation.back();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} onresize={cancelMotion} />

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

<div id="editor-shell" bind:this={shell} class={['editor-shell', { adjusting }]}>
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
        <div class="intro"><p>Пиксели, символы и немного контролируемого шума.</p></div>
        <Controls {editor} {upload} />
        <footer class="hint">
          Изображение остаётся на устройстве.<br />Только импорт палитры обращается к Lospec.
        </footer>
      </aside>
    {/if}

    <article class="preview-area aui-scrollbar" aria-label="Превью изображения">
      {#if mobile.current && !adjusting}
        <div class="mode-toolbar">
          <ModePicker
            value={editor.settings.mode}
            onchange={(mode) => editor.update('mode', mode)}
          />
        </div>
      {/if}
      <div id="previews" class="previews" data-view={view} aria-busy={!editor.canExport}>
        <figure class="original-figure" hidden={view === 'result'}>
          <figcaption>
            <span>Оригинал</span><span id="sourceInfo">{editor.sourceInfo}</span>
          </figcaption>
          <div class="canvas-wrap">
            <div class="preview-frame" aria-hidden="true"></div>
            <canvas id="original" bind:this={original} aria-label="Исходное изображение"></canvas>
          </div>
        </figure>
        <figure class="result-figure">
          <figcaption>
            <span>Результат</span><span id="outputInfo">{editor.outputInfo}</span>
          </figcaption>
          <div class="canvas-wrap">
            <div class="preview-frame" aria-hidden="true"></div>
            <canvas
              id="result"
              bind:this={result}
              style:--result-aspect={editor.resultAspect}
              aria-label="Обработанное изображение"
            ></canvas>
          </div>
        </figure>
      </div>
      <div class="result-summary">
        <p id="recipe" class={['recipe', { 'ready-status': adjusting }]}>{editor.recipe}</p>
        {#if adjusting}<p class="compact-recipe">{editor.compactRecipe}</p>{/if}
        <div class="status-lane">
          {#if editor.canExport && editor.renderMs !== null}<span class="render-time"
              >{editor.renderMs} мс</span
            >{/if}
          <span id="status" class={{ 'ready-status': editor.canExport }} role="status"
            >{editor.canExport ? 'Готово' : editor.status}</span
          >
        </div>
      </div>
      <p id="error" class="error" role="alert">{editor.error}</p>
      {#if editor.storageWarning}<p class="error" role="status">{editor.storageWarning}</p>{/if}
      <div class="preview-toolbar" hidden={adjusting}>
        {#if mobile.current}
          <Select
            showPlaceholder={false}
            size="s"
            aria-label="Расположение превью"
            options={views}
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
      <div class="note" hidden={adjusting}>
        <strong>Своя текстура, один шаг за раз.</strong>
        <p>
          Начни с пресета, выбери палитру, затем переключись на символы. «По форме» старается
          сохранить линии и границы; «По яркости» даёт более ровную текстовую фактуру.
        </p>
        <p>
          Пример с хаски сгенерирован. Можно загрузить свою фотографию. Сглаживание букв добавляет
          промежуточные оттенки даже при ограниченной палитре.
        </p>
      </div>
    </article>

    {#if mobile.current}
      <MobileTools
        {editor}
        open={adjusting}
        section={presentedTool?.section ?? 'style'}
        detail={presentedTool?.detail}
        {upload}
        ondetails={(detail) => navigation.details(detail)}
        onedit={(key) => {
          focusParameter = key;
          navigation.back();
        }}
        onback={() => navigation.back()}
        onclose={() => navigation.back()}
      />
    {/if}
  </main>

  {#if mobile.current}
    <nav class="mobile-tools" aria-label="Инструменты изображения">
      {#each sections as item (item.id)}
        <Button
          size="s"
          fullWidth
          style="min-height: 48px"
          data-tool={item.id}
          aria-pressed={presentedTool?.section === item.id}
          variant={presentedTool?.section === item.id ? 'primary' : 'default'}
          onclick={() => navigation.toggle(item.id)}>{item.label}</Button
        >
      {/each}
    </nav>
  {/if}
</div>

<style>
  .editor-shell {
    min-height: 100dvh;
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
  .mode-toolbar {
    margin-bottom: 10px;
  }
  .preview-toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 16px;
    font-size: 11px;
  }
  .preview-toolbar[hidden] {
    display: none;
  }
  .button-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
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
    font-size: 11px;
    margin-bottom: 6px;
  }
  .canvas-wrap {
    position: relative;
    display: grid;
    place-items: center;
    min-height: 100px;
    padding: 1px;
  }
  .preview-frame {
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    border: 1px dashed var(--muted);
    background: repeating-conic-gradient(#ffffff05 0% 25%, transparent 0% 50%) 0 / 16px 16px;
  }
  canvas {
    position: relative;
    z-index: 1;
    display: block;
    width: 100%;
    height: auto;
    image-rendering: pixelated;
  }
  .result-summary {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 4px 10px;
    color: var(--muted);
    font-size: 11px;
    line-height: 1.7;
    padding-top: 6px;
  }
  .recipe {
    color: var(--accent);
    font-size: 11px;
    line-height: 1.7;
    margin: 0;
    overflow-wrap: anywhere;
  }
  .status-lane {
    display: flex;
    justify-content: end;
    align-items: baseline;
    min-width: 0;
  }
  .compact-recipe {
    margin: 0;
    color: var(--muted);
    font-size: 11px;
    line-height: 1.7;
  }
  .render-time {
    color: var(--muted);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  #status {
    font-size: 11px;
    color: var(--muted);
  }
  .ready-status {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  .error {
    color: var(--danger);
    font-size: 12px;
    line-height: 1.6;
    overflow-wrap: anywhere;
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
  .mobile-tools {
    position: fixed;
    inset-inline: 0;
    bottom: 0;
    z-index: 10;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 4px;
    padding: 4px max(8px, env(safe-area-inset-right)) calc(4px + env(safe-area-inset-bottom))
      max(8px, env(safe-area-inset-left));
    background: color-mix(in srgb, var(--bg), var(--text) 4%);
    border-top: 1px dashed var(--muted);
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
  @media (max-width: 760px), (max-width: 1000px) and (max-height: 500px) and (pointer: coarse) {
    .app-header {
      min-height: 64px;
      padding: max(8px, env(safe-area-inset-top)) max(10px, env(safe-area-inset-right)) 8px
        max(10px, env(safe-area-inset-left));
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
      padding-bottom: calc(64px + env(safe-area-inset-bottom));
    }
    aside {
      border-right: none;
      padding: 20px 16px;
    }
    .preview-area {
      padding: 10px;
    }
    .note {
      display: none;
    }
    .preview-toolbar {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 8px;
      margin-top: 10px;
    }
    .previews[data-view='side'] {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .previews[data-view='result'] canvas {
      width: min(100%, calc(58dvh * var(--result-aspect, 1)));
      max-height: 58dvh;
      object-fit: contain;
    }
    .editor-shell.adjusting {
      height: 100dvh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .adjusting .app-header {
      flex: 0 0 auto;
      min-height: 56px;
      padding-block: 4px;
    }
    .adjusting .workspace {
      flex: 1;
      min-height: 0;
      padding-bottom: 0;
    }
    .adjusting .preview-area {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      padding-block: 4px;
    }
    .adjusting .previews {
      flex: 1;
      min-height: 0;
      display: flex;
      align-items: stretch;
    }
    .adjusting figure:not([hidden]) {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }
    .adjusting .canvas-wrap {
      container-type: size;
      position: relative;
      flex: 1;
      min-height: 0;
      width: 100%;
      overflow: hidden;
    }
    .adjusting .previews[data-view='result'] canvas {
      position: absolute;
      inset: 0;
      margin: auto;
      width: min(100cqw, calc(100cqh * var(--result-aspect)));
      height: auto;
      min-height: 0;
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    .adjusting .result-summary {
      flex: 0 0 auto;
      display: grid;
      grid-template-columns: minmax(0, 1fr) 14ch;
      align-items: baseline;
      min-height: 23px;
      padding-top: 4px;
    }
    .adjusting .mobile-tools {
      position: static;
      flex: 0 0 auto;
    }
    .adjusting figcaption {
      margin-bottom: 4px;
    }
  }
  @media (max-width: 1000px) and (max-height: 500px) and (orientation: landscape) {
    .adjusting .workspace {
      flex-direction: row;
    }
    .adjusting .app-header {
      min-height: 52px;
      padding-block: 4px;
    }
    .adjusting figcaption {
      margin-bottom: 4px;
    }
    .adjusting .recipe {
      font-size: 10px;
      line-height: 1.5;
    }
  }
</style>
