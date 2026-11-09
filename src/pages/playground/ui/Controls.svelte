<script lang="ts">
  import {
    Button,
    Checkbox,
    Field,
    Input,
    Link,
    Panel,
    Select,
    Slider,
    Textarea,
  } from 'svelte-ascii-ui';

  import type { Settings } from '@/shared/lib/renderer';

  import type { EditorModel } from '../model/editor.svelte';
  import { baseline, characterSets, presets, ranges } from '../model/settings';

  let { editor }: { editor: EditorModel } = $props();
  let paletteUrl = $state('');
  const palette = $derived(editor.palettes.find((p) => p.id === editor.settings.palette)!);
  const charCount = $derived(new Set(Array.from(editor.settings.chars)).size);
  type StringSetting = {
    [K in keyof Settings]: Settings[K] extends string ? K : never;
  }[keyof Settings];
</script>

{#snippet range(key: keyof typeof ranges, disabled = false)}
  {@const config = ranges[key]}
  <Field id={key} label={`${config.label} · ${editor.settings[key]}`}>
    {#snippet children(control)}
      <Slider
        {...control}
        size="s"
        min={config.min}
        max={config.max}
        step={config.step}
        {disabled}
        bind:value={() => editor.settings[key], (value) => editor.update(key, value)}
      />
    {/snippet}
  </Field>
{/snippet}

{#snippet select(
  key: StringSetting,
  label: string,
  options: { value: string; label: string }[],
  disabled = false,
)}
  <Field id={key} {label}>
    {#snippet children(control)}
      <Select
        {...control}
        size="s"
        {options}
        {disabled}
        bind:value={
          () => editor.settings[key],
          (value) => {
            if (value) editor.update(key, value as Settings[typeof key]);
          }
        }
      />
    {/snippet}
  </Field>
{/snippet}

<Panel title="01 / Отправная точка" size="s">
  <div class="button-grid">
    {#each presets as preset (preset.value)}
      <Button size="s" data-preset={preset.value} onclick={() => editor.preset(preset.value)}
        >{preset.label}</Button
      >
    {/each}
  </div>
</Panel>

<Panel title="02 / Холст и тон" size="s">
  <div class="control-stack">
    <Field
      id="resolution"
      label="Рабочее разрешение"
      hint="По длинной стороне, без увеличения оригинала. PNG сохраняется в этом размере."
    >
      {#snippet children(control)}
        <Select
          {...control}
          size="s"
          options={[600, 900, 1200, 1600].map((value) => ({
            value: String(value),
            label: `${value} px`,
          }))}
          bind:value={
            () => String(editor.settings.resolution),
            (value) => {
              if (value) editor.update('resolution', Number(value));
            }
          }
        />
      {/snippet}
    </Field>
    <Checkbox
      id="correction"
      size="s"
      label="Коррекция изображения"
      bind:checked={() => editor.settings.correction, (value) => editor.update('correction', value)}
    />
    {@render range('brightness', !editor.settings.correction)}
    {@render range('contrast', !editor.settings.correction)}
    {@render range('saturation', !editor.settings.correction)}
    <Checkbox
      id="pixelate"
      size="s"
      label="Пикселизация фона / пиксельного режима"
      disabled={editor.settings.mode === 'ascii'}
      bind:checked={() => editor.settings.pixelate, (value) => editor.update('pixelate', value)}
    />
    {@render range('pixelSize', !editor.settings.pixelate || editor.settings.mode === 'ascii')}
    <p class="hint">
      {editor.settings.mode === 'ascii'
        ? 'В ASCII размер ячейки задаётся размером символа и интервалами ниже. Пикселизация здесь не применяется.'
        : 'Размер пикселя меняет цветные блоки фона. ASCII имеет отдельную сетку.'}
    </p>
  </div>
</Panel>

<Panel title="03 / Цвет и дизеринг" size="s">
  <div class="control-stack">
    <Checkbox
      id="paletteEnabled"
      size="s"
      label="Ограничить палитру"
      bind:checked={
        () => editor.settings.paletteEnabled, (value) => editor.update('paletteEnabled', value)
      }
    />
    {@render select(
      'palette',
      'Палитра',
      editor.palettes.map((p) => ({ value: p.id, label: p.name })),
    )}
    <div id="swatches" class="swatches" aria-label={`Цвета палитры ${palette.name}`}>
      {#each palette.colors as color, i (`${i}-${color}`)}<span
          style:--swatch={`#${color}`}
          title={`#${color}`}>█</span
        >{/each}
    </div>
    <p class="hint">
      {palette.colors.length} цветов · {palette.author}
      {#if palette.url}<Link href={palette.url} target="_blank" rel="noopener noreferrer"
          >Lospec ↗</Link
        >{/if}
    </p>
    <form
      class="import-form"
      onsubmit={(event) => {
        event.preventDefault();
        void editor.importPalette(paletteUrl);
      }}
    >
      <Field id="paletteUrl" label="Ссылка или имя палитры Lospec">
        {#snippet children(control)}<Input
            {...control}
            size="s"
            bind:value={paletteUrl}
            placeholder="Lospec: ссылка или sweetie-16"
          />{/snippet}
      </Field>
      <Button id="import" type="submit" size="s" loading={editor.importing}
        >Импортировать палитру</Button
      >
    </form>
    <p id="importStatus" class="hint" role="status">{editor.importStatus}</p>
    {@render select(
      'dither',
      'Дизеринг',
      [
        { value: 'none', label: 'Выключен' },
        { value: 'bayer', label: 'Bayer · регулярный 4×4' },
        { value: 'floyd', label: 'Floyd–Steinberg · зерно' },
        { value: 'atkinson', label: 'Atkinson · разреженный' },
      ],
      !editor.settings.paletteEnabled,
    )}
    {@render range(
      'strength',
      !editor.settings.paletteEnabled || editor.settings.dither === 'none',
    )}
  </div>
</Panel>

<Panel title="04 / Символы" size="s">
  <div class="control-stack">
    <p class="hint">Настройки применяются в режимах ASCII и «Фон + ASCII».</p>
    {@render select('matching', 'Подбор', [
      { value: 'tone', label: 'По яркости' },
      { value: 'shape', label: 'По яркости и форме' },
    ])}
    {@render range('shapeWeight', editor.settings.matching !== 'shape')}
    {@render select('font', 'Шрифт', [
      { value: 'Consolas, monospace', label: 'Consolas' },
      { value: "'Courier New', monospace", label: 'Courier New' },
      { value: "'Lucida Console', monospace", label: 'Lucida Console' },
    ])}
    {@render range('fontSize')}{@render range('gapX')}{@render range('gapY')}
    <span>Добавить набор</span>
    <div class="button-grid">
      {#each Object.entries(characterSets) as [name, chars] (name)}
        <Button
          size="s"
          onclick={() =>
            editor.update(
              'chars',
              Array.from(new Set(Array.from(editor.settings.chars + chars))).join(''),
            )}>{name}</Button
        >
      {/each}
    </div>
    <Checkbox
      id="allowEmpty"
      size="s"
      label="Разрешать пустые ячейки"
      bind:checked={() => editor.settings.allowEmpty, (value) => editor.update('allowEmpty', value)}
    />
    {@render range('emptyThreshold', !editor.settings.allowEmpty)}
    <p class="hint">
      Чем выше порог, тем больше ровных участков заменяется сплошными цветными ячейками без
      символов. Цвет берётся из палитры, а если она выключена — из изображения. 0 — без заливки,
      пробел только участвует в подборе. Снятая галочка отключает заливку и исключает пустые знаки.
    </p>
    <Field
      id="chars"
      label={`Твой набор символов (${charCount})`}
      hint="До 512 уникальных символов. Отображение Unicode зависит от шрифта; цветные emoji не рассчитаны на точное сопоставление."
    >
      {#snippet children(control)}<Textarea
          {...control}
          size="s"
          rows={4}
          spellcheck={false}
          bind:value={() => editor.settings.chars, (value) => editor.update('chars', value)}
        />{/snippet}
    </Field>
    <div class="button-row">
      <Button id="clearChars" size="s" onclick={() => editor.update('chars', '')}>Очистить</Button>
      <Button id="oneChar" size="s" onclick={() => editor.update('chars', '+')}>Только +</Button>
      <Button id="defaultChars" size="s" onclick={() => editor.update('chars', baseline)}
        >Базовый набор</Button
      >
    </div>
    {@render select('background', 'Однотонный фон', [
      { value: '#0c061b', label: 'Чернильный' },
      { value: '#000000', label: 'Чёрный' },
      { value: '#ffffff', label: 'Белый' },
      { value: '#eee9de', label: 'Бумага' },
    ])}
    {@render range('blur', editor.settings.mode !== 'overlay')}
    {@render range('backgroundOpacity', editor.settings.mode !== 'overlay')}
    {@render range('opacity')}
  </div>
</Panel>

<style>
  .control-stack,
  .import-form {
    display: grid;
    gap: 10px;
  }
  .button-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .button-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .hint {
    color: var(--muted);
    font-size: 11px;
    line-height: 1.65;
    margin: 0;
    overflow-wrap: anywhere;
  }
  .swatches {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    max-height: 180px;
    overflow: auto;
  }
  .swatches span {
    color: var(--swatch);
    font-size: 24px;
    line-height: 1;
  }
</style>
