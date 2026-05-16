import type { Block } from './types';
import { factory, insertBlockNear, type PlacedBlock } from './document.svelte';

export type CommandId = 'array' | 'matrix' | 'lineBreak' | 'autoCreate' | 'text';

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
    run: () => factory('note'),
  },
  {
    id: 'text',
    title: 'Text',
    keywords: ['note', 'txt', 'write', 'label'],
    run: () => factory('note'),
  },
  {
    id: 'lineBreak',
    title: 'Line break',
    keywords: ['divider', 'sep', 'hr', 'line', 'break', 'rule', 'spine'],
    run: () => factory('spine'),
  },
  {
    id: 'array',
    title: 'Array',
    keywords: ['arr', '1d'],
    run: () => factory('note'),
    needsDimensions: true,
  },
  {
    id: 'matrix',
    title: 'Matrix',
    keywords: ['grid', '2d', 'table'],
    run: () => factory('note'),
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
