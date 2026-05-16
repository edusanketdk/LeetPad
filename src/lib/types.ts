export type BlockId = string;

export type NoteBlock = {
  id: BlockId;
  type: 'note';
  content: string;
  /** Optional persisted size from auto-grow (px). */
  width?: number;
  height?: number;
};

export type ArrayBlock = {
  id: BlockId;
  type: 'array';
  values: string[];
};

export type MatrixBlock = {
  id: BlockId;
  type: 'matrix';
  rows: string[][];
};

/** Full-width horizontal guide across the board canvas. */
export type SpineBlock = {
  id: BlockId;
  type: 'spine';
};

export type Block = NoteBlock | ArrayBlock | MatrixBlock | SpineBlock;
