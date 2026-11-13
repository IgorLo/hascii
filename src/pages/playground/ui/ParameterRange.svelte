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
  }: {
    editor: EditorModel;
    setting: keyof typeof ranges;
    compact?: boolean;
    onedit?: (key: keyof typeof ranges) => void;
    label?: string;
    disabled?: boolean;
  } = $props();
  const config = $derived(ranges[setting]);
  const title = $derived(label ?? config.label);
</script>

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
{:else}
  <Field id={setting} label={`${title} · ${editor.settings[setting]}`}>
    {#snippet children(control)}
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
  </Field>
{/if}

<style>
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
