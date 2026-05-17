<script lang="ts">
  import { tick } from 'svelte';
  import {
    doc,
    setSelectedBlock,
    placeBlockAt,
    createArrayBlock,
    createMatrixBlock,
    removeBlock,
    replaceBlocks,
    undoEditor,
    redoEditor,
    copyStructureById,
    pasteStructureAt,
    structureClipboard,
    newId,
  } from './lib/document.svelte';
  import { undoSketchStroke, redoSketchStroke, clearAllSketches } from './lib/sketches.svelte';
  import { filterCommands, applyCommand, type CommandDef } from './lib/commands';
  import { focusBlockRoot } from './lib/focusRegistry';
  import { isEditingTextField, isInAppModalField } from './lib/focus-util';
  import type { Block } from './lib/types';
  import { parseStructureInput } from './lib/parseStructureInput';
  import ScratchCanvas from './components/ScratchCanvas.svelte';
  import SlashPalette from './components/SlashPalette.svelte';
  import PenRadialMenu from './components/PenRadialMenu.svelte';
  import type { PenColorKey } from './lib/penColor';

  let slashOpen = $state(false);
  let slashFilter = $state('');
  let slashActive = $state(0);

  let insertAt = $state<{ x: number; y: number }>({ x: 80, y: 100 });

  type DimState =
    | { kind: 'array'; x: number; y: number; length: number }
    | { kind: 'matrix'; x: number; y: number; rows: number; cols: number };

  let dim = $state<DimState | null>(null);
  type AutoCreateModal = { x: number; y: number; text: string; error: string };
  let autoCreateModal = $state<AutoCreateModal | null>(null);
  let helpOpen = $state(false);
  let penActive = $state(false);
  let penColorKey = $state<PenColorKey>('ink');
  let dark = $state(typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));

  const slashCommands = $derived(filterCommands(slashFilter));

  const penStrokeColor = $derived(
    penColorKey === 'r'
      ? '#e53935'
      : penColorKey === 'g'
        ? '#43a047'
        : penColorKey === 'b'
          ? '#1e88e5'
          : dark
            ? '#eceff4'
            : '#12141a',
  );

  $effect(() => {
    slashFilter;
    slashActive = 0;
  });

  $effect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.toggleAttribute('data-pen-draw', penActive);
  });

  $effect(() => {
    if (!autoCreateModal) return;
    void tick().then(() => {
      document.getElementById('auto-create-ta')?.focus();
    });
  });

  function openSlash(anchor?: { x: number; y: number }) {
    autoCreateModal = null;
    slashOpen = true;
    slashFilter = '';
    slashActive = 0;
    insertAt = anchor ?? doc.insertAnchor ?? { x: 100, y: 120 };
  }

  function closeSlash() {
    slashOpen = false;
    doc.insertAnchor = null;
  }

  function onCanvasContextInsert(pos: { x: number; y: number }) {
    doc.insertAnchor = pos;
    openSlash(pos);
  }

  async function pickSlash(cmd: CommandDef) {
    if (cmd.id === 'autoCreate') {
      closeSlash();
      autoCreateModal = { x: insertAt.x, y: insertAt.y, text: '', error: '' };
      return;
    }
    if (cmd.needsDimensions) {
      closeSlash();
      autoCreateModal = null;
      if (cmd.id === 'array') {
        dim = { kind: 'array', x: insertAt.x, y: insertAt.y, length: 5 };
      } else {
        dim = { kind: 'matrix', x: insertAt.x, y: insertAt.y, rows: 2, cols: 3 };
      }
      return;
    }

    const anchor = doc.selectedBlockId;
    const placed = applyCommand(cmd, anchor, insertAt);
    closeSlash();
    setSelectedBlock(placed.id, null);
    await tick();
    focusBlockRoot(placed.id);
  }

  function confirmDim() {
    if (!dim) return;
    let bl;
    if (dim.kind === 'array') {
      const n = Math.min(32, Math.max(1, Math.round(dim.length)));
      bl = placeBlockAt(createArrayBlock(n), dim.x, dim.y);
    } else {
      const r = Math.min(16, Math.max(1, Math.round(dim.rows)));
      const c = Math.min(16, Math.max(1, Math.round(dim.cols)));
      bl = placeBlockAt(createMatrixBlock(r, c), dim.x, dim.y);
    }
    dim = null;
    void tick().then(() => {
      setSelectedBlock(bl.id, null);
      focusBlockRoot(bl.id);
    });
  }

  function cancelDim() {
    dim = null;
  }

  function openAutoCreateAt(pos: { x: number; y: number }) {
    slashOpen = false;
    dim = null;
    autoCreateModal = { x: pos.x, y: pos.y, text: '', error: '' };
  }

  function cancelAutoCreate() {
    autoCreateModal = null;
  }

  async function confirmAutoCreate() {
    if (!autoCreateModal) return;
    const parsed = parseStructureInput(autoCreateModal.text);
    if (!parsed.ok) {
      autoCreateModal = { ...autoCreateModal, error: parsed.error };
      return;
    }
    let block: Block;
    if (parsed.kind === 'array') {
      block = { id: newId(), type: 'array', values: parsed.values };
    } else {
      block = { id: newId(), type: 'matrix', rows: parsed.rows };
    }
    const placed = placeBlockAt(block, autoCreateModal.x, autoCreateModal.y);
    autoCreateModal = null;
    setSelectedBlock(placed.id, null);
    await tick();
    focusBlockRoot(placed.id);
  }

  function clearEntireBoard() {
    if (!confirm('Erase the entire canvas? You can undo with Ctrl+Z afterwards.')) return;
    clearAllSketches();
    replaceBlocks([]);
  }

  function toggleTheme() {
    dark = !dark;
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('leetpad-theme', dark ? 'dark' : 'light');
  }

  function closeHelp() {
    helpOpen = false;
  }

  function onPaletteKeydown(e: KeyboardEvent) {
    if (!slashOpen) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      closeSlash();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      slashActive = Math.min(slashActive + 1, Math.max(0, slashCommands.length - 1));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      slashActive = Math.max(slashActive - 1, 0);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = slashCommands[slashActive];
      if (cmd) void pickSlash(cmd);
      return;
    }

    if (e.key === 'Backspace') {
      e.preventDefault();
      slashFilter = slashFilter.slice(0, -1);
      return;
    }

    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      slashFilter += e.key;
    }
  }

  function onGlobalKeydown(e: KeyboardEvent) {
    if (dim && e.key === 'Escape') {
      e.preventDefault();
      cancelDim();
      return;
    }

    if (autoCreateModal && e.key === 'Escape') {
      e.preventDefault();
      cancelAutoCreate();
      return;
    }

    if (helpOpen && e.key === 'Escape') {
      e.preventDefault();
      closeHelp();
      return;
    }

    if (slashOpen) {
      onPaletteKeydown(e);
      return;
    }

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'c' && doc.selectedBlockId && !isEditingTextField()) {
      e.preventDefault();
      copyStructureById(doc.selectedBlockId);
      return;
    }

    if (
      (e.metaKey || e.ctrlKey) &&
      e.key.toLowerCase() === 'v' &&
      !isEditingTextField() &&
      !isInAppModalField() &&
      structureClipboard.snapshot
    ) {
      e.preventDefault();
      const pos = doc.insertAnchor ?? { x: 120, y: 100 };
      const pasted = pasteStructureAt(pos);
      if (pasted) {
        void tick().then(() => {
          setSelectedBlock(pasted.id, null);
          focusBlockRoot(pasted.id);
        });
      }
      return;
    }

    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'z') {
      if (!isEditingTextField() && !isInAppModalField()) {
        e.preventDefault();
        if (penActive) redoSketchStroke();
        else redoEditor();
      }
      return;
    }

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
      if (!isEditingTextField() && !isInAppModalField()) {
        e.preventDefault();
        if (penActive) undoSketchStroke();
        else undoEditor();
      }
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      if (!isEditingTextField() && !isInAppModalField()) {
        e.preventDefault();
        if (penActive) redoSketchStroke();
        else redoEditor();
      }
      return;
    }

    if ((e.key === 'Delete' || e.key === 'Backspace') && doc.selectedBlockId && !isEditingTextField()) {
      e.preventDefault();
      removeBlock(doc.selectedBlockId);
      return;
    }

    if (e.key === 'Escape' && doc.selectedBlockId && !isEditingTextField()) {
      e.preventDefault();
      const id = doc.selectedBlockId;
      const b = doc.blocks.find((x) => x.id === id);
      if (b?.type === 'note' && !String(b.content ?? '').trim()) {
        removeBlock(id);
      } else {
        doc.selectedBlockId = null;
        doc.cellLinearFocus = null;
      }
      return;
    }

    if ((e.metaKey || e.ctrlKey) && e.key === '/') {
      e.preventDefault();
      const host = (document.activeElement as HTMLElement | null)?.closest?.('[data-placed-root]');
      if (host) {
        const id = host.getAttribute('data-block-id');
        if (id) {
          window.dispatchEvent(new CustomEvent('leetpad-open-structure-menu', { detail: { id } }));
          return;
        }
      }
      openSlash();
      return;
    }
  }
