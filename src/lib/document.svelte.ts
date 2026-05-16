import type { ArrayBlock, Block, BlockId, MatrixBlock, NoteBlock, SpineBlock } from './types';

function uid(): BlockId {
  return crypto.randomUUID();
}

export type PlacedBlock = Block & { x: number; y: number; caption?: string };

const MAX_UNDO = 50;
const undoStack = $state<PlacedBlock[][]>([]);
const redoStack = $state<PlacedBlock[][]>([]);

function cloneBlocks(): PlacedBlock[] {
  return JSON.parse(JSON.stringify(doc.blocks)) as PlacedBlock[];
}

export function pushUndoPoint() {
  undoStack.push(cloneBlocks());
  if (undoStack.length > MAX_UNDO) undoStack.shift();
  redoStack.length = 0;
}

function defaultBlocks(): PlacedBlock[] {
  return [];
}

export const doc = $state({
  blocks: defaultBlocks(),
  selectedBlockId: null as BlockId | null,
  cellLinearFocus: null as number | null,
  /** Last point on empty canvas (content coords); used for insert & paste placement. */
  insertAnchor: null as { x: number; y: number } | null,
});

/** Deep snapshot of one placed block for ⌘C / paste. */
export const structureClipboard = $state<{ snapshot: PlacedBlock | null }>({ snapshot: null });

export function setSelectedBlock(id: BlockId | null, cell: number | null = null) {
  doc.selectedBlockId = id;
  doc.cellLinearFocus = cell;
}

export function exitCellFocus() {
  doc.cellLinearFocus = null;
}

export function clearSelection() {
  doc.selectedBlockId = null;
  doc.cellLinearFocus = null;
}

export function placeBlockAt(block: Block, x: number, y: number): PlacedBlock {
  pushUndoPoint();
  const px = block.type === 'spine' ? 0 : x;
  const placed = { ...block, x: px, y } as PlacedBlock;
  doc.blocks.push(placed);
  doc.insertAnchor = null;
  if (placed.type !== 'spine' && typeof window !== 'undefined') {
    queueMicrotask(() =>
      window.dispatchEvent(new CustomEvent('leetpad-resolve-overlap', { detail: { blockId: placed.id } })),
    );
  }
  return placed;
}

export function copyStructureById(id: BlockId): boolean {
  const b = doc.blocks.find((p) => p.id === id);
  if (!b) return false;
  structureClipboard.snapshot = JSON.parse(JSON.stringify(b)) as PlacedBlock;
  return true;
}

export function pasteStructureAt(pos: { x: number; y: number }): PlacedBlock | null {
  if (!structureClipboard.snapshot) return null;
  const snapshot = JSON.parse(JSON.stringify(structureClipboard.snapshot)) as Record<string, unknown>;
  const { x: _x, y: _y, ...rest } = snapshot;
  const ty = String(rest.type ?? '');
  let next: Block;
  if (ty === 'paragraph') {
    next = { id: uid(), type: 'note', content: String(rest.content ?? '') };
  } else if (ty === 'arrow') {
    next = { id: uid(), type: 'note', content: '' };
  } else {
    next = { ...rest, id: uid() } as Block;
  }
  const px = next.type === 'spine' ? 0 : pos.x;
  return placeBlockAt(next, px, pos.y);
}

export function insertBlockNear(_anchorId: BlockId | null, block: Block, pos: { x: number; y: number }): PlacedBlock {
  return placeBlockAt(block, pos.x, pos.y);
}

export function replaceBlocks(next: PlacedBlock[], skipHistory = false) {
  if (!skipHistory) pushUndoPoint();
  doc.blocks.length = 0;
  doc.blocks.push(...next);
}

export function updateBlock<T extends Block>(id: BlockId, fn: (b: T) => T) {
  const i = doc.blocks.findIndex((b) => b.id === id);
  if (i === -1) return;
  const cur = doc.blocks[i] as T & PlacedBlock;
  const { x, y } = cur;
  const cap = cur.caption;
  const next = fn(cur as T);
  doc.blocks[i] = {
    ...next,
    x,
    y,
    ...(cap !== undefined ? { caption: cap } : {}),
  } as PlacedBlock;
}

export function removeBlock(id: BlockId) {
  const i = doc.blocks.findIndex((b) => b.id === id);
  if (i === -1) return;
  pushUndoPoint();
  doc.blocks.splice(i, 1);
  if (doc.selectedBlockId === id) clearSelection();
}

export function moveBlock(id: BlockId, x: number, y: number) {
  const b = doc.blocks.find((p) => p.id === id);
  if (!b) return;
  if (b.type === 'spine') {
    b.x = 0;
    b.y = Math.max(0, y);
    return;
  }
  b.x = Math.max(0, x);
  b.y = Math.max(0, y);
}

export function undoEditor() {
  if (undoStack.length === 0) return;
  redoStack.push(cloneBlocks());
  const snap = undoStack.pop()!;
  replaceBlocks(snap, true);
  clearSelection();
}

export function redoEditor() {
  if (redoStack.length === 0) return;
  undoStack.push(cloneBlocks());
  const snap = redoStack.pop()!;
  replaceBlocks(snap, true);
  clearSelection();
}

export function newId(): BlockId {
  return uid();
}

export function createArrayBlock(length: number): ArrayBlock {
  const n = Math.min(32, Math.max(1, Math.floor(length)));
  return {
    id: uid(),
    type: 'array',
    values: Array.from({ length: n }, () => ''),
  };
}

export function createMatrixBlock(rows: number, cols: number): MatrixBlock {
  const r = Math.min(16, Math.max(1, Math.floor(rows)));
  const c = Math.min(16, Math.max(1, Math.floor(cols)));
  return {
    id: uid(),
    type: 'matrix',
    rows: Array.from({ length: r }, () => Array.from({ length: c }, () => '')),
  };
}

export function createSpineBlock(): SpineBlock {
  return { id: uid(), type: 'spine' };
}

export function createNoteBlock(): NoteBlock {
  return { id: uid(), type: 'note', content: '' };
}

export function factory(kind: Exclude<Block['type'], 'array' | 'matrix'>): Block {
  const id = uid();
  switch (kind) {
    case 'note':
      return { id, type: 'note', content: '' };
    case 'spine':
      return { id, type: 'spine' };
    default: {
      const _x: never = kind;
      return _x;
    }
  }
}
