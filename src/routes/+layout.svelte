<script lang="ts">
  import 'svelte-ascii-ui/styles.css';
  import '@/app/styles/app.css';

  import type { Snippet } from 'svelte';
  import { Theme } from 'svelte-ascii-ui';

  let { children }: { children: Snippet } = $props();
</script>

<Theme
  palette="plum"
  size="s"
  font="Consolas, 'Lucida Console', 'Courier New', monospace"
  colors={{
    background: '#120c10',
    surface: '#211219',
    text: '#e6ced5',
    muted: '#af8997',
    accent: '#ed8296',
    danger: '#ffb5a4',
    warning: '#e8d29e',
  }}
>
  {@render children()}
</Theme>
