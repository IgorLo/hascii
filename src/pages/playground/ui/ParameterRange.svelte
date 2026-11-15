<script lang="ts">
  import { Button, Field, Slider } from 'svelte-ascii-ui';

  import type { EditorModel } from '../model/editor.svelte';
  import { ranges } from '../model/settings';

  let {
    editor,
    setting,
    compact = false,
    onedit,
    label,
    disabled = false,
    dense = false,
  }: {
    editor: EditorModel;
    setting: keyof typeof ranges;
    compact?: boolean;
    onedit?: (key: keyof typeof ranges) => void;
    label?: string;
    disabled?: boolean;
    dense?: boolean;
  } = $props();
  const config = $derived(ranges[setting]);
  const title = $derived(label ?? config.label);
</script>

{#snippet slider(control: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean })}
  <Slider
    {...control}
    size="s"
    min={config.min}
    max={config.max}
    step={config.step}
    {disabled}
    bind:value={() => editor.settings[setting], (value) => editor.update(setting, value)}
  />
{/snippet}

{#if compact && onedit}
  <Button
    id={`edit-${setting}`}
    data-edit={setting}
    size="m"
    fullWidth
    {disabled}
    aria-label={`Изменить: ${title}`}
    aria-describedby={`value-${setting}`}
    onclick={() => onedit?.(setting)}
  >
    <span class="parameter-row">
      <span class="parameter-label">{title}</span>
      <span id={`value-${setting}`} class="parameter-value">{editor.settings[setting]}</span>
    </span>
  </Button>
{:else if dense}
  <div class="live-range">
    <label for={setting} class="range-label"
      ><span>{title}</span><span class="parameter-value">{editor.settings[setting]}</span></label
    >
    {@render slider({ id: setting })}
  </div>
{:else}
  <Field id={setting} label={`${title} · ${editor.settings[setting]}`}>
    {#snippet children(control)}
      {@render slider(control)}
    {/snippet}
  </Field>
{/if}

<style>
  .live-range {
    display: grid;
    gap: 0;
    min-width: 0;
    font-size: 13px;
    line-height: 1.4;
  }
  .range-label {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    overflow-wrap: anywhere;
  }
  .parameter-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 16px;
    inline-size: 100%;
    text-align: start;
  }
  .parameter-label {
    overflow-wrap: anywhere;
  }
  .parameter-value {
    color: var(--accent);
    font-variant-numeric: tabular-nums;
  }
</style>
