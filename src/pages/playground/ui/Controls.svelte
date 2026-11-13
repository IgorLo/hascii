<script lang="ts">
  import type { Snippet } from 'svelte';
  import {
    Accordion,
    Button,
    Checkbox,
    Field,
    Input,
    Link,
    Panel,
    Select,
    Textarea,
  } from 'svelte-ascii-ui';

  import { selectMode, type Settings } from '@/shared/lib/renderer';

  import type { EditorModel } from '../model/editor.svelte';
  import { modePresentation, type ToolSection } from '../model/mode-presentation';
  import { baseline, characterSets, presets, type ranges } from '../model/settings';
  import ArtControls from './ArtControls.svelte';
  import ModePicker from './ModePicker.svelte';
  import PalettePicker from './PalettePicker.svelte';
  import ParameterRange from './ParameterRange.svelte';

  let {
    editor,
    section = 'all',
    mobile = false,
    onedit,
    upload,
    showModePicker = true,
  }: {
    editor: EditorModel;
    section?: 'all' | ToolSection;
    mobile?: boolean;
    onedit?: (key: keyof typeof ranges) => void;
    upload?: Snippet;
    showModePicker?: boolean;
  } = $props();
  let paletteUrl = $state('');
  const palette = $derived(editor.palettes.find((p) => p.id === editor.settings.palette)!);
  const charCount = $derived(new Set(Array.from(editor.settings.chars)).size);
  const presentation = $derived(modePresentation(selectMode(editor.settings)));
  const twoColor = $derived(presentation.controls === 'cells');
  const artMode = $derived(presentation.controls === 'art');
  const groups = $derived(presentation.sections);
  let expanded = $state<string | string[]>(['photo', 'style']);
  type StringSetting = {
    [K in keyof Settings]: Settings[K] extends string ? K : never;
  }[keyof Settings];
</script>

