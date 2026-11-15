<script lang="ts">
  import { type Snippet, tick } from 'svelte';
  import { Button, Checkbox, Drawer, Field, IconButton, Select } from 'svelte-ascii-ui';

  import type { Settings } from '@/shared/lib/renderer';

  import type { EditorModel } from '../model/editor.svelte';
  import {
    mobileParameterLabels,
    mobileStyleRanges,
    type ToolSection,
  } from '../model/mode-presentation';
  import { ranges } from '../model/settings';
  import Controls from './Controls.svelte';
  import ControlStrip from './ControlStrip.svelte';
  import PaletteImport from './PaletteImport.svelte';
  import ParameterRange from './ParameterRange.svelte';

  type Detail = NonNullable<App.PageState['hasciiEditor']>['detail'];
  type Parameter = keyof typeof ranges;
  let {
    editor,
    open,
    section,
    detail,
    upload,
    ondetails,
    onedit,
    onback,
    onclose,
  }: {
    editor: EditorModel;
    open: boolean;
    section: ToolSection;
    detail: Detail;
    upload: Snippet;
    ondetails: (detail: NonNullable<Detail>) => void;
    onedit: (key: Parameter) => void;
    onback: () => void;
    onclose: () => void;
  } = $props();
  const titles: Record<ToolSection, string> = {
    photo: 'Фото',
    style: 'Стиль',
    color: 'Цвет',
    tone: 'Тон',
  };
  let selected = $state<Partial<Record<Settings['mode'], Parameter>>>({});
  let paletteUrl = $state('');
  let detailScroller: HTMLDivElement;
  let returnScroll = 0;
  let styleDetailsOpen = $state(false);
  const parameters = $derived(mobileStyleRanges(editor.settings));
  const active = $derived(
    parameters.includes(selected[editor.settings.mode]!)
      ? selected[editor.settings.mode]!
      : parameters[0],
  );
  const fullScreen = $derived(
    open && (section === 'photo' || detail === 'style' || detail === 'import'),
  );
  const detailTitle = $derived(
    section === 'photo' ? 'Фото' : detail === 'import' ? 'Импорт палитры' : 'Подробности стиля',
  );

  function chooseParameter(key: Parameter) {
    selected[editor.settings.mode] = key;
  }
  function editFromDetails(key: Parameter) {
    returnScroll = detailScroller?.scrollTop ?? 0;
    chooseParameter(key);
    onedit(key);
  }
  $effect(() => {
    if (fullScreen && detail === 'style')
      void tick().then(() => {
        if (detailScroller) detailScroller.scrollTop = returnScroll;
      });
  });
</script>