</script>

<svelte:window
  oncontextmenu={(e) => {
    if ((e.target as HTMLElement).closest('[data-placed-root]')) return;
    e.preventDefault();
  }}
  onkeydown={onGlobalKeydown}
/>

<main
  class="shell"
  data-editor-shell
  onpointerdown={(e) => {
    const el = e.target as HTMLElement;
    if (el.closest('.viewport')) return;
    doc.insertAnchor = null;
    const id = doc.selectedBlockId;
    if (id) {
      const b = doc.blocks.find((x) => x.id === id);
      if (b?.type === 'note' && !String(b.content ?? '').trim()) {
        removeBlock(id);
      }
    }
  }}
>
  <header class="top">
    <div class="brand">
      <span class="logo" aria-label="LeetPad">
        <span class="log-o">L</span><span class="log-w">eet</span><span class="log-o">P</span><span class="log-w">ad</span>
      </span>
    </div>
    <div class="actions">
      <PenRadialMenu
        {penActive}
        {penColorKey}
        {dark}
        onTogglePen={() => (penActive = !penActive)}
        onPickColor={(k) => (penColorKey = k)}
        onClearSketches={clearAllSketches}
      />
      <button
        type="button"
        class="theme-btn"
        onclick={toggleTheme}
        title={dark ? 'Light mode' : 'Dark mode'}
        aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      >
        {#if dark}
          <span class="theme-icon" aria-hidden="true">☀</span>
        {:else}
          <svg class="theme-moon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path
              fill="none"
              stroke="currentColor"
              stroke-width="2.35"
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
            />
          </svg>
        {/if}
      </button>
      <button type="button" class="ghost" onclick={() => openSlash()} title="Insert (⌘/)">Insert</button>
      <button type="button" class="ghost danger" onclick={clearEntireBoard}>Clear</button>
      <button type="button" class="help-btn" onclick={() => (helpOpen = true)} title="Help" aria-label="Help">?</button>
    </div>
  </header>

  <ScratchCanvas
    {penActive}
    penStrokeColor={penStrokeColor}
    onSlash={() => openSlash()}
    onEmptyContextMenu={onCanvasContextInsert}
    onOpenAutoCreate={openAutoCreateAt}
  />

  <SlashPalette
    open={slashOpen}
    filter={slashFilter}
    commands={slashCommands}
    active={slashActive}
    onClose={closeSlash}
    onPick={(c) => void pickSlash(c)}
    onActiveChange={(i) => (slashActive = i)}
  />

  {#if autoCreateModal}
    <div class="dim-back" role="presentation" onclick={cancelAutoCreate}></div>
    <div
      class="dim-panel paste-panel"
      data-app-modal
      role="dialog"
      aria-modal="true"
      aria-labelledby="auto-create-title"
    >
      <h2 id="auto-create-title" class="dim-h">Auto create</h2>
      <p class="paste-hint">
        Type or paste values in almost any shape: comma-separated tokens, JSON-style lists, or row lists in brackets.
        The board guesses an array or matrix and trims to size limits (32 cells in a row, 16×16 matrices).
      </p>
      <label class="dim-row paste-label" for="auto-create-ta">Input</label>
      <textarea
        id="auto-create-ta"
        class="paste-ta dim-in"
        bind:value={autoCreateModal.text}
        rows="8"
        spellcheck="false"
        placeholder="e.g. a,b,c or 1,3,a,b — or [[1,a], [b,c]] / [1,2,3] / [[1,2],[3,4]]"
        oninput={() => {
          if (autoCreateModal?.error) autoCreateModal = { ...autoCreateModal, error: '' };
        }}
      ></textarea>
      {#if autoCreateModal.error}
        <p class="paste-err" role="alert">{autoCreateModal.error}</p>
      {/if}
      <div class="dim-actions">
        <button type="button" class="ghost" onclick={cancelAutoCreate}>Cancel</button>
        <button type="button" class="primary" onclick={() => void confirmAutoCreate()}>Create</button>
      </div>
    </div>
  {/if}

  {#if dim}
    <div class="dim-back" role="presentation" onclick={cancelDim}></div>
    <div class="dim-panel" data-app-modal role="dialog" aria-modal="true" aria-labelledby="dim-title">
      <h2 id="dim-title" class="dim-h">
        {dim.kind === 'array' ? 'Array size' : 'Matrix size'}
      </h2>
      {#if dim.kind === 'array'}
        <label class="dim-row">
          Length
          <input type="number" min="1" max="32" bind:value={dim.length} class="dim-in" />
        </label>
      {:else}
        <label class="dim-row">
          Rows
          <input type="number" min="1" max="16" bind:value={dim.rows} class="dim-in" />
        </label>
        <label class="dim-row">
          Cols
          <input type="number" min="1" max="16" bind:value={dim.cols} class="dim-in" />
        </label>
      {/if}
      <div class="dim-actions">
        <button type="button" class="ghost" onclick={cancelDim}>Cancel</button>
        <button type="button" class="primary" onclick={confirmDim}>Add</button>
      </div>
    </div>
  {/if}

  {#if helpOpen}
    <div class="dim-back" role="presentation" onclick={closeHelp}></div>
    <div class="help-panel" role="dialog" aria-modal="true" aria-labelledby="help-title">
      <h2 id="help-title" class="dim-h">LeetPad</h2>

      <section class="help-about" aria-labelledby="about-h">
        <h3 id="about-h" class="help-sub">About</h3>
        <p class="help-p">
          LeetPad is a small open-source canvas for sketching arrays, matrices, notes, and flow while you work through
          problems. MIT licensed — contributions welcome on GitHub.
        </p>
        <p class="help-p">
          <a class="help-link" href="https://github.com/edusanketdk/leetpad" target="_blank" rel="noopener noreferrer"
            >github.com/edusanketdk/leetpad</a
          >
        </p>
      </section>

      <h3 class="help-sub">Shortcuts &amp; tips</h3>
      <div class="help-table-wrap">
        <table class="help-table">
          <thead>
            <tr>
              <th scope="col">Topic</th>
              <th scope="col">Details</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Auto create</td>
              <td
                >Open from the insert palette (<kbd>⌘</kbd>/<kbd>Ctrl</kbd>+<kbd>/</kbd>) or from a note / line-break
                structure menu. Auto create is permissive: comma-separated values become a 1D array (for example
                <code class="help-code">a,b,c</code> or <code class="help-code">1,3,a,b</code>); bracket lists work with
                or without strict JSON (for example <code class="help-code">[1,2,3]</code>,
                <code class="help-code">[a,b,c]</code>, <code class="help-code">[[1,a], [b,c]]</code>, or
                <code class="help-code">[[1,2],[3,4]]</code>); multiple lines of row-shaped lines like
                <code class="help-code">[1,2]</code> on one line and <code class="help-code">[3,4]</code> on the next
                merge into a matrix. New widgets are nudged so they do not overlap others.</td
              >
            </tr>
            <tr>
              <td>Insert point</td>
              <td
                >Click empty board for a marker. <kbd>⌘</kbd>/<kbd>Ctrl</kbd>+<kbd>/</kbd> or right-click empty canvas
                uses that point (marker clears when you click elsewhere).</td
              >
            </tr>
            <tr>
              <td>Pen / marks</td>
              <td
                >Click ✎ to turn the pen on (orange). Options open to the left in the bar: pick stroke color, or clear
                all marks. Click ✎ again to turn the pen off. Marks stay on the canvas when the pen is off.</td
              >
            </tr>
            <tr>
              <td>Structure labels</td>
              <td
                >For arrays, matrices, and line breaks: double-click the narrow strip under the widget (about two cell
                widths, centered) to set a short caption. A single click does not focus the label. Notes from the
                canvas do not use this strip.</td
              >
            </tr>
            <tr>
              <td>Copy / paste</td>
              <td><kbd>⌘</kbd>/<kbd>Ctrl</kbd>+<kbd>C</kbd> / <kbd>V</kbd> on a selected structure when not typing in a cell.</td>
            </tr>
            <tr>
              <td>Structure menu</td>
              <td>Right-click a structure, or <kbd>⌘</kbd>/<kbd>Ctrl</kbd>+<kbd>/</kbd> while focus is inside it.</td>
            </tr>
            <tr>
              <td>Note drag</td>
              <td
                >Double-click empty canvas to add a compact note. Select it (click padding), then drag from the text
                area after a small move. While typing, use <kbd>Alt</kbd>+drag or drag the outer padding.</td
              >
            </tr>
            <tr>
              <td>Array / matrix</td>
              <td
                >Click selects the structure; drag from a cell after a small move moves the widget (otherwise you edit
                the cell). Right-click anywhere on a structure for its menu.</td
              >
            </tr>
            <tr>
              <td>Line break</td>
              <td>Full-width horizontal guide across the canvas.</td>
            </tr>
            <tr>
              <td>Move widgets</td>
              <td>Drag from chrome, labels, or non-input areas. Arrays/matrices use compact cells that grow with content.</td>
            </tr>
            <tr>
              <td>Tab</td>
              <td>Indent in a note list, or move between array/matrix cells.</td>
            </tr>
            <tr>
              <td>Lists</td>
              <td>Start a line with <kbd>- </kbd> or <kbd>1. </kbd>; <kbd>Enter</kbd> continues the list.</td>
            </tr>
            <tr>
              <td>Undo / redo</td>
              <td
                >While the pen is on, <kbd>⌘</kbd>/<kbd>Ctrl</kbd>+<kbd>Z</kbd> (and redo shortcuts) apply only to
                freehand marks. With the pen off, those shortcuts undo and redo board edits (structures, moves, …).</td
              >
            </tr>
            <tr>
              <td>Clear</td>
              <td>Header Clear removes every structure and all pen marks (confirm first).</td>
            </tr>
            <tr>
              <td>Delete</td>
              <td><kbd>Delete</kbd> removes the selected widget when not typing in a field.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="dim-actions">
        <button type="button" class="primary" onclick={closeHelp}>Close</button>
      </div>
    </div>
  {/if}
</main>

<style>
  .shell {
    height: 100dvh;
    min-height: 100svh;
    max-height: 100dvh;
    overflow: hidden;
    box-sizing: border-box;
    background: var(--bg);
    color: var(--text);
    display: flex;
    flex-direction: column;
  }

  .top {
    flex: 0 0 auto;
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 14px 22px;
    border-bottom: 1px solid var(--border);
    background: color-mix(in srgb, var(--bg) 88%, transparent);
    backdrop-filter: blur(10px);
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .logo {
    font-family: var(--brand-display);
    font-weight: 800;
    font-size: 22px;
    line-height: 1.15;
    letter-spacing: -0.045em;
    display: inline-flex;
    align-items: baseline;
    padding: 5px 12px 6px;
    border-radius: 11px;
    background: transparent;
  }

  .log-o {
    color: var(--accent-b);
  }

  .log-w {
    color: var(--text-h);
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .ghost {
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text-h);
    font: 600 12px var(--sans);
    padding: 8px 12px;
    border-radius: 10px;
    cursor: pointer;
  }

  .ghost:hover {
    background: var(--surface-2);
  }

  .danger {
    color: var(--accent-r);
    border-color: color-mix(in srgb, var(--accent-r) 35%, var(--border));
  }

  .primary {
    border: none;
    background: var(--accent-b);
    color: #fff;
    font: 600 12px var(--sans);
    padding: 8px 14px;
    border-radius: 10px;
    cursor: pointer;
  }

  .primary:hover {
    filter: brightness(1.05);
  }

  .theme-btn,
  .help-btn {
    width: 38px;
    height: 38px;
    padding: 0;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text-h);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font: 600 15px var(--sans);
    line-height: 1;
  }

  .theme-btn:hover,
  .help-btn:hover {
    background: var(--surface-2);
  }

  .theme-icon {
    font-size: 18px;
    line-height: 1;
    user-select: none;
  }

  .theme-moon {
    display: block;
    transform: rotate(18deg);
  }

  .help-btn {
    font: 700 16px var(--sans);
    color: var(--accent-b);
  }

  .dim-back {
    position: fixed;
    inset: 0;
    z-index: 60;
    background: var(--help-overlay);
  }

  .dim-panel {
    position: fixed;
    z-index: 70;
    left: 50%;
    top: 42%;
    transform: translate(-50%, -50%);
    width: min(360px, calc(100vw - 32px));
    padding: 20px 22px;
    border-radius: 14px;
    border: 1px solid var(--border);
    background: var(--surface);
    box-shadow: var(--shadow);
  }

  .dim-h {
    margin: 0 0 16px;
    font: 600 15px var(--sans);
    color: var(--text-h);
  }

  .dim-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
    font-size: 14px;
    color: var(--text);
  }

  .dim-in {
    width: 96px;
    padding: 8px 10px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text-h);
    font: 600 14px var(--mono);
  }

  .paste-panel {
    width: min(480px, calc(100vw - 28px));
  }

  .paste-hint {
    margin: 0 0 12px;
    font-size: 13px;
    line-height: 1.5;
    color: var(--muted);
  }

  .paste-label {
    display: block;
    margin-bottom: 6px;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-h);
  }

  .paste-ta {
    display: block;
    width: 100%;
    box-sizing: border-box;
    min-height: 140px;
    resize: vertical;
    line-height: 1.45;
  }

  .paste-err {
    margin: 10px 0 0;
    font-size: 13px;
    color: var(--accent-r);
  }

  .dim-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 18px;
  }

  .help-panel {
    position: fixed;
    z-index: 70;
    left: 50%;
    top: 44%;
    transform: translate(-50%, -50%);
    width: min(560px, calc(100vw - 28px));
    max-height: min(78vh, 620px);
    overflow: auto;
    padding: 20px 22px;
    border-radius: 14px;
    border: 1px solid var(--border);
    background: var(--surface);
    box-shadow: var(--shadow);
  }

  .help-about {
    margin-bottom: 18px;
  }

  .help-sub {
    margin: 0 0 8px;
    font: 700 12px var(--sans);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--muted-2);
  }

  .help-p {
    margin: 0 0 10px;
    font-size: 14px;
    line-height: 1.55;
    color: var(--text);
  }

  .help-link {
    color: var(--accent-b);
    font-weight: 600;
    text-decoration: none;
    word-break: break-all;
  }

  .help-link:hover {
    text-decoration: underline;
  }

  .help-table-wrap {
    overflow-x: auto;
    margin-bottom: 8px;
    border-radius: 10px;
    border: 1px solid var(--border);
  }

  .help-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    line-height: 1.45;
    color: var(--text);
  }

  .help-table th,
  .help-table td {
    padding: 10px 12px;
    text-align: left;
    vertical-align: top;
    border-bottom: 1px solid var(--border);
  }

  .help-table th {
    font: 650 11px var(--sans);
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--muted-2);
    background: var(--surface-2);
    width: 28%;
  }

  .help-table tr:last-child td {
    border-bottom: none;
  }

  .help-table kbd {
    font: 600 11px var(--mono);
    padding: 1px 5px;
    border-radius: 5px;
    border: 1px solid var(--border-strong);
    background: var(--surface-3);
    color: var(--text-h);
    white-space: nowrap;
  }

  .help-table .help-code {
    font: 600 11px var(--mono);
    padding: 1px 5px;
    border-radius: 5px;
    background: var(--surface-3);
    color: var(--text-h);
  }
</style>
