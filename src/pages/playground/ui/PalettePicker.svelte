<script lang="ts">
  import { Button, Field, Icon, Popover } from 'svelte-ascii-ui';

  import type { Palette } from '@/shared/lib/renderer';

  import PalettePreview from './PalettePreview.svelte';

  let {
    palettes,
    value,
    onchange,
  }: {
    palettes: Palette[];
    value: string;
    onchange: (id: string) => void;
  } = $props();
  const selected = $derived(palettes.find((palette) => palette.id === value)!);

  function navigate(event: KeyboardEvent) {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const group = (event.currentTarget as HTMLElement).closest('[role="group"]')!;
    const buttons = Array.from(group.querySelectorAll<HTMLButtonElement>('button'));
    const index = buttons.indexOf(group.ownerDocument.activeElement as HTMLButtonElement);
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? buttons.length - 1
          : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
    event.preventDefault();
    buttons[next]?.focus();
  }
</script>

{#snippet choice(palette: Palette, current = false)}
  <span class="palette-choice">
    <span
      class="palette-label"
      data-palette-label
      title={`${palette.name} · ${palette.colors.length} цветов`}
      ><span class="palette-name">{palette.name}</span><span class="palette-count">
        · {palette.colors.length}</span
      ></span
    >
    <PalettePreview colors={palette.colors} id={current ? 'swatches' : undefined} />
  </span>
{/snippet}

<Field id="palette" label="Палитра">
  {#snippet children(control)}
    <Popover
      {...control}
      label={`Палитра: ${selected.name} · ${selected.colors.length} цветов`}
      title="Выбор палитры"
      size="s"
      style="width: 100%"
    >
      {#snippet trigger()}
        {@render choice(selected, true)}
        <Icon name="chevron-down" />
      {/snippet}
      {#snippet children(close)}
        <div class="palette-list aui-scrollbar" role="group" aria-label="Палитры">
          {#each palettes as palette (palette.id)}
            <Button
              size="s"
              fullWidth
              aria-label={`${palette.name} · ${palette.colors.length} цветов`}
              aria-pressed={palette.id === value}
              variant={palette.id === value ? 'primary' : 'default'}
              onkeydown={navigate}
              onclick={() => {
                onchange(palette.id);
                close();
              }}
            >
              {@render choice(palette)}
            </Button>
          {/each}
        </div>
      {/snippet}
    </Popover>
  {/snippet}
</Field>

<style>
  .palette-list {
    display: grid;
    gap: 2px;
    min-inline-size: 0;
    max-block-size: min(45dvh, 330px);
    overflow: auto;
    overscroll-behavior: contain;
  }
  .palette-choice {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 68px;
    align-items: center;
    gap: 8px;
    inline-size: min(200px, calc(100vw - 112px));
    text-align: left;
  }
  .palette-label {
    display: flex;
    align-items: center;
    gap: 4px;
    min-inline-size: 0;
    overflow: hidden;
    white-space: nowrap;
    font-size: 11px;
  }
  .palette-name {
    min-inline-size: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .palette-count {
    flex-shrink: 0;
  }
</style>
