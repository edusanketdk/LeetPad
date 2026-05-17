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

function parseBracketJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    if (!/'/.test(raw)) throw new SyntaxError('strict');
    return JSON.parse(raw.replace(/'/g, '"'));
  }
}

/** Non-empty lines: row-shaped lines → one nested bracket list; otherwise join with commas (flat list). */
function normalizeMultiline(raw: string): string {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length <= 1) return raw.trim();
  const allRowLike = lines.every((l) => l.startsWith('[') && l.endsWith(']'));
  if (allRowLike) return `[${lines.join(',')}]`;
  return lines.join(',');
}

/** Split on commas not inside `[` … `]` nesting. Empty tokens preserved (e.g. `1,,2`). */
function splitTopLevelCommas(s: string): string[] {
  const t = s.trim();
  if (!t) return [];
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (c === '[') depth++;
    else if (c === ']') depth = Math.max(0, depth - 1);
    else if (c === ',' && depth === 0) {
      parts.push(t.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(t.slice(start).trim());
  return parts;
}

function stripCellToken(x: string): string {
  let v = x.trim();
  if (v.length >= 2) {
    const q0 = v[0];
    const q1 = v[v.length - 1];
    if ((q0 === '"' && q1 === '"') || (q0 === "'" && q1 === "'")) {
      v = v.slice(1, -1);
    }
  }
  return v;
}

function parseRowSegment(row: string): string[] {
  let r = row.trim();
  if (r.startsWith('[') && r.endsWith(']')) r = r.slice(1, -1).trim();
  const cells = splitTopLevelCommas(r).map(stripCellToken);
  return cells.length > 0 ? cells : [''];
}

function padAndClipMatrix(rowsStr: string[][]): ParseStructureOk {
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

function buildMatrixFromJsonData(data: unknown[][]): ParseStructureOk {
  const rowsStr = data.map((row) => {
    if (!Array.isArray(row)) return [] as string[];
    return (row as unknown[]).map(cellToString);
  });
  return padAndClipMatrix(rowsStr);
}

function buildFlatArrayFromJson(data: unknown[]): ParseStructureOk {
  const flat = data.map(cellToString);
  const clipped = flat.slice(0, MAX_ARRAY);
  return { ok: true, kind: 'array', values: clipped.length > 0 ? clipped : [''] };
}

/** When JSON parses to an array but has mixed nesting like `[1,[2,3]]`, use lenient rules instead of failing. */
function tryParseAsJsonArray(t: string): ParseStructureOk | null {
  let data: unknown;
  try {
    data = parseBracketJson(t);
  } catch {
    return null;
  }
  if (!Array.isArray(data)) return null;
  if (data.length === 0) return { ok: true, kind: 'array', values: [''] };

  const allRowsAreArrays = data.every((x) => Array.isArray(x));
  const someNested = data.some((x) => Array.isArray(x));

  if (allRowsAreArrays) {
    return buildMatrixFromJsonData(data as unknown[][]);
  }
  if (someNested) {
    return null;
  }
  return buildFlatArrayFromJson(data);
}

function parseLenientBracketOrCsv(t: string): ParseStructureOk {
  if (t.startsWith('[') && t.endsWith(']')) {
    const inner = t.slice(1, -1).trim();
    if (inner === '') return { ok: true, kind: 'array', values: [''] };

    const segments = splitTopLevelCommas(inner);
    const allBracketRows =
      segments.length > 0 && segments.every((s) => s.startsWith('[') && s.endsWith(']'));

    if (allBracketRows) {
      const rows = segments.map(parseRowSegment);
      return padAndClipMatrix(rows);
    }

    const cells = segments.map(stripCellToken);
    const clipped = cells.slice(0, MAX_ARRAY);
    return { ok: true, kind: 'array', values: clipped.length > 0 ? clipped : [''] };
  }

  const cells = splitTopLevelCommas(t).map(stripCellToken);
  const clipped = cells.slice(0, MAX_ARRAY);
  return { ok: true, kind: 'array', values: clipped.length > 0 ? clipped : [''] };
}

function stripBomAndFullwidthCommas(s: string): string {
  return s.replace(/^\uFEFF/, '').replace(/\uFF0C/g, ',');
}

/**
 * Infer a 1D array or 2D matrix from free-form text: JSON lists, comma-separated tokens,
 * unquoted identifiers in brackets, and multi-line row lists.
 */
export function parseStructureInput(raw: string): ParseStructureResult {
  const t0 = stripBomAndFullwidthCommas(raw.trim());
  if (!t0) {
    return { ok: false, error: 'Paste or type something to create an array or matrix.' };
  }
  const t = normalizeMultiline(t0);

  // Comma-separated values (no leading `[`) never need JSON — avoids stale bundles / odd JSON edge cases.
  if (!t.trimStart().startsWith('[')) {
    return parseLenientBracketOrCsv(t);
  }

  const fromJson = tryParseAsJsonArray(t);
  if (fromJson) return fromJson;

  return parseLenientBracketOrCsv(t);
}