{#if open && section !== 'photo' && (!fullScreen || detail === 'import')}
  <section class="mobile-panel" aria-label={`Инструменты: ${titles[section]}`}>
    <header class="panel-heading">
      <h2>{titles[section]}</h2>
      {#if section === 'tone'}
        <Checkbox
          id="correction"
          size="s"
          label="Коррекция изображения"
          bind:checked={
            () => editor.settings.correction, (value) => editor.update('correction', value)
          }
        />
      {/if}
      <IconButton
        size="s"
        icon="close"
        label="Показать результат"
        style="min-height: 44px; min-width: 44px"
        onclick={onclose}
      />
    </header>
    <div class="panel-body aui-scrollbar">
      {#if section === 'tone'}
        {#if editor.settings.correction}
          {#each ['brightness', 'contrast', 'saturation'] as setting (setting)}
            <ParameterRange {editor} setting={setting as Parameter} dense />
          {/each}
        {/if}
      {:else if section === 'style'}
        {#if editor.settings.mode === 'pixels'}
          <Checkbox
            id="pixelate"
            size="s"
            label="Пикселизация"
            bind:checked={
              () => editor.settings.pixelate, (value) => editor.update('pixelate', value)
            }
          />
        {:else if editor.settings.mode === 'png2xp'}
          <Checkbox
            id="blockShading"
            size="s"
            label="Штриховка ░ ▒"
            bind:checked={
              () => editor.settings.blockShading, (value) => editor.update('blockShading', value)
            }
          />
        {/if}
        {#if parameters.length > 3}
          <ControlStrip
            items={parameters.map((value) => ({
              value,
              label: mobileParameterLabels[value] ?? ranges[value].label,
            }))}
            value={active}
            onchange={(key) => chooseParameter(key as Parameter)}
            horizontal
            label="Параметр стиля"
            attribute="parameter"
            previousLabel="Предыдущие параметры"
            nextLabel="Следующие параметры"
          />
          <ParameterRange {editor} setting={active} dense />
        {:else}
          {#each parameters as setting (setting)}<ParameterRange {editor} {setting} dense />{/each}
        {/if}
        {#if editor.settings.mode === 'halftone'}
          <Field id="halftoneShape" label="Форма растра">
            {#snippet children(control)}
              <Select
                {...control}
                size="s"
                showPlaceholder={false}
                options={[
                  { value: 'round', label: 'Круглые точки' },
                  { value: 'diamond', label: 'Ромбы' },
                  { value: 'line', label: 'Линии' },
                ]}
                bind:value={
                  () => editor.settings.halftoneShape,
                  (value) => {
                    if (value) editor.update('halftoneShape', value as Settings['halftoneShape']);
                  }
                }
              />
            {/snippet}
          </Field>
        {/if}
        <Button size="s" data-open-details="style" onclick={() => ondetails('style')}>
          {['ascii', 'overlay', 'ascii-fx'].includes(editor.settings.mode)
            ? 'Символы, фон и пресеты…'
            : 'Режим, пресеты и подробности…'}
        </Button>
      {:else if section === 'color'}
        <Controls
          {editor}
          section="color"
          mobile
          onimport={() => ondetails('import')}
          paletteOpen={detail === 'palette'}
          onpaletteopen={(value) => {
            if (value) ondetails('palette');
            else onback();
          }}
        />
      {/if}
    </div>
  </section>
{/if}

<Drawer
  side="bottom"
  class="hascii-mobile-settings"
  data-mobile-settings
  title={detailTitle}
  closeLabel={section === 'photo' ? 'Закрыть фото' : 'Закрыть подробности'}
  bind:open={
    () => fullScreen,
    (value) => {
      // Dialog also reports its programmatic close after history already returned.
      if (!value && fullScreen) onback();
    }
  }
  style="width: 100%; max-width: 100%; height: 100dvh; padding-top: env(safe-area-inset-top); padding-left: env(safe-area-inset-left); padding-right: env(safe-area-inset-right);"
>
  <div
    class="detail-body aui-scrollbar"
    bind:this={detailScroller}
    onscroll={(event) => {
      if (fullScreen && detail === 'style') returnScroll = event.currentTarget.scrollTop;
    }}
  >
    {#if section === 'photo'}
      <Controls {editor} section="photo" mobile {upload} />
    {:else if detail === 'style'}
      <Controls
        {editor}
        section="style"
        mobile
        onedit={editFromDetails}
        bind:detailsOpen={styleDetailsOpen}
      />
    {:else if detail === 'import'}
      <PaletteImport {editor} bind:value={paletteUrl} />
    {/if}
    {#if editor.error}<p class="error" role="alert">{editor.error}</p>{/if}
    {#if editor.storageWarning}<p class="error" role="status">{editor.storageWarning}</p>{/if}
  </div>
  {#snippet footer()}
    <div class="detail-footer">
      {#if detail !== 'import'}
        <p class="detail-status" role="status">{editor.canExport ? 'Готово' : editor.status}</p>
      {/if}
      <Button fullWidth size="m" style="min-height: 48px" onclick={onback}>
        {section === 'photo' ? 'Показать результат' : 'Назад к настройкам'}
      </Button>
    </div>
  {/snippet}
</Drawer>

<style>
  :global(.hascii-mobile-settings[open]) {
    animation: settings-enter 180ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  @keyframes settings-enter {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    :global(.hascii-mobile-settings[open]) {
      animation: none;
    }
  }
  .mobile-panel {
    min-width: 0;
    flex: 0 1 auto;
    max-height: min(48dvh, 390px);
    display: flex;
    flex-direction: column;
    background: var(--bg);
    border-top: 1px dashed var(--muted);
    padding: 0 max(10px, env(safe-area-inset-right)) 4px max(10px, env(safe-area-inset-left));
  }
  .panel-heading {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 0 0 auto;
    min-height: 44px;
    padding-block: 10px;
  }
  h2 {
    font-size: 13px;
    font-weight: 400;
    margin: 0 auto 0 0;
  }
  .panel-body {
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 4px;
    overflow: auto;
    overscroll-behavior: contain;
    padding: 0 2px 2px;
  }
  .detail-body {
    height: 100%;
    min-width: 0;
    display: grid;
    align-content: start;
    gap: 16px;
    overflow: auto;
    overscroll-behavior: contain;
    padding-block: 8px;
  }
  .detail-footer {
    width: 100%;
    padding-bottom: env(safe-area-inset-bottom);
  }
  .detail-status {
    margin: 0 0 8px;
    color: var(--muted);
    font-size: 11px;
    line-height: 1.6;
  }
  .error {
    color: var(--danger);
    font-size: 12px;
    line-height: 1.6;
    overflow-wrap: anywhere;
  }
  @media (max-width: 1000px) and (max-height: 500px) and (orientation: landscape) {
    .mobile-panel {
      max-height: none;
      flex: 0 0 min(40%, 360px);
      border-top: none;
      border-left: 1px dashed var(--muted);
      padding-top: 4px;
    }
    .panel-heading {
      flex-wrap: wrap;
    }
  }
</style>
