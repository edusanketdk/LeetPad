<script lang="ts">
  import { doc, moveBlock, pushUndoPoint, clearSelection, type PlacedBlock } from '../lib/document.svelte';
  import { resolveNonOverlapForBlock } from '../lib/layoutResolve';
  import ParagraphBlock from './blocks/ParagraphBlock.svelte';
  import ArrowBlock from './blocks/ArrowBlock.svelte';
  import ArrayBlock from './blocks/ArrayBlock.svelte';
  import MatrixBlock from './blocks/MatrixBlock.svelte';
  import SpineBlock from './blocks/SpineBlock.svelte';
  import StructureMenu from './StructureMenu.svelte';

  type Props = {
    onSlash?: () => void;
    onEmptyContextMenu: (pos: { x: number; y: number }) => void;
    onOpenAutoCreate?: (pos: { x: number; y: number }) => void;
  };

  let { onSlash, onEmptyContextMenu, onOpenAutoCreate }: Props = $props();

  let canvasEl: HTMLDivElement | null = $state(null);

  let structureMenu = $state<{ id: string; left: number; top: number } | null>(null);

  let drag = $state<{
    id: string;
    sx: number;
    sy: number;
    ox: number;
    oy: number;
  } | null>(null);

  let paraDragPrep = $state<{
    id: string;
    sx: number;
    sy: number;
    ox: number;
    oy: number;
    ax: number;
    ay: number;
    ta: HTMLTextAreaElement;
  } | null>(null);

  let cellDragPrep = $state<{
    id: string;
    sx: number;
    sy: number;
    ox: number;
    oy: number;
    ax: number;
    ay: number;
    inp: HTMLInputElement;
  } | null>(null);

  $effect(() => {
    const p = paraDragPrep;
    if (!p) return;
    const thresh = 6;
    const thresh2 = thresh * thresh;
    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - p.ax;
      const dy = e.clientY - p.ay;
      if (dx * dx + dy * dy >= thresh2) {
        pushUndoPoint();
        drag = { id: p.id, sx: p.sx, sy: p.sy, ox: p.ox, oy: p.oy };
        paraDragPrep = null;
      }
    };
    const onUp = () => {
      const cur = paraDragPrep;
      if (cur) {
        cur.ta.focus();
        paraDragPrep = null;
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
    window.addEventListener('pointercancel', onUp, { once: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  });

  $effect(() => {
    const c = cellDragPrep;
    if (!c) return;
    const thresh = 6;
    const thresh2 = thresh * thresh;
    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - c.ax;
      const dy = e.clientY - c.ay;
      if (dx * dx + dy * dy >= thresh2) {
        pushUndoPoint();
        drag = { id: c.id, sx: c.sx, sy: c.sy, ox: c.ox, oy: c.oy };
        c.inp.blur();
        cellDragPrep = null;
      }
    };
    const onUp = () => {
      const cur = cellDragPrep;
      if (cur) {
        cur.inp.focus();
        cellDragPrep = null;
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
    window.addEventListener('pointercancel', onUp, { once: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  });

  $effect(() => {
    if (!drag) return;
    const { id, sx, sy, ox, oy } = drag;
    const onMove = (e: PointerEvent) => {
      moveBlock(id, ox + (e.clientX - sx), oy + (e.clientY - sy));
    };
    const onUp = () => {
      const doneId = id;
      drag = null;
      if (canvasEl && doneId) {
        void resolveNonOverlapForBlock(canvasEl, doneId);
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
    window.addEventListener('pointercancel', onUp, { once: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  });

  $effect(() => {
    const onResolve = (e: CustomEvent<{ blockId: string }>) => {
      const id = e.detail?.blockId;
      if (!id || !canvasEl) return;
      void resolveNonOverlapForBlock(canvasEl, id);
    };
    window.addEventListener('leetpad-resolve-overlap', onResolve as EventListener);
    return () => window.removeEventListener('leetpad-resolve-overlap', onResolve as EventListener);
  });

  $effect(() => {
    const openMenu = (e: CustomEvent<{ id: string }>) => {
      const id = e.detail?.id;
      if (!id || !canvasEl) return;
      const el = canvasEl.querySelector(`[data-block-id="${id}"]`);
      const r = el?.getBoundingClientRect();
      if (r) {
        structureMenu = { id, left: r.left + 8, top: r.bottom + 6 };
      } else {
        structureMenu = { id, left: window.innerWidth / 2 - 130, top: 120 };
      }
    };
    window.addEventListener('leetpad-open-structure-menu', openMenu as EventListener);
    return () => window.removeEventListener('leetpad-open-structure-menu', openMenu as EventListener);
  });

  $effect(() => {
    const sm = structureMenu;
    if (!sm) return;
    if (!doc.blocks.some((b) => b.id === sm.id)) structureMenu = null;
  });

  function canvasContentPoint(e: PointerEvent): { x: number; y: number } | null {
    if (!canvasEl) return null;
    const rect = canvasEl.getBoundingClientRect();
    return {
      x: e.clientX - rect.left + canvasEl.scrollLeft,
      y: e.clientY - rect.top + canvasEl.scrollTop,
    };
  }

  function onSurfaceContextMenu(e: MouseEvent) {
    if (!canvasEl) return;
    const t = e.target as HTMLElement;
    if (t.closest('[data-placed-root]')) return;
    e.preventDefault();
    const rect = canvasEl.getBoundingClientRect();
    onEmptyContextMenu({
      x: e.clientX - rect.left + canvasEl.scrollLeft,
      y: e.clientY - rect.top + canvasEl.scrollTop,
    });
  }

  function startDrag(blockId: string, e: PointerEvent) {
    const node = doc.blocks.find((b) => b.id === blockId);
    if (!node) return;
    doc.selectedBlockId = blockId;
    doc.cellLinearFocus = null;
    pushUndoPoint();
    drag = { id: blockId, sx: e.clientX, sy: e.clientY, ox: node.x, oy: node.y };
  }

  function blockIdUnderClientPoint(cx: number, cy: number): string | null {
    if (!canvasEl) return null;
    for (const block of doc.blocks) {
      const el = canvasEl.querySelector(`[data-block-id="${block.id}"]`);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) return block.id;
    }
    return null;
  }

  /** Capture pointer + context menu on the placed root so cells/inputs still participate. */
  function placedRootInteractions(node: HTMLElement, blockId: string) {
    const onCtx = (e: MouseEvent) => {
      const b = doc.blocks.find((x) => x.id === blockId);
      if (!b) return;
      e.preventDefault();
      e.stopPropagation();
      doc.insertAnchor = null;
      doc.selectedBlockId = blockId;
      doc.cellLinearFocus = null;
      structureMenu = { id: blockId, left: e.clientX, top: e.clientY };
    };

    const cap = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const t = e.target as HTMLElement;
      if (t.closest('button')) return;

      const placedNode = doc.blocks.find((x) => x.id === blockId);
      if (!placedNode) return;

      const typ = placedNode.type;
      const cellIn = t.closest('[data-cell-input]') as HTMLInputElement | null;
      if ((typ === 'array' || typ === 'matrix') && cellIn?.tagName === 'INPUT') {
        e.preventDefault();
        cellDragPrep = {
          id: blockId,
          sx: e.clientX,
          sy: e.clientY,
          ox: placedNode.x,
          oy: placedNode.y,
          ax: e.clientX,
          ay: e.clientY,
          inp: cellIn,
        };
        return;
      }

      const ta = t.closest('textarea.paragraph-ta') as HTMLTextAreaElement | null;
      if (ta) {
        if (e.altKey) {
          e.preventDefault();
        } else {
          if (document.activeElement === ta) return;
          if (doc.selectedBlockId !== blockId) return;
          e.preventDefault();
          paraDragPrep = {
            id: blockId,
            sx: e.clientX,
            sy: e.clientY,
            ox: placedNode.x,
            oy: placedNode.y,
            ax: e.clientX,
            ay: e.clientY,
            ta,
          };
          return;
        }
      }
      startDrag(blockId, e);
    };

    node.addEventListener('contextmenu', onCtx, true);
    node.addEventListener('pointerdown', cap, { capture: true });
    return {
      update(id: string) {
        blockId = id;
      },
      destroy() {
        node.removeEventListener('contextmenu', onCtx, true);
        node.removeEventListener('pointerdown', cap, { capture: true });
      },
    };
  }

  function onViewportPointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    const t = e.target as HTMLElement;
    if (t.closest('[data-placed-root]')) return;
    const under = blockIdUnderClientPoint(e.clientX, e.clientY);
    if (under) {
      doc.insertAnchor = null;
      doc.selectedBlockId = under;
      doc.cellLinearFocus = null;
      return;
    }
    clearSelection();
    const p = canvasContentPoint(e);
    if (p) doc.insertAnchor = p;
  }

  function onPlacedPointerDownBubble(b: PlacedBlock, e: PointerEvent) {
    if (e.button !== 0) return;
    doc.insertAnchor = null;
    doc.selectedBlockId = b.id;
    const el = e.target as HTMLElement;
    if (el.closest('[data-cell-input]') || el.closest('textarea.paragraph-ta') || el.closest('button')) return;
    doc.cellLinearFocus = null;
  }

  function onCanvasSelectStart(e: Event) {
    const el = e.target as HTMLElement | null;
    if (!el || !canvasEl?.contains(el)) return;
    if (el.closest('[data-cell-input]') || el.closest('.paragraph-ta')) return;
    e.preventDefault();
  }

  function onCanvasDragStart(e: DragEvent) {
    const t = e.target as HTMLElement;
    if (t.closest('[data-cell-input]') || t.closest('.paragraph-ta')) return;
    if (canvasEl?.contains(e.target as Node)) e.preventDefault();
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="viewport"
  bind:this={canvasEl}
  role="application"
  aria-label="Scratch canvas"
  oncontextmenu={onSurfaceContextMenu}
  onpointerdown={onViewportPointerDown}
  onselectstart={onCanvasSelectStart}
  ondragstart={onCanvasDragStart}
>
  <div class="canvas-surface">
    {#if doc.insertAnchor}
      <div
        class="insert-marker"
        style:left="{doc.insertAnchor.x}px"
        style:top="{doc.insertAnchor.y}px"
        aria-hidden="true"
      ></div>
    {/if}

    {#each doc.blocks as b (b.id)}
      {#if b.type === 'spine'}
        <div
          class="placed spine-placed"
          class:selected={doc.selectedBlockId === b.id}
          style:top="{b.y}px"
          data-placed-root
          data-block-id={b.id}
          role="group"
          use:placedRootInteractions={b.id}
          onpointerdown={(e) => onPlacedPointerDownBubble(b, e)}
        >
          <div class="widget spine-widget" role="group">
            <SpineBlock block={b} />
          </div>
        </div>
      {:else}
        <div
          class="placed"
          class:selected={doc.selectedBlockId === b.id}
          style:left="{b.x}px"
          style:top="{b.y}px"
          data-placed-root
          data-block-id={b.id}
          role="group"
          use:placedRootInteractions={b.id}
          onpointerdown={(e) => onPlacedPointerDownBubble(b, e)}
        >
          <div class="widget" role="group">
            {#if b.type === 'paragraph'}
              <ParagraphBlock block={b} {onSlash} />
            {:else if b.type === 'arrow'}
              <ArrowBlock block={b} />
            {:else if b.type === 'array'}
              <ArrayBlock block={b} />
            {:else if b.type === 'matrix'}
              <MatrixBlock block={b} />
            {/if}
          </div>
        </div>
      {/if}
    {/each}
  </div>

  {#if structureMenu}
    {@const menuState = structureMenu}
    {@const mb = doc.blocks.find((x) => x.id === menuState.id)}
    {#if mb}
      <StructureMenu
        block={mb}
        open={true}
        left={menuState.left}
        top={menuState.top}
        onClose={() => (structureMenu = null)}
        onAutoCreate={onOpenAutoCreate
          ? () => {
              const st = structureMenu;
              if (!st) return;
              const b = doc.blocks.find((x) => x.id === st.id);
              structureMenu = null;
              if (b) onOpenAutoCreate({ x: b.x + 40, y: b.y + 160 });
            }
          : undefined}
      />
    {/if}
  {/if}
</div>

<style>
  .viewport {
    position: relative;
    flex: 1;
    min-height: 0;
    width: 100%;
    margin: 0;
    padding: 0;
    overflow: auto;
    background-color: var(--bg);
    background-image: radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--border) 55%, transparent) 1px, transparent 0);
    background-size: 22px 22px;
    box-sizing: border-box;
    user-select: none;
    -webkit-user-select: none;
  }

  .canvas-surface {
    position: relative;
    min-width: 2800px;
    min-height: 2000px;
    user-select: none;
    -webkit-user-select: none;
  }

  .viewport :global([data-cell-input]),
  .viewport :global(.paragraph-ta) {
    user-select: text;
    -webkit-user-select: text;
  }

  .insert-marker {
    position: absolute;
    z-index: 3;
    width: 14px;
    height: 14px;
    margin-left: -7px;
    margin-top: -7px;
    border-radius: 999px;
    border: 2px solid color-mix(in srgb, var(--accent-b) 72%, transparent);
    background: color-mix(in srgb, var(--accent-b) 22%, var(--surface));
    pointer-events: none;
    box-shadow: 0 0 0 5px color-mix(in srgb, var(--accent-b) 14%, transparent);
    animation: pulse 1.6s ease-in-out infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.08);
      opacity: 0.85;
    }
  }

  .placed {
    position: absolute;
    z-index: 2;
  }

  .placed:not(.spine-placed) {
    width: max-content;
    max-width: min(92vw, 960px);
    /* Let block intrinsic width flow up; % max-width on .widget breaks max-content sizing. */
    min-width: min-content;
    box-sizing: border-box;
    padding: 10px;
    margin: -10px;
  }

  .spine-placed {
    left: 0;
    width: 100%;
    max-width: none;
    padding: 0 20px;
    box-sizing: border-box;
  }

  .placed.selected:not(.spine-placed) {
    outline: 2px solid color-mix(in srgb, var(--accent-b) 55%, transparent);
    outline-offset: 8px;
    border-radius: 18px;
  }

  .spine-placed.selected {
    outline: 2px solid color-mix(in srgb, var(--accent-b) 48%, transparent);
    outline-offset: 3px;
    border-radius: 10px;
  }

  .widget {
    max-width: none;
  }

  .spine-widget {
    max-width: none;
  }
</style>
