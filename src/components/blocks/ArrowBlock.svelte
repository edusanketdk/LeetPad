<script lang="ts">
  import type { PlacedBlock } from '../../lib/document.svelte';
  import { registerBlockRoot } from '../../lib/focusRegistry';

  type Props = { block: PlacedBlock & { type: 'arrow' } };
  let { block }: Props = $props();

  let root: HTMLDivElement | null = $state(null);

  $effect(() => {
    registerBlockRoot(block.id, root);
    return () => registerBlockRoot(block.id, null);
  });
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div bind:this={root} class="arrow" role="img" aria-label="Step arrow" tabindex="0">
  <svg class="arrow-svg" width="56" height="28" viewBox="0 0 56 28" aria-hidden="true">
    <polygon
      fill="currentColor"
      points="0,12 38,12 38,10 56,14 38,18 38,16 0,16"
    />
  </svg>
</div>

<style>
  .arrow {
    display: flex;
    align-items: center;
    padding: 10px 12px;
    color: var(--accent-b);
    outline: none;
    border-radius: 10px;
  }

  .arrow-svg {
    display: block;
    flex: 0 0 auto;
  }
</style>
