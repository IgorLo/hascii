<script lang="ts">
  import type { Attachment } from 'svelte/attachments';
  import { Button, Icon, IconButton } from 'svelte-ascii-ui';

  let {
    items,
    value,
    onchange,
    label,
    attribute,
    previousLabel,
    nextLabel,
    horizontal = false,
  }: {
    items: { value: string; label: string }[];
    value: string;
    onchange: (value: string) => void;
    label: string;
    attribute: 'mode' | 'parameter';
    previousLabel: string;
    nextLabel: string;
    horizontal?: boolean;
  } = $props();
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
      const edge = direction > 0 ? items.at(-1)! : items[0];
      viewport
        .querySelector<HTMLButtonElement>(`[data-choice="${edge.value}"]`)
        ?.focus({ preventScroll: true });
    }
  }
  $effect(() => {
    const node = viewport;
    const active = value;
    const choice = items.find((item) => item.value === active);
    if (node) {
      measure(node);
      if (choice && node.scrollWidth > node.clientWidth)
        node
          .querySelector(`[data-choice="${active}"]`)
          ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  });
</script>

<div class={['control-strip', { horizontal }]}>
  <span class="strip-step" class:unavailable={!canBack}>
    <IconButton size="s" label={previousLabel} disabled={!canBack} onclick={() => scroll(-1)}>
      <span class="back-arrow"><Icon name="chevron-down" /></span>
    </IconButton>
  </span>
  <div
    class={['strip-viewport', 'aui-scrollbar', { 'mode-viewport': attribute === 'mode' }]}
    role="group"
    aria-label={label}
    {@attach observe}
    onscroll={(event) => measure(event.currentTarget)}
  >
    {#each items as item (item.value)}
      <span class="strip-item">
        <Button
          size="s"
          data-choice={item.value}
          data-mode={attribute === 'mode' ? item.value : undefined}
          data-parameter={attribute === 'parameter' ? item.value : undefined}
          aria-pressed={value === item.value}
          variant={value === item.value ? 'primary' : 'default'}
          onclick={() => onchange(item.value)}>{item.label}</Button
        >
      </span>
    {/each}
  </div>
  <span class="strip-step" class:unavailable={!canForward}>
    <IconButton size="s" label={nextLabel} disabled={!canForward} onclick={() => scroll(1)}>
      <span class="forward-arrow"><Icon name="chevron-down" /></span>
    </IconButton>
  </span>
</div>

<style>
  .control-strip {
    min-inline-size: 0;
    max-inline-size: 100%;
  }
  .strip-viewport {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    min-inline-size: 0;
    padding: 2px;
  }
  .strip-item {
    flex: 0 0 auto;
    white-space: nowrap;
  }
  .strip-step {
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
  .horizontal {
    position: relative;
    inline-size: 100%;
  }
  .horizontal .strip-viewport {
    inline-size: 100%;
    flex-wrap: nowrap;
    overflow-x: scroll;
    padding-block: 4px 6px;
    scroll-padding-inline: 44px;
    overscroll-behavior-x: contain;
  }
  .horizontal .strip-step {
    display: flex;
    position: absolute;
    inset-block-start: 4px;
    z-index: 1;
    background: var(--bg);
  }
  .horizontal .strip-step:first-child {
    inset-inline-start: 0;
  }
  .horizontal .strip-step:last-child {
    inset-inline-end: 0;
  }
  .horizontal .unavailable {
    display: none;
  }
  @media (max-width: 760px), (max-width: 1000px) and (max-height: 500px) and (pointer: coarse) {
    .control-strip {
      position: relative;
      inline-size: 100%;
    }
    .strip-viewport {
      inline-size: 100%;
      flex-wrap: nowrap;
      overflow-x: scroll;
      padding-block: 4px 6px;
      scroll-padding-inline: 44px;
      overscroll-behavior-x: contain;
    }
    .strip-step {
      display: flex;
      position: absolute;
      inset-block-start: 4px;
      z-index: 1;
      background: var(--bg);
    }
    .strip-step:first-child {
      inset-inline-start: 0;
    }
    .strip-step:last-child {
      inset-inline-end: 0;
    }
    .unavailable {
      display: none;
    }
  }
</style>
