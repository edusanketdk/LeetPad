export type SketchStroke = { id: string; points: { x: number; y: number }[]; color: string };

const MAX_SKETCH_UNDO = 50;

export const sketchStrokes = $state<SketchStroke[]>([]);

const sketchUndoStack = $state<SketchStroke[][]>([]);
const sketchRedoStack = $state<SketchStroke[][]>([]);

function cloneStrokes(): SketchStroke[] {
  return JSON.parse(JSON.stringify(sketchStrokes)) as SketchStroke[];
}

export function appendSketchStroke(stroke: SketchStroke) {
  sketchUndoStack.push(cloneStrokes());
  if (sketchUndoStack.length > MAX_SKETCH_UNDO) sketchUndoStack.shift();
  sketchRedoStack.length = 0;
  sketchStrokes.push(stroke);
}

export function clearAllSketches() {
  sketchUndoStack.length = 0;
  sketchRedoStack.length = 0;
  sketchStrokes.length = 0;
}

export function undoSketchStroke(): boolean {
  if (sketchUndoStack.length === 0) return false;
  sketchRedoStack.push(cloneStrokes());
  const prev = sketchUndoStack.pop()!;
  sketchStrokes.length = 0;
  sketchStrokes.push(...prev);
  return true;
}

export function redoSketchStroke(): boolean {
  if (sketchRedoStack.length === 0) return false;
  sketchUndoStack.push(cloneStrokes());
  const next = sketchRedoStack.pop()!;
  sketchStrokes.length = 0;
  sketchStrokes.push(...next);
  return true;
}
