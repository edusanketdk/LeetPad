import { tick } from 'svelte';
import { doc } from './document.svelte';

/** Minimum clear space between structure bounding boxes (CSS px). */
export const STRUCTURE_GAP = 12;

const MAX_ITER = 28;

function surfaceEl(canvasEl: HTMLElement): HTMLElement | null {
  return canvasEl.querySelector('.canvas-surface');
}

/** Bounding box of a placed block in canvas-surface coordinates (viewport-stable). */
export function placedBounds(canvasEl: HTMLElement, blockId: string): { x: number; y: number; w: number; h: number } | null {
  const el = canvasEl.querySelector(`[data-block-id="${blockId}"]`) as HTMLElement | null;
  const surface = surfaceEl(canvasEl);
  if (!el || !surface) return null;
  const er = el.getBoundingClientRect();
  const sr = surface.getBoundingClientRect();
  return {
    x: er.left - sr.left,
    y: er.top - sr.top,
    w: er.width,
    h: er.height,
  };
}

function intersects(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
  gap: number,
): boolean {
  return !(
    a.x + a.w + gap <= b.x ||
    b.x + b.w + gap <= a.x ||
    a.y + a.h + gap <= b.y ||
    b.y + b.h + gap <= a.y
  );
}

/**
 * Nudges one block until its box (from live DOM) does not overlap others (spines ignored).
 * Runs after layout updates; call from drag end or after placement.
 */
export async function resolveNonOverlapForBlock(canvasEl: HTMLElement, blockId: string): Promise<void> {
  const me = doc.blocks.find((b) => b.id === blockId);
  if (!me || me.type === 'spine') return;

  for (let iter = 0; iter < MAX_ITER; iter++) {
    await tick();
    const m = placedBounds(canvasEl, blockId);
    if (!m) return;

    let otherId: string | null = null;
    let oBox: { x: number; y: number; w: number; h: number } | null = null;

    for (const o of doc.blocks) {
      if (o.id === blockId || o.type === 'spine') continue;
      const r = placedBounds(canvasEl, o.id);
      if (!r) continue;
      if (!intersects(m, r, STRUCTURE_GAP)) continue;
      otherId = o.id;
      oBox = r;
      break;
    }

    if (!otherId || !oBox) return;

    const overlapX = Math.min(m.x + m.w, oBox.x + oBox.w) - Math.max(m.x, oBox.x);
    const overlapY = Math.min(m.y + m.h, oBox.y + oBox.h) - Math.max(m.y, oBox.y);
    const mx = m.x + m.w / 2;
    const ox = oBox.x + oBox.w / 2;
    const my = m.y + m.h / 2;
    const oy = oBox.y + oBox.h / 2;

    if (overlapX < overlapY) {
      me.x += mx < ox ? -(overlapX + STRUCTURE_GAP) : overlapX + STRUCTURE_GAP;
    } else {
      me.y += my < oy ? -(overlapY + STRUCTURE_GAP) : overlapY + STRUCTURE_GAP;
    }

    me.x = Math.max(0, me.x);
    me.y = Math.max(0, me.y);
  }
}
