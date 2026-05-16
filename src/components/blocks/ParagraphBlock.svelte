<script lang="ts">
  import { doc, setSelectedBlock, exitCellFocus, type PlacedBlock } from '../../lib/document.svelte';
  import { registerBlockRoot } from '../../lib/focusRegistry';

  type Props = { block: PlacedBlock & { type: 'paragraph' }; onSlash?: () => void };
  let { block, onSlash }: Props = $props();

  let ta: HTMLTextAreaElement | null = $state(null);

  const defaultW = 268;
  const defaultH = 128;

  $effect(() => {
    registerBlockRoot(block.id, ta);
    return () => registerBlockRoot(block.id, null);
  });

  $effect(() => {
    if (!ta) return;
    const ro = new ResizeObserver(() => {
      if (!ta) return;
      block.width = Math.round(ta.offsetWidth);
      block.height = Math.round(ta.offsetHeight);
    });
    ro.observe(ta);
    return () => ro.disconnect();
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

    if (
      e.key === '/' &&
      a === 0 &&
      b === 0 &&
      !e.metaKey &&
      !e.ctrlKey
    ) {
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
    class="ta paragraph-ta"
    style:width="{block.width ?? defaultW}px"
    style:height="{block.height ?? defaultH}px"
    bind:value={block.content}
    oninput={(e) => queueMicrotask(() => scrollCaretIfAtEnd(e.currentTarget))}
    onfocus={onfocus}
    onkeydown={onkeydown}
    spellcheck="false"
    aria-label="Paragraph"
  ></textarea>
</div>

<style>
  .wrap {
    border-radius: 10px;
    border: 1px solid transparent;
    padding: 12px 14px;
    background: transparent;
    transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
  }

  .selected {
    background: color-mix(in srgb, var(--surface-2) 35%, transparent);
    backdrop-filter: blur(8px);
  }

  .ta {
    display: block;
    box-sizing: border-box;
    resize: both;
    min-width: 176px;
    min-height: 96px;
    max-width: 1200px;
    border: none;
    background: color-mix(in srgb, var(--surface) 18%, transparent);
    color: var(--text-h);
    font: 500 13px/1.55 var(--sans);
    padding: 10px 12px;
    outline: none;
    white-space: pre-wrap;
    tab-size: 8;
    overflow-wrap: break-word;
  }

  .selected .ta {
    background: color-mix(in srgb, var(--surface) 28%, transparent);
  }
</style>
