<script lang="ts">
  import { doc, setSelectedBlock, exitCellFocus, clearSelection, type PlacedBlock } from '../../lib/document.svelte';
  import { registerBlockRoot } from '../../lib/focusRegistry';

  type Props = { block: PlacedBlock & { type: 'array' } };
  let { block }: Props = $props();

  let root: HTMLDivElement | null = $state(null);

  $effect(() => {
    registerBlockRoot(block.id, root);
    return () => registerBlockRoot(block.id, null);
  });

  const selected = $derived(doc.selectedBlockId === block.id);

  function inputSize(v: string): number {
    return Math.max(4, Math.min(18, String(v ?? '').length + 2));
  }

  function cellInputs(): HTMLInputElement[] {
    if (!root) return [];
    return [...root.querySelectorAll<HTMLInputElement>('[data-cell-input]')];
  }

  function cellKeydown(e: KeyboardEvent, i: number) {
    if (e.key === 'Tab') {
      e.preventDefault();
      const inputs = cellInputs();
      const cur = inputs.indexOf(e.target as HTMLInputElement);
      if (cur === -1) return;
      const next = (cur + (e.shiftKey ? -1 : 1) + inputs.length) % inputs.length;
      inputs[next]?.focus();
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      root?.focus();
      exitCellFocus();
      return;
    }
    if (e.key === 'Delete' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      block.values[i] = '';
      return;
    }
  }

  function onWrapKeydown(e: KeyboardEvent) {
    if (e.target !== e.currentTarget) return;
    if (!selected) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      clearSelection();
    }
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="wrap" bind:this={root} tabindex="0" role="application" aria-label="Array" onkeydown={onWrapKeydown}>
  <div class="scale">
    <div class="row">
      {#each block.values as v, i (i)}
        <div class="col">
          <div class="idx">{i}</div>
          <div class="cell">
            <input
              class="val"
              data-cell-input
              value={v}
              size={inputSize(v)}
              aria-label={`Index ${i}`}
              onfocus={() => setSelectedBlock(block.id, i)}
              onkeydown={(e) => cellKeydown(e, i)}
              oninput={(e) => {
                block.values[i] = e.currentTarget.value;
              }}
            />
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .wrap {
    border-radius: 12px;
    border: 1px solid transparent;
    padding: 14px 16px 16px;
    outline: none;
    transition: border-color 0.15s ease;
    min-width: 0;
    width: fit-content;
    max-width: min(92vw, 960px);
  }

  .wrap:focus-visible {
    border-color: color-mix(in srgb, var(--border-strong) 75%, var(--accent-b) 25%);
  }

  .scale {
    width: fit-content;
    max-width: min(92vw, 960px);
  }

  .row {
    display: flex;
    flex-wrap: nowrap;
    align-items: stretch;
    gap: 12px;
  }

  .col {
    flex: 0 0 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-width: 22ch;
  }

  .idx {
    font: 600 11px var(--mono);
    color: var(--muted);
    text-align: center;
    padding: 0;
    line-height: 1.15;
  }

  .cell {
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--surface);
    min-width: 56px;
    min-height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .val {
    box-sizing: border-box;
    border: none;
    background: transparent;
    text-align: center;
    font: 600 14px/1.35 var(--mono);
    color: var(--text-h);
    padding: 10px 10px;
    outline: none;
    min-height: 56px;
    min-width: 56px;
    max-width: 100%;
    field-sizing: content;
    width: 100%;
  }
</style>
