<script lang="ts">
  import { tick } from 'svelte';
  import {
    doc,
    moveBlock,
    pushUndoPoint,
    clearSelection,
    placeBlockAt,
    createNoteBlock,
    removeBlock,
    type PlacedBlock,
  } from '../lib/document.svelte';
  import {
    sketchStrokes,
    appendSketchStroke,
    clearAllSketches,
  } from '../lib/sketches.svelte';
  import { resolveNonOverlapForBlock } from '../lib/layoutResolve';
  import NoteBlock from './blocks/NoteBlock.svelte';
  import ArrayBlock from './blocks/ArrayBlock.svelte';
  import MatrixBlock from './blocks/MatrixBlock.svelte';
  import SpineBlock from './blocks/SpineBlock.svelte';
  import StructureMenu from './StructureMenu.svelte';
  import { focusBlockRoot } from '../lib/focusRegistry';

  type Props = {
    penActive?: boolean;
    penStrokeColor?: string;
    onSlash?: () => void;
    onEmptyContextMenu: (pos: { x: number; y: number }) => void;
    onOpenAutoCreate?: (pos: { x: number; y: number }) => void;
  };

  let {
    penActive = false,
    penStrokeColor = '#12141a',
    onSlash,
    onEmptyContextMenu,
    onOpenAutoCreate,
  }: Props = $props();

  let canvasEl: HTMLDivElement | null = $state(null);

  let structureMenu = $state<{ id: string; left: number; top: number } | null>(null);

  let drag = $state<{
    id: string;
    sx: number;
    sy: number;
    ox: number;
    oy: number;
  } | null>(null);

  let noteDragPrep = $state<{
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

  let sketchLive = $state<{ points: { x: number; y: number }[]; color: string } | null>(null);

  let captionEditingId = $state<string | null>(null);
  let captionDraft = $state('');

  $effect(() => {
    const onClear = () => {
      clearAllSketches();
      sketchLive = null;
    };
    window.addEventListener('leetpad-clear-sketches', onClear);
    return () => window.removeEventListener('leetpad-clear-sketches', onClear);
  });

  $effect(() => {
    if (!penActive) sketchLive = null;
  });

  $effect(() => {
    const p = noteDragPrep;
    if (!p) return;
    const thresh = 6;
    const thresh2 = thresh * thresh;
    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - p.ax;
      const dy = e.clientY - p.ay;
      if (dx * dx + dy * dy >= thresh2) {
        pushUndoPoint();
        drag = { id: p.id, sx: p.sx, sy: p.sy, ox: p.ox, oy: p.oy };
        noteDragPrep = null;
      }
    };
    const onUp = () => {
      const cur = noteDragPrep;
      if (cur) {
        cur.ta.focus();
        noteDragPrep = null;
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
    void penActive;
    const openMenu = (e: CustomEvent<{ id: string }>) => {
      if (penActive) return;
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

  function canvasPointFromClient(clientX: number, clientY: number): { x: number; y: number } | null {
    if (!canvasEl) return null;
    const rect = canvasEl.getBoundingClientRect();
    return {
      x: clientX - rect.left + canvasEl.scrollLeft,
      y: clientY - rect.top + canvasEl.scrollTop,
    };
  }

  function surfacePoint(clientX: number, clientY: number): { x: number; y: number } | null {
    const surface = canvasEl?.querySelector('.canvas-surface') as HTMLElement | null;
    if (!surface) return null;
    const sr = surface.getBoundingClientRect();
    return { x: clientX - sr.left, y: clientY - sr.top };
  }

  function onSurfaceContextMenu(e: MouseEvent) {
    if (penActive) {
      e.preventDefault();
      return;
    }
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
    if (penActive) return;
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

  function placedRootInteractions(node: HTMLElement, blockId: string) {
    const onCtx = (e: MouseEvent) => {
      if (penActive) return;
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
      if (penActive) return;
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

      const ta = t.closest('textarea.note-ta') as HTMLTextAreaElement | null;
      if (ta) {
        if (e.altKey) {
          e.preventDefault();
        } else {
          if (document.activeElement === ta) return;
          if (doc.selectedBlockId !== blockId) return;
          e.preventDefault();
          noteDragPrep = {
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

  function pruneEmptyNoteIfAny(id: string | null) {
    if (!id) return;
    const b = doc.blocks.find((x) => x.id === id);
    if (b?.type === 'note' && !String(b.content ?? '').trim()) {
      removeBlock(id);
    }
  }

  function onViewportPointerDown(e: PointerEvent) {
    if (penActive) return;
    if (e.button !== 0) return;
    const t = e.target as HTMLElement;
    if (t.closest('[data-placed-root]')) return;
    const under = blockIdUnderClientPoint(e.clientX, e.clientY);
    if (under) {
      doc.insertAnchor = null;
      if (doc.selectedBlockId !== under) {
        pruneEmptyNoteIfAny(doc.selectedBlockId);
      }
      doc.selectedBlockId = under;
      doc.cellLinearFocus = null;
      return;
    }
    pruneEmptyNoteIfAny(doc.selectedBlockId);
    clearSelection();
    const p = canvasContentPoint(e);
    if (p) doc.insertAnchor = p;
  }

  function onViewportDblClick(e: MouseEvent) {
    if (penActive) return;
    const t = e.target as HTMLElement;
    if (t.closest('[data-placed-root]')) return;
    if (t.closest('[data-caption-strip]')) return;
    const p = canvasPointFromClient(e.clientX, e.clientY);
    if (!p) return;
    e.preventDefault();
    const placed = placeBlockAt(createNoteBlock(), p.x - 4, p.y - 4);
    doc.selectedBlockId = placed.id;
    void tick().then(() => focusBlockRoot(placed.id));
  }

  function onPlacedPointerDownBubble(b: PlacedBlock, e: PointerEvent) {
    if (penActive) return;
    if (e.button !== 0) return;
    doc.insertAnchor = null;
    if (doc.selectedBlockId && doc.selectedBlockId !== b.id) {
      pruneEmptyNoteIfAny(doc.selectedBlockId);
    }
    doc.selectedBlockId = b.id;
    const el = e.target as HTMLElement;
    if (el.closest('[data-cell-input]') || el.closest('textarea.note-ta') || el.closest('button')) return;
    doc.cellLinearFocus = null;
  }

  function onCanvasSelectStart(e: Event) {
    const el = e.target as HTMLElement | null;
    if (!el || !canvasEl?.contains(el)) return;
    if (el.closest('[data-cell-input]')) return;
    if (el.closest('.note-ta')) {
      if (document.activeElement !== el) e.preventDefault();
      return;
    }
    e.preventDefault();
  }

  function onCanvasDragStart(e: DragEvent) {
    const t = e.target as HTMLElement;
    if (t.closest('[data-cell-input]') || t.closest('.note-ta')) return;
    if (canvasEl?.contains(e.target as Node)) e.preventDefault();
  }

  async function startCaptionEdit(b: PlacedBlock) {
    captionEditingId = b.id;
    captionDraft = b.caption ?? '';
    await tick();
    const inp = canvasEl?.querySelector(
      `[data-block-id="${b.id}"] [data-caption-editor]`,
    ) as HTMLInputElement | null;
    inp?.focus();
    inp?.select();
  }

  function commitCaption(b: PlacedBlock) {
    const v = captionDraft.trim();
    b.caption = v.length > 0 ? v : undefined;
    captionEditingId = null;
    captionDraft = '';
  }

  function polyPoints(pts: { x: number; y: number }[]): string {
    return pts.map((p) => `${p.x},${p.y}`).join(' ');
  }

  function onPenDown(e: PointerEvent) {
    if (e.button !== 0) return;
    const p = surfacePoint(e.clientX, e.clientY);
    if (!p) return;
    sketchLive = { points: [p], color: penStrokeColor };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPenMove(e: PointerEvent) {
    if (!sketchLive || (e.buttons & 1) === 0) return;
    const p = surfacePoint(e.clientX, e.clientY);
    if (!p) return;
    const last = sketchLive.points.at(-1);
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 1.2) {
      sketchLive = { points: [...sketchLive.points, p], color: sketchLive.color };
    }
  }

  function onPenUp(e: PointerEvent) {
    if (!sketchLive || sketchLive.points.length === 0) {
      sketchLive = null;
      return;
    }
    if (sketchLive.points.length === 1) {
      appendSketchStroke({
        id: crypto.randomUUID(),
        points: [sketchLive.points[0], sketchLive.points[0]],
        color: sketchLive.color,
      });
    } else {
      appendSketchStroke({
        id: crypto.randomUUID(),
        points: sketchLive.points,
        color: sketchLive.color,
      });
    }
    sketchLive = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
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
  ondblclick={onViewportDblClick}
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
          <div class="placed-stack spine-stack">
            <div class="widget spine-widget" role="group">
              <SpineBlock block={b} />
            </div>
            <div class="caption-wrap caption-tight caption-tight--cells" data-caption-strip>
              {#if captionEditingId === b.id}
                <input
                  class="cap-input"
                  data-caption-editor
                  bind:value={captionDraft}
                  maxlength="80"
                  onblur={() => commitCaption(b)}
                  onkeydown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Escape') {
                      e.preventDefault();
                      (e.currentTarget as HTMLInputElement).blur();
                    }
                  }}
                />
              {:else}
                <button
                  type="button"
                  class="cap-hit"
                  class:cap-hit--populated={Boolean(b.caption?.trim())}
                  tabindex="-1"
                  title="Double-click to add or edit label"
                  aria-label={b.caption?.trim() ? 'Edit structure label' : 'Add structure label'}
                  onmousedown={(e) => e.preventDefault()}
                  ondblclick={(e) => {
                    e.stopPropagation();
                    void startCaptionEdit(b);
                  }}
                >
                  {b.caption?.trim() ?? ''}
                </button>
              {/if}
            </div>
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
          {#if b.type === 'note'}
            <div class="widget" role="group">
              <NoteBlock block={b} {onSlash} />
            </div>
          {:else}
            <div class="placed-stack">
              <div class="widget" role="group">
                {#if b.type === 'array'}
                  <ArrayBlock block={b} />
                {:else if b.type === 'matrix'}
                  <MatrixBlock block={b} />
                {/if}
              </div>
              <div class="caption-wrap caption-tight caption-tight--cells" data-caption-strip>
                {#if captionEditingId === b.id}
                  <input
                    class="cap-input"
                    data-caption-editor
                    bind:value={captionDraft}
                    maxlength="80"
                    onblur={() => commitCaption(b)}
                    onkeydown={(e) => {
                      if (e.key === 'Enter' || e.key === 'Escape') {
                        e.preventDefault();
                        (e.currentTarget as HTMLInputElement).blur();
                      }
                    }}
                  />
                {:else}
                  <button
                    type="button"
                    class="cap-hit"
                    class:cap-hit--populated={Boolean(b.caption?.trim())}
                    tabindex="-1"
                    title="Double-click to add or edit label"
                    aria-label={b.caption?.trim() ? 'Edit structure label' : 'Add structure label'}
                    onmousedown={(e) => e.preventDefault()}
                    ondblclick={(e) => {
                      e.stopPropagation();
                      void startCaptionEdit(b);
                    }}
                  >
                    {b.caption?.trim() ?? ''}
                  </button>
                {/if}
              </div>
            </div>
          {/if}
        </div>
      {/if}
    {/each}

    <div class="sketch-display" aria-hidden="true">
      <svg class="sketch-svg">
        {#each sketchStrokes as s (s.id)}
          <polyline
            class="pen-line"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke={s.color}
            points={polyPoints(s.points)}
          />
        {/each}
        {#if sketchLive && sketchLive.points.length > 0}
          <polyline
            class="pen-line live"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke={sketchLive.color}
            points={polyPoints(sketchLive.points)}
          />
        {/if}
      </svg>
    </div>

    {#if penActive}
      <div
        class="pen-capture"
        role="presentation"
        aria-hidden="true"
        onpointerdown={onPenDown}
        onpointermove={onPenMove}
        onpointerup={onPenUp}
        onpointercancel={onPenUp}
      ></div>
    {/if}
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
              const bl = doc.blocks.find((x) => x.id === st.id);
              structureMenu = null;
              if (bl) onOpenAutoCreate({ x: bl.x + 40, y: bl.y + 160 });
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
    background-image: radial-gradient(circle at 1px 1px, var(--canvas-dot) 1px, transparent 0);
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
  .viewport :global(.note-ta) {
    user-select: text;
    -webkit-user-select: text;
  }

  .sketch-display {
    position: absolute;
    inset: 0;
    z-index: 10;
    pointer-events: none;
  }

  .sketch-svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .pen-capture {
    position: absolute;
    inset: 0;
    z-index: 20;
    touch-action: none;
    cursor: crosshair;
    background: transparent;
  }

  .pen-line {
    stroke-width: 2.5;
    vector-effect: non-scaling-stroke;
  }

  .pen-line.live {
    opacity: 0.92;
  }

  .placed-stack {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    width: fit-content;
    max-width: 100%;
    gap: 2px;
  }

  .spine-stack {
    width: 100%;
    max-width: none;
  }

  .caption-wrap {
    max-width: 100%;
    text-align: center;
  }

  .caption-tight {
    margin-top: 0;
  }

  .caption-tight--cells {
    align-self: center;
    flex-shrink: 0;
    width: calc(2 * 56px + 12px);
    max-width: 100%;
    box-sizing: border-box;
  }

  .spine-stack .caption-tight--cells {
    margin-left: auto;
    margin-right: auto;
  }

  .cap-hit {
    display: block;
    width: 100%;
    max-width: 100%;
    border: none;
    background: transparent;
    font: 600 11px var(--mono);
    color: var(--muted);
    min-height: 10px;
    padding: 1px 4px 0;
    cursor: default;
    border-radius: 4px;
    box-sizing: border-box;
  }

  .cap-hit:focus {
    outline: none;
  }

  .cap-hit:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--accent-b) 55%, transparent);
    outline-offset: 1px;
  }

  .cap-hit:not(.cap-hit--populated) {
    opacity: 0;
    pointer-events: auto;
  }

  .cap-hit.cap-hit--populated {
    color: var(--muted);
  }

  .cap-hit.cap-hit--populated:hover {
    color: var(--text-h);
    background: color-mix(in srgb, var(--surface-2) 50%, transparent);
  }

  .placed.selected .cap-hit:not(.cap-hit--populated):hover {
    opacity: 0.5;
    color: var(--muted);
    background: color-mix(in srgb, var(--surface-2) 48%, transparent);
  }

  .cap-input {
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    font: 600 11px var(--mono);
    text-align: center;
    padding: 2px 4px;
    border-radius: 6px;
    border: 1px solid var(--border-strong);
    background: var(--surface);
    color: var(--text-h);
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
