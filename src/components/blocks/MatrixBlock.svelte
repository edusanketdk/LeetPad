<script lang="ts">
  import { doc, setSelectedBlock, exitCellFocus, clearSelection, type PlacedBlock } from '../../lib/document.svelte';
  import { registerBlockRoot } from '../../lib/focusRegistry';

  type Props = { block: PlacedBlock & { type: 'matrix' } };
  let { block }: Props = $props();

  let root: HTMLDivElement | null = $state(null);

  $effect(() => {
    registerBlockRoot(block.id, root);
    return () => registerBlockRoot(block.id, null);
  });

  const rows = $derived(block.rows.length);
  const cols = $derived(block.rows[0]?.length ?? 0);

  const selected = $derived(doc.selectedBlockId === block.id);

  function inputSize(v: string): number {
    return Math.max(4, Math.min(18, String(v ?? '').length + 2));
  }

  function cellInputs(): HTMLInputElement[] {
    if (!root) return [];
    return [...root.querySelectorAll<HTMLInputElement>('[data-cell-input]')];
  }

  function cellKeydown(e: KeyboardEvent, r: number, c: number) {
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
      block.rows[r][c] = '';
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
<div class="wrap" bind:this={root} tabindex="0" role="application" aria-label="Matrix" onkeydown={onWrapKeydown}>
  <div class="scale" style={`--cols:${Math.max(cols, 1)};--rows:${Math.max(rows, 1)}`}>
    <div class="table">
      <div class="corner"></div>
      {#each Array.from({ length: cols }, (_, c) => c) as c (`h-${c}`)}
        <div class="head">{c}</div>
      {/each}

      {#each block.rows as row, r (r)}
        <div class="rhead">{r}</div>
        {#each row as v, c (`${block.id}-${r}-${c}`)}
          <div class="cell">
            <input
              class="val"
              data-cell-input
              value={v}
              size={inputSize(v)}
              aria-label={`Row ${r} column ${c}`}
              onfocus={() => setSelectedBlock(block.id, r * Math.max(cols, 1) + c)}
              onkeydown={(e) => cellKeydown(e, r, c)}
              oninput={(e) => {
                block.rows[r][c] = e.currentTarget.value;
              }}
            />
          </div>
        {/each}
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

  .table {
    display: grid;
    grid-template-columns: 22px repeat(var(--cols), minmax(56px, max-content));
    gap: 10px 12px;
    align-items: stretch;
  }

  .corner {
    min-height: 18px;
  }

  .head,
  .rhead {
    font: 600 11px var(--mono);
    color: var(--muted);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1px 0;
  }

  .rhead {
    justify-content: flex-end;
    padding-right: 4px;
  }

  .cell {
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--surface);
    min-width: 56px;
    min-height: 56px;
    max-width: 22ch;
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
