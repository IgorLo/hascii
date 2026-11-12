<script lang="ts">
  import {
    Accordion,
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

  let {
    editor,
    section = 'all',
  }: { editor: EditorModel; section?: 'all' | 'photo' | 'tone' | 'color' | 'ascii' } = $props();
  let paletteUrl = $state('');
  const palette = $derived(editor.palettes.find((p) => p.id === editor.settings.palette)!);
  const charCount = $derived(new Set(Array.from(editor.settings.chars)).size);
  const twoColor = $derived(['ascii-fx', 'png2xp'].includes(editor.settings.mode));
  const pixelGrid = $derived(['pixels', 'overlay'].includes(editor.settings.mode));
  const groups = [
    { id: 'photo', title: '01 / Отправная точка' },
    { id: 'tone', title: '02 / Холст и тон' },
    { id: 'color', title: '03 / Цвет и дизеринг' },
    { id: 'ascii', title: '04 / Символы' },
  ];
  let expanded = $state<string | string[]>(groups.map((group) => group.id));
  type StringSetting = {
    [K in keyof Settings]: Settings[K] extends string ? K : never;
  }[keyof Settings];
</script>

{#snippet range(key: keyof typeof ranges, disabled = false)}
  {@const config = ranges[key]}
  <Field
    id={key}
    label={`${key === 'backgroundOpacity' && twoColor ? 'Непрозрачность фона ячеек' : config.label} · ${editor.settings[key]}`}
  >
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

{#snippet photo()}
  <div class="button-grid">
    {#each presets as preset (preset.value)}
      <Button size="s" data-preset={preset.value} onclick={() => editor.preset(preset.value)}
        >{preset.label}</Button
      >
    {/each}
  </div>
{/snippet}

{#snippet tone()}
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
      disabled={!pixelGrid}
      bind:checked={() => editor.settings.pixelate, (value) => editor.update('pixelate', value)}
    />
    {@render range('pixelSize', !editor.settings.pixelate || !pixelGrid)}
    <p class="hint">
      {!pixelGrid
        ? 'Размер ячейки задаётся в разделе «Символы». Пикселизация фона здесь не применяется.'
        : 'Размер пикселя меняет цветные блоки фона. ASCII имеет отдельную сетку.'}
    </p>
  </div>
{/snippet}

{#snippet color()}
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
{/snippet}

{#snippet ascii()}
  <div class="control-stack">
    {#if twoColor}
      <p class="hint">
        {editor.settings.mode === 'ascii-fx'
          ? 'ASCII FX подбирает форму символа и два цвета на ячейку. Палитра применяется после подбора; на малом числе цветов часть деталей может пропасть.'
          : 'png2xp подбирает полублоки и штриховку с двумя цветами из палитры. Это адаптация алгоритма Asciicker для фотографий.'}
      </p>
      {@render range('cellSize')}{@render range('cellAspect')}
      <p class="hint">1 — квадратные ячейки, 2 — вытянутые по вертикали.</p>
    {:else}
      <p class="hint">Настройки применяются в режимах ASCII и «Фон + ASCII».</p>
    {/if}
    {#if editor.settings.mode === 'png2xp'}
      <Checkbox
        id="blockShading"
        size="s"
        label="Штриховка ░ ▒"
        bind:checked={
          () => editor.settings.blockShading, (value) => editor.update('blockShading', value)
        }
      />
      <p class="hint">
        Без штриховки остаются сплошные ячейки и полублоки ▄ ▌. Шрифт и библиотека букв в этом
        режиме не используются.
      </p>
    {:else}
      {#if !twoColor}
        {@render select('matching', 'Подбор', [
          { value: 'tone', label: 'По яркости' },
          { value: 'shape', label: 'По яркости и форме' },
        ])}
        {@render range('shapeWeight', editor.settings.matching !== 'shape')}
      {/if}
      {@render select('font', 'Шрифт', [
        { value: 'Consolas, monospace', label: 'Consolas' },
        { value: "'Courier New', monospace", label: 'Courier New' },
        { value: "'Lucida Console', monospace", label: 'Lucida Console' },
      ])}
      {#if !twoColor}{@render range('fontSize')}{/if}
      {@render range('gapX')}{@render range('gapY')}
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
        bind:checked={
          () => editor.settings.allowEmpty, (value) => editor.update('allowEmpty', value)
        }
      />
      {@render range('emptyThreshold', !editor.settings.allowEmpty)}
      <p class="hint">
        Чем выше порог, тем больше ровных участков заменяется сплошными цветными ячейками без
        символов. Цвет берётся из палитры, а если она выключена — из изображения. 0 — без заливки,
        пробел только участвует в подборе. Снятая галочка отключает заливку и исключает пустые
        знаки.
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
        <Button id="clearChars" size="s" onclick={() => editor.update('chars', '')}>Очистить</Button
        >
        <Button id="oneChar" size="s" onclick={() => editor.update('chars', '+')}>Только +</Button>
        <Button id="defaultChars" size="s" onclick={() => editor.update('chars', baseline)}
          >Базовый набор</Button
        >
      </div>
    {/if}
    {@render select('background', 'Однотонный фон', [
      { value: '#0c061b', label: 'Чернильный' },
      { value: '#000000', label: 'Чёрный' },
      { value: '#ffffff', label: 'Белый' },
      { value: '#eee9de', label: 'Бумага' },
    ])}
    {#if !twoColor}{@render range('blur', editor.settings.mode !== 'overlay')}{/if}
    {@render range('backgroundOpacity', editor.settings.mode !== 'overlay' && !twoColor)}
    {@render range('opacity')}
  </div>
{/snippet}

{#snippet content(id: string)}
  {#if id === 'photo'}
    {@render photo()}
  {:else if id === 'tone'}
    {@render tone()}
  {:else if id === 'color'}
    {@render color()}
  {:else if id === 'ascii'}
    {@render ascii()}
  {/if}
{/snippet}

{#if section === 'all'}
  {#each groups as group (group.id)}
    <Panel size="s">
      <Accordion items={[group]} multiple bind:value={expanded} size="s" headingLevel={2}>
        {#snippet header(item)}<strong>{item.title}</strong>{/snippet}
        {#snippet children(item)}
          <div class="section-content">{@render content(item.id)}</div>
        {/snippet}
      </Accordion>
    </Panel>
  {/each}
{:else}
  <Panel title={groups.find((group) => group.id === section)!.title} size="s">
    {@render content(section)}
  </Panel>
{/if}

<style>
  .section-content {
    border-top: 1px dashed var(--muted);
    padding-top: 16px;
    margin-top: 12px;
  }
  .control-stack,
  .import-form {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    min-width: 0;
    gap: 12px;
  }
  .button-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 150px), 1fr));
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
