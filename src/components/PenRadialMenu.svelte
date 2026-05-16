<script lang="ts">
  import type { PenColorKey } from '../lib/penColor';

  type Props = {
    penActive: boolean;
    penColorKey: PenColorKey;
    dark: boolean;
    onTogglePen: () => void;
    onPickColor: (k: PenColorKey) => void;
    onClearSketches: () => void;
  };

  let { penActive, penColorKey, dark, onTogglePen, onPickColor, onClearSketches }: Props = $props();

  const inkFill = $derived(dark ? '#eceff4' : '#12141a');
  const rgb = { r: '#e53935', g: '#43a047', b: '#1e88e5' } as const;
</script>

<div class="hub">
  {#if penActive}
    <div class="drop" role="menu" aria-label="Pen options">
      <div class="color-group" role="group" aria-label="Stroke color">
        {#each (['ink', 'r', 'g', 'b'] as PenColorKey[]) as key (key)}
          <button
            type="button"
            class="orb color-orb"
            class:sel={penColorKey === key}
            aria-label={key === 'ink' ? 'Theme default stroke' : `Color ${key}`}
            role="menuitem"
            onclick={() => onPickColor(key)}
          >
            <span class="fill" style:background={key === 'ink' ? inkFill : rgb[key]}></span>
          </button>
        {/each}
      </div>
      <button type="button" class="clear-marks" role="menuitem" onclick={onClearSketches}>
        <span class="clear-icon" aria-hidden="true">🗑</span>
        <span class="clear-label">Clear all marks</span>
      </button>
    </div>
  {/if}

  <button
    type="button"
    class="fab"
    class:on={penActive}
    aria-pressed={penActive}
    title={penActive ? 'Turn off pen' : 'Turn on pen'}
    onclick={onTogglePen}
  >
    ✎
  </button>
</div>

<style>
  .hub {
    position: relative;
    z-index: 210;
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: center;
    gap: 12px;
  }

  .fab {
    position: relative;
    flex: 0 0 auto;
    width: 42px;
    height: 42px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text-h);
    font: 700 18px/1 var(--sans);
    cursor: pointer;
    box-shadow: var(--shadow);
  }

  .fab.on {
    border-color: color-mix(in srgb, var(--accent-b) 70%, #000);
    background: var(--accent-b);
    color: #1a0f00;
    box-shadow:
      0 0 0 2px color-mix(in srgb, var(--accent-b) 45%, transparent),
      var(--shadow);
  }

  .fab:hover {
    filter: brightness(1.03);
  }

  .fab.on:hover {
    filter: brightness(1.06);
  }

  .drop {
    position: static;
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    padding: 8px 12px;
    border-radius: 14px;
    border: 1px solid var(--border-strong);
    background: color-mix(in srgb, var(--surface) 96%, transparent);
    backdrop-filter: blur(14px);
    box-shadow:
      0 2px 4px color-mix(in srgb, var(--text-h) 5%, transparent),
      0 10px 28px color-mix(in srgb, var(--text-h) 10%, transparent);
    pointer-events: auto;
  }

  .color-group {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .orb {
    width: 32px;
    height: 32px;
    padding: 0;
    border-radius: 999px;
    border: 2px solid var(--border-strong);
    background: var(--surface-2);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
  }

  .color-orb {
    overflow: hidden;
  }

  .color-orb .fill {
    display: block;
    width: 18px;
    height: 18px;
    border-radius: 999px;
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--text-h) 18%, transparent);
  }

  .color-orb.sel {
    border-color: var(--accent-b);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-b) 35%, transparent);
  }

  .clear-marks {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 7px 12px;
    border-radius: 10px;
    border: 1px solid color-mix(in srgb, var(--accent-r) 38%, var(--border-strong));
    background: color-mix(in srgb, var(--surface-2) 90%, transparent);
    color: var(--accent-r);
    font: 600 12px var(--sans);
    cursor: pointer;
  }

  .clear-marks:hover {
    background: color-mix(in srgb, var(--accent-r) 14%, var(--surface-2));
  }

  .clear-icon {
    font-size: 14px;
    line-height: 1;
  }

  .clear-label {
    white-space: nowrap;
  }
</style>
