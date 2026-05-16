<script lang="ts">
  import type { CommandDef } from '../lib/commands';

  type Props = {
    open: boolean;
    filter: string;
    commands: CommandDef[];
    active: number;
    onClose: () => void;
    onPick: (cmd: CommandDef) => void;
    onActiveChange: (i: number) => void;
  };

  let { open, filter, commands, active, onClose, onPick, onActiveChange }: Props = $props();
</script>

{#if open}
  <div class="backdrop" role="presentation" onclick={onClose}></div>
  <div class="palette" role="listbox" aria-label="Insert block">
    {#if commands.length === 0}
      <div class="empty">No commands match “{filter}”</div>
    {:else}
      {#each commands as cmd, i (cmd.id)}
        <button
          type="button"
          role="option"
          aria-selected={i === active}
          class="row"
          class:active={i === active}
          onmouseenter={() => onActiveChange(i)}
          onclick={() => onPick(cmd)}
        >
          <span class="title">/{cmd.id}</span>
        </button>
      {/each}
    {/if}
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 40;
  }

  .palette {
    position: fixed;
    z-index: 50;
    left: 50%;
    top: 22%;
    transform: translateX(-50%);
    width: min(420px, calc(100vw - 32px));
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    box-shadow: var(--shadow);
    padding: 6px;
    max-height: min(60vh, 420px);
    overflow: auto;
  }

  .row {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 12px;
    text-align: left;
    border: none;
    background: transparent;
    color: var(--text);
    font: inherit;
    padding: 10px 12px;
    border-radius: 8px;
    cursor: pointer;
  }

  .row:hover,
  .active {
    background: color-mix(in srgb, var(--accent-b) 12%, var(--surface-2));
  }

  .title {
    font-family: var(--mono);
    font-size: 14px;
    font-weight: 600;
    color: var(--text-h);
  }

  .empty {
    padding: 14px 12px;
    font-size: 14px;
    color: var(--muted);
  }
</style>
