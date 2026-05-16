const MAX_ARRAY = 32;
const MAX_MATRIX_DIM = 16;

function cellToString(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return JSON.stringify(v);
}

export type ParseStructureOk =
  | { ok: true; kind: 'array'; values: string[] }
  | { ok: true; kind: 'matrix'; rows: string[][] };

export type ParseStructureResult = ParseStructureOk | { ok: false; error: string };

/**
 * Parse bracket list text (JSON array syntax) into a 1D array or 2D matrix of string cells.
 * More structure kinds may be added later.
 */
export function parseStructureInput(raw: string): ParseStructureResult {
  const t = raw.trim();
  if (!t) {
    return { ok: false, error: 'Enter a bracket list to infer a structure from.' };
  }

  let data: unknown;
  try {
    data = JSON.parse(t);
  } catch {
    return {
      ok: false,
      error: 'Could not parse. Check brackets, commas, and string quotes.',
    };
  }

  if (!Array.isArray(data)) {
    return { ok: false, error: 'Top level must be a single list [...].' };
  }

  if (data.length === 0) {
    return { ok: true, kind: 'array', values: [''] };
  }

  const allRowsAreArrays = data.every((x) => Array.isArray(x));
  const someNested = data.some((x) => Array.isArray(x));

  if (allRowsAreArrays) {
    const rawRows = data as unknown[][];
    const rowsStr = rawRows.map((row) => {
      if (!Array.isArray(row)) return [] as string[];
      return row.map(cellToString);
    });

    let maxCols = 0;
    for (const r of rowsStr) {
      maxCols = Math.max(maxCols, r.length);
    }
    if (maxCols === 0) {
      const padRows = rowsStr.length > 0 ? rowsStr.map(() => ['']) : [['']];
      const clipped = padRows.slice(0, MAX_MATRIX_DIM).map((r) => r.slice(0, MAX_MATRIX_DIM));
      return { ok: true, kind: 'matrix', rows: clipped };
    }

    const padded = rowsStr.map((r) => {
      const copy = [...r];
      while (copy.length < maxCols) copy.push('');
      return copy.slice(0, MAX_MATRIX_DIM);
    });

    const clippedRows = padded.slice(0, MAX_MATRIX_DIM);
    return { ok: true, kind: 'matrix', rows: clippedRows };
  }

  if (someNested) {
    return {
      ok: false,
      error: 'Use either one flat list or rows of lists, not a mix of both.',
    };
  }

  const flat = (data as unknown[]).map(cellToString);
  const clipped = flat.slice(0, MAX_ARRAY);
  return { ok: true, kind: 'array', values: clipped.length > 0 ? clipped : [''] };
}
