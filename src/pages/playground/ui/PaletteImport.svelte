<script lang="ts">
  import { Button, Field, Input } from 'svelte-ascii-ui';

  import type { EditorModel } from '../model/editor.svelte';

  let {
    editor,
    value = $bindable(''),
    showStatus = true,
  }: {
    editor: EditorModel;
    value?: string;
    showStatus?: boolean;
  } = $props();
</script>

<form
  class="import-form"
  onsubmit={(event) => {
    event.preventDefault();
    void editor.importPalette(value);
  }}
>
  <Field
    id="paletteUrl"
    label="Ссылка или имя палитры Lospec"
    hint="Например: sweetie-16 или https://lospec.com/palette-list/sweetie-16"
  >
    {#snippet children(control)}<Input {...control} size="s" bind:value />{/snippet}
  </Field>
  <Button id="import" type="submit" size="s" loading={editor.importing}
    >Импортировать палитру</Button
  >
  {#if showStatus}<p id="importStatus" class="hint" role="status">{editor.importStatus}</p>{/if}
</form>

<style>
  .import-form {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    min-width: 0;
    gap: 12px;
  }
  .hint {
    color: var(--muted);
    font-size: 11px;
    line-height: 1.65;
    margin: 0;
    overflow-wrap: anywhere;
  }
</style>
