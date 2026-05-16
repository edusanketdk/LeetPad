/** True when focus is inside a matrix/array cell or note body (not structure chrome). */
export function isEditingTextField(): boolean {
  const el = document.activeElement;
  if (!(el instanceof HTMLElement)) return false;
  if (el.closest('[data-cell-input]')) return true;
  if (el.matches('textarea.note-ta')) return true;
  return false;
}

/** Shell modals (auto-create, dimensions) — structure paste must not steal ⌘V here. */
export function isInAppModalField(): boolean {
  const el = document.activeElement;
  if (!(el instanceof HTMLElement)) return false;
  return Boolean(el.closest('[data-app-modal]'));
}
