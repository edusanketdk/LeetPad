import type { Block } from './types';
import { factory, insertBlockNear, type PlacedBlock } from './document.svelte';

export type CommandId = 'paragraph' | 'arrow' | 'array' | 'matrix' | 'spine' | 'autoCreate';

export type CommandDef = {
  id: CommandId;
  title: string;
  keywords: string[];
  run: () => Block;
  needsDimensions?: boolean;
};

export const COMMANDS: CommandDef[] = [
  {
    id: 'autoCreate',
    title: 'Auto create',
    keywords: ['auto', 'import', 'infer', 'input', 'build', 'from'],
    run: () => factory('paragraph'),
  },
  {
    id: 'paragraph',
    title: 'Paragraph',
    keywords: ['text', 'p'],
    run: () => factory('paragraph'),
  },
  {
    id: 'arrow',
    title: 'Step arrow',
    keywords: ['arrow', 'flow', 'step'],
    run: () => factory('arrow'),
  },
  {
    id: 'spine',
    title: 'Section spine',
    keywords: ['divider', 'sep', 'hr', 'line', 'break', 'rule'],
    run: () => factory('spine'),
  },
  {
    id: 'array',
    title: 'Array',
    keywords: ['arr', '1d'],
    run: () => factory('paragraph'),
    needsDimensions: true,
  },
  {
    id: 'matrix',
    title: 'Matrix',
    keywords: ['grid', '2d', 'table'],
    run: () => factory('paragraph'),
    needsDimensions: true,
  },
];

export function filterCommands(query: string): CommandDef[] {
  const q = query.trim().toLowerCase();
  if (!q) return COMMANDS;
  return COMMANDS.filter(
    (c) =>
      c.title.toLowerCase().includes(q) ||
      c.keywords.some((k) => k.includes(q)) ||
      c.id.includes(q),
  );
}

export function applyCommand(
  cmd: CommandDef,
  anchorId: string | null,
  pos: { x: number; y: number },
): PlacedBlock {
  if (cmd.id === 'autoCreate') {
    throw new Error('Auto create is handled in the shell; it does not insert via applyCommand.');
  }
  if (cmd.needsDimensions) {
    throw new Error('array/matrix use dimension modal');
  }
  const block = cmd.run();
  return insertBlockNear(anchorId, block, pos);
}
