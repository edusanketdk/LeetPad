<script lang="ts">
  import { registerBlockRoot } from '../../lib/focusRegistry';
  import type { PlacedBlock } from '../../lib/document.svelte';

  type Props = { block: PlacedBlock & { type: 'spine' } };
  let { block }: Props = $props();

  let root: HTMLDivElement | null = $state(null);

  $effect(() => {
    registerBlockRoot(block.id, root);
    return () => registerBlockRoot(block.id, null);
  });
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div bind:this={root} class="spine" role="separator" aria-orientation="horizontal" tabindex="0">
  <div class="line" aria-hidden="true"></div>
</div>

<style>
  .spine {
    outline: none;
    padding: 10px 0;
    margin: 0;
    box-sizing: border-box;
  }

  .line {
    height: 2px;
    border-radius: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      color-mix(in srgb, var(--border-strong) 85%, var(--accent-b) 15%) 12%,
      color-mix(in srgb, var(--border-strong) 70%, var(--accent-b) 30%) 50%,
      color-mix(in srgb, var(--border-strong) 85%, var(--accent-b) 15%) 88%,
      transparent
    );
  }
</style>
