<script lang="ts">
  import { doc, setSelectedBlock, exitCellFocus, type PlacedBlock } from '../../lib/document.svelte';
  import { registerBlockRoot } from '../../lib/focusRegistry';

  type Props = { block: PlacedBlock & { type: 'note' }; onSlash?: () => void };
  let { block, onSlash }: Props = $props();

  let ta: HTMLTextAreaElement | null = $state(null);

  const minW = 96;
  const minH = 24;

  $effect(() => {
    registerBlockRoot(block.id, ta);
    return () => registerBlockRoot(block.id, null);
  });

  function autosize() {
    if (!ta) return;
    ta.style.width = '1px';
    ta.style.height = '0';
    const w = Math.max(minW, Math.min(920, ta.scrollWidth + 6));
    const h = Math.max(minH, ta.scrollHeight + 4);
    ta.style.width = `${w}px`;
    ta.style.height = `${h}px`;
    block.width = Math.round(w);
    block.height = Math.round(h);
  }

  $effect(() => {
    block.content;
    queueMicrotask(() => autosize());
  });

  const selected = $derived(doc.selectedBlockId === block.id);

  function onfocus() {
    setSelectedBlock(block.id, null);
    exitCellFocus();
  }

  function lineSliceAtCaret(text: string, caret: number) {
    const lineStart = text.lastIndexOf('\n', caret - 1) + 1;
    const nextNl = text.indexOf('\n', caret);
    const lineEnd = nextNl === -1 ? text.length : nextNl;
    return { lineStart, lineEnd, line: text.slice(lineStart, lineEnd) };
  }

  function scrollCaretIfAtEnd(el: HTMLTextAreaElement) {
    if (el.selectionStart === el.value.length && el.selectionEnd === el.value.length) {
      el.scrollTop = el.scrollHeight;
    }
  }

  function onkeydown(e: KeyboardEvent) {
    if (!ta) return;
    const t = ta.value;
    const a = ta.selectionStart;
    const b = ta.selectionEnd;

    if (e.key === '/' && a === 0 && b === 0 && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      onSlash?.();
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const { lineStart, line } = lineSliceAtCaret(t, a);
      if (e.shiftKey) {
        if (line.startsWith('\t')) {
          const newLine = line.slice(1);
          block.content = t.slice(0, lineStart) + newLine + t.slice(lineStart + line.length);
          const delta = a - lineStart >= 1 ? 1 : 0;
          queueMicrotask(() => {
            ta!.selectionStart = ta!.selectionEnd = Math.max(lineStart, a - delta);
          });
        }
      } else {
        block.content = t.slice(0, lineStart) + '\t' + t.slice(lineStart);
        queueMicrotask(() => {
          ta!.selectionStart = ta!.selectionEnd = a + 1;
        });
      }
      return;
    }

    if (e.key === 'Enter') {
      const { lineStart, lineEnd, line } = lineSliceAtCaret(t, a);
      const bullet = /^(\t*)(-\s)(.*)$/.exec(line);
      const numbered = /^(\t*)(\d+)\.\s(.*)$/.exec(line);
      if (bullet) {
        e.preventDefault();
        const prefix = bullet[1] + bullet[2];
        const ins = '\n' + prefix;
        block.content = t.slice(0, a) + ins + t.slice(a);
        queueMicrotask(() => {
          const pos = a + ins.length;
          ta!.selectionStart = ta!.selectionEnd = pos;
          scrollCaretIfAtEnd(ta!);
        });
        return;
      }
      if (numbered) {
        e.preventDefault();
        const n = parseInt(numbered[2], 10) + 1;
        const prefix = numbered[1] + n + '. ';
        const ins = '\n' + prefix;
        block.content = t.slice(0, a) + ins + t.slice(a);
        queueMicrotask(() => {
          const pos = a + ins.length;
          ta!.selectionStart = ta!.selectionEnd = pos;
          scrollCaretIfAtEnd(ta!);
        });
        return;
      }
    }
  }
</script>

<div class="wrap" class:selected>
  <textarea
    bind:this={ta}
    class="ta note-ta"
    bind:value={block.content}
    oninput={(e) => {
      queueMicrotask(() => {
        scrollCaretIfAtEnd(e.currentTarget);
        autosize();
      });
    }}
    onfocus={onfocus}
    onkeydown={onkeydown}
    spellcheck="false"
    rows="1"
    aria-label="Note"
  ></textarea>
</div>

<style>
  .wrap {
    border-radius: 6px;
    border: 1px solid transparent;
    padding: 1px 3px;
    background: transparent;
    transition: border-color 0.15s ease, background 0.15s ease;
    width: fit-content;
    max-width: min(92vw, 960px);
    box-sizing: border-box;
  }

  .wrap:not(:focus-within) .ta {
    user-select: none;
    -webkit-user-select: none;
  }

  .wrap:focus-within .ta {
    user-select: text;
    -webkit-user-select: text;
  }

  .selected {
    background: color-mix(in srgb, var(--surface-2) 35%, transparent);
    backdrop-filter: blur(8px);
  }

  .ta {
    display: block;
    box-sizing: border-box;
    resize: none;
    min-width: 96px;
    min-height: 24px;
    max-width: 920px;
    border: none;
    background: color-mix(in srgb, var(--surface) 16%, transparent);
    color: var(--text-h);
    font: 500 13px/1.45 var(--sans);
    padding: 4px 6px;
    outline: none;
    white-space: pre;
    overflow: hidden;
    overflow-x: hidden;
    overflow-y: hidden;
    tab-size: 8;
    overflow-wrap: normal;
    word-break: normal;
  }

  .selected .ta {
    background: color-mix(in srgb, var(--surface) 26%, transparent);
  }
</style>
