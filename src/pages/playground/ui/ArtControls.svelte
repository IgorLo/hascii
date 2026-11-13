<script lang="ts">
  import { Field, Select, Slider } from 'svelte-ascii-ui';

  import type { Settings } from '@/shared/lib/renderer';

  import type { EditorModel } from '../model/editor.svelte';
  import { ranges } from '../model/settings';

  let { editor }: { editor: EditorModel } = $props();
  type ColorKey = 'halftoneInk' | 'halftoneInkB' | 'halftonePaper';
</script>

{#snippet range(key: keyof typeof ranges)}
  {@const config = ranges[key]}
  <Field id={key} label={`${config.label} · ${editor.settings[key]}`}>
    {#snippet children(control)}
      <Slider
        {...control}
        size="s"
        min={config.min}
        max={config.max}
        step={config.step}
        bind:value={() => editor.settings[key], (value) => editor.update(key, value)}
      />
    {/snippet}
  </Field>
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
    <Field id="halftoneColor" label="Краски">
      {#snippet children(control)}
        <Select
          {...control}
          size="s"
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
    <Field id="halftoneShape" label="Форма растра">
      {#snippet children(control)}
        <Select
          {...control}
          size="s"
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
    {@render range('halftoneSize')}
    {@render range('halftoneAngle')}
    {@render ink('halftonePaper', 'Цвет бумаги')}
    {#if editor.settings.halftoneColor !== 'cmyk'}
      {@render ink('halftoneInk', 'Первая краска')}
    {/if}
    {#if editor.settings.halftoneColor === 'duotone'}
      {@render ink('halftoneInkB', 'Вторая краска')}
      {@render range('halftoneAngleB')}
      {@render range('halftoneBalance')}
      {@render range('halftoneOffsetX')}
      {@render range('halftoneOffsetY')}
      <p>Сдвиг перемещает весь второй слой. На пересечениях краски смешиваются.</p>
    {:else if editor.settings.halftoneColor === 'cmyk'}
      <p>Четыре цветных растра с разными углами. Цвета бумаги и перекрытий имитируют печать.</p>
    {:else}
      <p>
        В светах остаётся бумага, в тенях точки растут и соединяются. Контраст меняется в разделе
        «Тон».
      </p>
    {/if}
  {:else if editor.settings.mode === 'pixel-art'}
    <p>
      Эксперимент по методу Pixelated Image Abstraction: детали и небольшая палитра уточняются
      вместе.
    </p>
    {@render range('artColumns')}
    {@render range('artColors')}
    {@render range('artIterations')}
    <p>
      Больше уточнений — дольше обработка. Палитра подбирается автоматически; высота сохраняет
      пропорции фото. PNG сохраняется в рабочем размере с чёткими пикселями.
    </p>
  {/if}
</div>

<style>
  .art-controls {
    display: grid;
    min-width: 0;
    gap: 12px;
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
