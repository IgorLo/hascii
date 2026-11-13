<script lang="ts">
  import type { Attachment } from 'svelte/attachments';
  import { Button, Icon, IconButton } from 'svelte-ascii-ui';

  import type { Settings } from '@/shared/lib/renderer';

  let { value, onchange }: { value: Settings['mode']; onchange: (mode: Settings['mode']) => void } =
    $props();
  const modes: { value: Settings['mode']; label: string }[] = [
    { value: 'pixel-art', label: 'Pixel Art' },
    { value: 'pixels', label: 'Пиксели' },
    { value: 'halftone', label: 'Halftone' },
    { value: 'overlay', label: 'Фон + ASCII' },
    { value: 'ascii', label: 'ASCII' },
    { value: 'ascii-fx', label: 'ASCII FX' },
    { value: 'png2xp', label: 'png2xp' },
  ];
  let viewport = $state<HTMLDivElement>();
  let canBack = $state(false);
  let canForward = $state(false);

  function measure(node: HTMLDivElement) {
    canBack = node.scrollLeft > 1;
    canForward = node.scrollWidth - node.clientWidth - node.scrollLeft > 1;
  }
  const observe: Attachment<HTMLDivElement> = (node) => {
    viewport = node;
    const observer = new ResizeObserver(() => measure(node));
    observer.observe(node);
    for (const child of node.children) observer.observe(child);
    measure(node);
    return () => observer.disconnect();
  };
  function scroll(direction: number) {
    if (!viewport) return;
    viewport.scrollBy({ left: direction * viewport.clientWidth * 0.8, behavior: 'instant' });
    measure(viewport);
    if ((direction > 0 && !canForward) || (direction < 0 && !canBack)) {
      const edge = direction > 0 ? modes.at(-1)! : modes[0];
      viewport
        .querySelector<HTMLButtonElement>(`[data-mode="${edge.value}"]`)
        ?.focus({ preventScroll: true });
    }
  }
  // Reveal a mode selected outside this strip, for example by a preset.
  $effect(() => {
    const node = viewport;
    const active = value;
    if (node && node.scrollWidth > node.clientWidth) {
      node
        .querySelector(`[data-mode="${active}"]`)
        ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  });
</script>

<div class="mode-picker">
  <span class="mode-step" class:unavailable={!canBack}>
    <IconButton size="s" label="Предыдущие режимы" disabled={!canBack} onclick={() => scroll(-1)}>
      <span class="back-arrow"><Icon name="chevron-down" /></span>
    </IconButton>
  </span>
  <div
    class="mode-viewport aui-scrollbar"
    role="group"
    aria-label="Режим отрисовки"
    {@attach observe}
    onscroll={(event) => measure(event.currentTarget)}
  >
    {#each modes as mode (mode.value)}
      <span class="mode-item">
        <Button
          size="s"
          data-mode={mode.value}
          aria-pressed={value === mode.value}
          variant={value === mode.value ? 'primary' : 'default'}
          onclick={() => onchange(mode.value)}>{mode.label}</Button
        >
      </span>
    {/each}
  </div>
  <span class="mode-step" class:unavailable={!canForward}>
    <IconButton size="s" label="Следующие режимы" disabled={!canForward} onclick={() => scroll(1)}>
      <span class="forward-arrow"><Icon name="chevron-down" /></span>
    </IconButton>
  </span>
</div>

<style>
  .mode-picker {
    min-inline-size: 0;
    max-inline-size: 100%;
  }
  .mode-viewport {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    min-inline-size: 0;
    padding: 2px;
  }
  .mode-item {
    flex: 0 0 auto;
    white-space: nowrap;
  }
  .mode-step {
    display: none;
  }
  .back-arrow,
  .forward-arrow {
    display: inline-flex;
  }
  .back-arrow {
    rotate: 90deg;
  }
  .forward-arrow {
    rotate: -90deg;
  }
  @media (max-width: 760px) {
    .mode-picker {
      position: relative;
      inline-size: 100%;
    }
    .mode-viewport {
      inline-size: 100%;
      flex-wrap: nowrap;
      overflow-x: scroll;
      padding-block: 4px 6px;
      scroll-padding-inline: 44px;
      overscroll-behavior-x: contain;
    }
    .mode-step {
      display: flex;
      position: absolute;
      inset-block-start: 4px;
      z-index: 1;
      background: var(--bg);
    }
    .mode-step:first-child {
      inset-inline-start: 0;
    }
    .mode-step:last-child {
      inset-inline-end: 0;
    }
    .unavailable {
      display: none;
    }
  }
</style>
