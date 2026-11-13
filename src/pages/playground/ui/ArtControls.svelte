<script lang="ts">
  import { Field, Select } from 'svelte-ascii-ui';

  import type { Settings } from '@/shared/lib/renderer';

  import type { EditorModel } from '../model/editor.svelte';
  import type { ranges } from '../model/settings';
  import ParameterRange from './ParameterRange.svelte';

  let {
    editor,
    section,
    mobile = false,
    onedit,
  }: {
    editor: EditorModel;
    section: 'style' | 'color';
    mobile?: boolean;
    onedit?: (key: keyof typeof ranges) => void;
  } = $props();
  type ColorKey = 'halftoneInk' | 'halftoneInkB' | 'halftonePaper';
</script>

{#snippet range(setting: keyof typeof ranges)}
  <ParameterRange {editor} {setting} compact={mobile} {onedit} />
{/snippet}

{#snippet ink(key: ColorKey, label: string)}
  <Field id={key} label={`${label} · ${editor.settings[key]}`}>
    {#snippet children(control)}
      <input
        {...control}
        class="ink-picker"
        type="color"
        bind:value={() => editor.settings[key], (value) => editor.update(key, value)}
      />
    {/snippet}
  </Field>
{/snippet}

<div class="art-controls">
  {#if editor.settings.mode === 'halftone'}
    {#if section === 'style'}
      {@render range('halftoneSize')}
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
      <details data-details="style">
        <summary>Углы и совмещение</summary>
        <div class="details-content">
          {@render range('halftoneAngle')}
          {#if editor.settings.halftoneColor === 'duotone'}
            {@render range('halftoneAngleB')}
            {@render range('halftoneOffsetX')}
            {@render range('halftoneOffsetY')}
            <p>Сдвиг перемещает весь второй слой. На пересечениях краски смешиваются.</p>
          {/if}
        </div>
      </details>
    {:else}
      <Field id="halftoneColor" label="Краски">
        {#snippet children(control)}
          <Select
            {...control}
            size="s"
            showPlaceholder={false}
            options={[
              { value: 'mono', label: 'Монохром · одна краска' },
              { value: 'cmyk', label: 'Цветной · CMYK' },
              { value: 'duotone', label: 'Две краски · наложение' },
            ]}
            bind:value={
              () => editor.settings.halftoneColor,
              (value) => {
                if (value) editor.update('halftoneColor', value as Settings['halftoneColor']);
              }
            }
          />
        {/snippet}
      </Field>
      {@render ink('halftonePaper', 'Цвет бумаги')}
      {#if editor.settings.halftoneColor !== 'cmyk'}
        {@render ink('halftoneInk', 'Первая краска')}
      {/if}
      {#if editor.settings.halftoneColor === 'duotone'}
        {@render ink('halftoneInkB', 'Вторая краска')}
        {@render range('halftoneBalance')}
      {:else if editor.settings.halftoneColor === 'cmyk'}
        <p>Четыре цветных растра с разными углами. Цвета бумаги и перекрытий имитируют печать.</p>
      {:else}
        <p>
          В светах остаётся бумага, в тенях точки растут и соединяются. Контраст меняется в разделе
          «Тон».
        </p>
      {/if}
    {/if}
  {:else if editor.settings.mode === 'pixel-art'}
    {#if section === 'style'}
      {@render range('artColumns')}
      <p>Высота сохраняет пропорции фото. PNG сохраняется в рабочем размере с чёткими пикселями.</p>
      <details data-details="style">
        <summary>Уточнение деталей</summary>
        <div class="details-content">
          {@render range('artIterations')}
          <p>Детали и палитра уточняются вместе. Больше уточнений — дольше обработка.</p>
        </div>
      </details>
    {:else}
      {@render range('artColors')}
      <p>Pixel Art подбирает палитру автоматически вместе с деталями изображения.</p>
    {/if}
  {/if}
</div>

<style>
  .art-controls,
  .details-content {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    min-width: 0;
    gap: 12px;
  }
  .details-content {
    padding-block: 12px 4px;
  }
  summary {
    display: list-item;
    min-block-size: 44px;
    padding-block: 12px;
    color: var(--text);
    cursor: pointer;
    overflow-wrap: anywhere;
  }
  summary:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: 2px;
  }
  .ink-picker {
    width: 100%;
    min-height: 44px;
    padding: 4px;
    border: 1px solid var(--muted);
    background: var(--bg);
    cursor: pointer;
  }
  .ink-picker:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: 2px;
  }
  p {
    margin: 0;
    color: var(--muted);
    font-size: 11px;
    line-height: 1.65;
    overflow-wrap: anywhere;
  }
</style>