{#snippet range(setting: keyof typeof ranges, label?: string)}
  <ParameterRange {editor} {setting} compact={mobile} {onedit} {label} />
{/snippet}

{#snippet select(key: StringSetting, label: string, options: { value: string; label: string }[])}
  <Field id={key} {label}>
    {#snippet children(control)}
      <Select
        {...control}
        size="s"
        showPlaceholder={false}
        {options}
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
  <div class="control-stack">
    {@render upload?.()}
    <Field
      id="resolution"
      label="Рабочее разрешение"
      hint="По длинной стороне, без увеличения оригинала. PNG сохраняется в этом размере."
    >
      {#snippet children(control)}
        <Select
          {...control}
          size="s"
          showPlaceholder={false}
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
  </div>
{/snippet}

{#snippet tone()}
  <div class="control-stack">
    <Checkbox
      id="correction"
      size="s"
      label="Коррекция изображения"
      bind:checked={() => editor.settings.correction, (value) => editor.update('correction', value)}
    />
    {#if editor.settings.correction}
      {@render range('brightness')}
      {@render range('contrast')}
      {@render range('saturation')}
    {/if}
  </div>
{/snippet}

{#snippet color()}
  {#if artMode}
    <ArtControls {editor} section="color" {mobile} {onedit} />
  {:else}
    <div class="control-stack">
      <Checkbox
        id="paletteEnabled"
        size="s"
        label="Ограничить палитру"
        bind:checked={
          () => editor.settings.paletteEnabled, (value) => editor.update('paletteEnabled', value)
        }
      />
      {#if editor.settings.paletteEnabled}
        <PalettePicker
          palettes={editor.palettes}
          value={editor.settings.palette}
          onchange={(value) => editor.update('palette', value)}
        />
        <p class="hint">
          {palette.colors.length} цветов · {palette.author}
          {#if palette.url}<Link
              size="inherit"
              href={palette.url}
              target="_blank"
              rel="noopener noreferrer">Lospec ↗</Link
            >{/if}
        </p>
        <details data-details="dither">
          <summary>Дизеринг</summary>
          <div class="details-content">
            {@render select('dither', 'Алгоритм дизеринга', [
              { value: 'none', label: 'Выключен' },
              { value: 'bayer', label: 'Bayer · регулярный 4×4' },
              { value: 'floyd', label: 'Floyd–Steinberg · зерно' },
              { value: 'atkinson', label: 'Atkinson · разреженный' },
              { value: 'blue-noise', label: 'Blue noise · нерегулярный' },
            ])}
            {#if editor.settings.dither !== 'none'}{@render range('strength')}{/if}
          </div>
        </details>
        <details data-details="import">
          <summary>Импорт палитры Lospec</summary>
          <form
            class="import-form details-content"
            onsubmit={(event) => {
              event.preventDefault();
              void editor.importPalette(paletteUrl);
            }}
          >
            <Field
              id="paletteUrl"
              label="Ссылка или имя палитры Lospec"
              hint="Например: sweetie-16 или https://lospec.com/palette-list/sweetie-16"
            >
              {#snippet children(control)}<Input
                  {...control}
                  size="s"
                  bind:value={paletteUrl}
                />{/snippet}
            </Field>
            <Button id="import" type="submit" size="s" loading={editor.importing}
              >Импортировать палитру</Button
            >
          </form>
        </details>
      {/if}
      <p id="importStatus" class="hint" role="status">{editor.importStatus}</p>
    </div>
  {/if}
{/snippet}

{#snippet characters()}
  {@render select('font', 'Шрифт', [
    { value: 'Consolas, monospace', label: 'Consolas' },
    { value: "'Courier New', monospace", label: 'Courier New' },
    { value: "'Lucida Console', monospace", label: 'Lucida Console' },
  ])}
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
    bind:checked={() => editor.settings.allowEmpty, (value) => editor.update('allowEmpty', value)}
  />
  {#if editor.settings.allowEmpty}
    {@render range('emptyThreshold')}
    <p class="hint">
      Чем выше порог, тем больше ровных участков заменяется цветными ячейками без символов. 0 — без
      заливки, пробел только участвует в подборе.
    </p>
  {/if}
  <Field
    id="chars"
    label={`Твой набор символов (${charCount})`}
    hint="До 512 уникальных символов. Отображение Unicode зависит от шрифта; цветные emoji не рассчитаны на точное сопоставление."
  >
    {#snippet children(control)}<Textarea
        class="aui-scrollbar"
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
{/snippet}

{#snippet symbolStyle()}
  {#if twoColor}
    {@render range('cellSize')}{@render range('cellAspect')}
    <p class="hint">1 — квадратные ячейки, 2 — вытянутые по вертикали.</p>
  {:else}
    {@render range('fontSize')}
    {#if editor.settings.mode === 'overlay'}
      {@render range('overlayFill')}
      <p class="hint">Цветная подложка заполняет ячейки. При 100% символ сливается с заливкой.</p>
    {/if}
  {/if}
  {#if presentation.blocks}
    <Checkbox
      id="blockShading"
      size="s"
      label="Штриховка ░ ▒"
      bind:checked={
        () => editor.settings.blockShading, (value) => editor.update('blockShading', value)
      }
    />
    <p class="hint">Без штриховки остаются сплошные ячейки и полублоки ▄ ▌.</p>
  {/if}
  <details data-details="style">
    <summary>{presentation.blocks ? 'Фон и непрозрачность' : 'Символы, интервалы и фон'}</summary>
    <div class="details-content">
      {#if !presentation.blocks}
        {#if !twoColor}
          {@render select('matching', 'Подбор', [
            { value: 'tone', label: 'По яркости' },
            { value: 'shape', label: 'По яркости и форме' },
          ])}
          {#if editor.settings.matching === 'shape'}{@render range('shapeWeight')}{/if}
        {/if}
        {@render characters()}
      {/if}
      {@render select('background', 'Однотонный фон', [
        { value: '#0c061b', label: 'Чернильный' },
        { value: '#000000', label: 'Чёрный' },
        { value: '#ffffff', label: 'Белый' },
        { value: '#eee9de', label: 'Бумага' },
      ])}
      {#if twoColor}{@render range('backgroundOpacity', 'Непрозрачность фона ячеек')}{/if}
      {@render range('opacity')}
    </div>
  </details>
{/snippet}

{#snippet style()}
  <div class="control-stack">
    {#if showModePicker}
      <ModePicker value={editor.settings.mode} onchange={(mode) => editor.update('mode', mode)} />
    {/if}
    <div class="preset-stack">
      <span>Пресеты</span>
      <div class="button-grid">
        {#each presets as preset (preset.value)}
          <Button size="s" data-preset={preset.value} onclick={() => editor.preset(preset.value)}
            >{preset.label}</Button
          >
        {/each}
      </div>
    </div>
    {#if artMode}
      <ArtControls {editor} section="style" {mobile} {onedit} />
    {:else if presentation.controls === 'pixels'}
      <Checkbox
        id="pixelate"
        size="s"
        label="Пикселизация"
        bind:checked={() => editor.settings.pixelate, (value) => editor.update('pixelate', value)}
      />
      {#if editor.settings.pixelate}{@render range('pixelSize')}{/if}
    {:else}
      {@render symbolStyle()}
    {/if}
  </div>
{/snippet}

{#snippet content(id: string)}
  {#if id === 'photo'}
    {@render photo()}
  {:else if id === 'style'}
    {@render style()}
  {:else if id === 'color'}
    {@render color()}
  {:else if id === 'tone'}
    {@render tone()}
  {/if}
{/snippet}

{#if section === 'all'}
  {#each groups as group (group.id)}
    <Panel size="s" aria-label={group.title} data-section={group.id}>
      <Accordion items={[group]} multiple bind:value={expanded} size="s" headingLevel={2}>
        {#snippet header(item)}<strong>{item.title}</strong>{/snippet}
        {#snippet children(item)}
          <div class="section-content">{@render content(item.id)}</div>
        {/snippet}
      </Accordion>
    </Panel>
  {/each}
{:else if mobile}
  {@render content(section)}
{:else}
  <Panel
    title={groups.find((group) => group.id === section)!.title}
    aria-label={groups.find((group) => group.id === section)!.title}
    data-section={section}
    size="s"
  >
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
  .import-form,
  .details-content,
  .preset-stack {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    min-width: 0;
    gap: 12px;
  }
  .preset-stack {
    gap: 8px;
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
</style>
