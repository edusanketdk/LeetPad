/** Imperative focus targets for keyboard navigation between blocks */
const roots = new Map<string, HTMLElement>();

export function registerBlockRoot(id: string, el: HTMLElement | null) {
  if (el) roots.set(id, el);
  else roots.delete(id);
}

export function focusBlockRoot(id: string) {
  roots.get(id)?.focus();
}
