<script lang="ts">
  let { colors, id }: { colors: string[]; id?: string } = $props();
  // Balanced rows keep every color equally sized, even for large imported palettes.
  const rows = $derived(Math.min(3, Math.ceil(colors.length / 16)));
  const columns = $derived(Math.ceil(colors.length / rows));
</script>

<span
  {id}
  class="palette-preview"
  data-palette-preview
  aria-hidden="true"
  style:--columns={columns}
  style:--rows={rows}
>
  {#each colors as color, i (`${i}-${color}`)}
    <span data-color={color} style:background-color={`#${color}`} title={`#${color}`}></span>
  {/each}
</span>

<style>
  .palette-preview {
    display: grid;
    grid-template-columns: repeat(var(--columns), minmax(0, 1fr));
    grid-template-rows: repeat(var(--rows), minmax(0, 1fr));
    block-size: 16px;
    inline-size: 100%;
    overflow: hidden;
  }
</style>
