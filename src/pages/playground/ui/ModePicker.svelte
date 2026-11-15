<script lang="ts">
  import type { Settings } from '@/shared/lib/renderer';

  import { modeChoices } from '../model/mode-presentation';
  import ControlStrip from './ControlStrip.svelte';

  let { value, onchange }: { value: Settings['mode']; onchange: (mode: Settings['mode']) => void } =
    $props();
</script>

<ControlStrip
  items={modeChoices}
  {value}
  onchange={(value) => onchange(value as Settings['mode'])}
  label="Режим отрисовки"
  attribute="mode"
  previousLabel="Предыдущие режимы"
  nextLabel="Следующие режимы"
/>
