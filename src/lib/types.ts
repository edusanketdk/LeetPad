export type BlockId = string;

export type ParagraphBlock = {
  id: BlockId;
  type: 'paragraph';
  content: string;
  /** CSS pixels; persisted for resize */
  width?: number;
  height?: number;
};

export type ArrowBlock = {
  id: BlockId;
  type: 'arrow';
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

/** Full-width horizontal guide across the board canvas (like a section spine). */
export type SpineBlock = {
  id: BlockId;
  type: 'spine';
};

export type Block = ParagraphBlock | ArrowBlock | ArrayBlock | MatrixBlock | SpineBlock;
