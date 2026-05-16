/** True when focus is inside a matrix/array cell or paragraph body (not structure chrome). */
export function isEditingTextField(): boolean {
  const el = document.activeElement;
  if (!(el instanceof HTMLElement)) return false;
  if (el.closest('[data-cell-input]')) return true;
  if (el.matches('textarea.paragraph-ta')) return true;
  return false;
}
