import type { KeyboardEvent } from 'react';

const STEP: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/**
 * ARIA radiogroup roving-tabindex arrow-key math, shared by the app's hand-rolled `role="radio"`
 * groups (Segmented has its own copy — see its file for why). Given the pressed key, the focused
 * option's index and the option count, returns the next index, wrapping at the ends; `null` when
 * the key isn't a relevant arrow, or a modifier is held (so browser/OS shortcuts on a modified
 * arrow still work, unlike Segmented — docs/Backlog.md).
 *
 * Callers only call `event.preventDefault()` once they get a non-null result, so an unhandled or
 * modified key never blocks the page from scrolling.
 */
export function nextRadioIndex(
  event: Pick<KeyboardEvent, 'key' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'>,
  index: number,
  count: number,
): number | null {
  if (count <= 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return null;
  const step = STEP[event.key];
  if (step === undefined) return null;
  return (index + step + count) % count;
}
