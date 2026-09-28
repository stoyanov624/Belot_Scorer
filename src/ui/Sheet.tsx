import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { cx } from './cx';

/**
 * F4: which element opened a given sheet, so focus returns there when the sheet closes. Sheets
 * are sequenced, not stacked (docs/Architecture/Overview.md's "The table"): the second dialog's
 * `showModal()` can run while the first is still open with `data-closing` (its exit animation
 * playing), so the browser records the second dialog's "previously focused element" INSIDE the
 * closing dialog, and focus falls to `<body>` once that second dialog closes rather than to the
 * real opener. Module-level (not per-render) because the whole point is to survive across the
 * two sheets, which are different component instances. Exported for a direct unit test of the
 * bookkeeping: happy-dom's `<dialog>` has no focus/top-layer semantics (no autofocus on
 * `showModal`, no native "previously focused element" restore on `close`), so the full sequence
 * can't be exercised through the rendered `Sheet` alone.
 */
const openers = new WeakMap<HTMLDialogElement, HTMLElement>();

/** Records `dialog`'s opener just before it opens (call right before `showModal()`). */
export function recordOpener(dialog: HTMLDialogElement): void {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return;
  // The active element sits inside a still-closing dialog (a sequenced sheet): that dialog's own
  // opener is the real one to inherit, not the element the browser happens to be focused on now.
  const closingAncestor = active.closest('dialog[data-closing]');
  const inherited =
    closingAncestor instanceof HTMLDialogElement ? openers.get(closingAncestor) : undefined;
  openers.set(dialog, inherited ?? active);
}

/** Restores `dialog`'s recorded opener once its close completes, if focus was otherwise lost. */
export function returnFocus(dialog: HTMLDialogElement): void {
  const active = document.activeElement;
  const closedAncestorDialog = active instanceof HTMLElement ? active.closest('dialog') : null;
  const lost =
    active === null ||
    active === document.body ||
    (closedAncestorDialog instanceof HTMLDialogElement && !closedAncestorDialog.open);
  if (!lost) return;
  const opener = openers.get(dialog);
  if (opener?.isConnected) opener.focus();
}

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Shown under the title, in its column; also describes the dialog (e.g. a hint). */
  subtitle?: ReactNode;
  /** Shown right of the title column, aligned to its top (e.g. the deal sheet's contract pill). */
  aside?: ReactNode;
  children: ReactNode;
}

/**
 * Bottom sheet on the native <dialog>: focus trap, Esc and top layer come from the browser.
 * The caller owns `open`; `onClose` fires only for a user dismissal (Esc, overlay tap) while
 * open. Children stay mounted through the closing animation (F2), so it never plays on an
 * empty shell, and unmount only once the close actually completes.
 */
/**
 * A sheet's closing row of actions. It sticks to the sheet's bottom edge, so the buttons stay
 * visible while a tall sheet scrolls on a short window (ADR 0012). Use it only as the sheet's
 * last child: its negative margins take over the scroll area's bottom padding.
 */
export function SheetActions({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cx(
        'sticky -bottom-[26px] -mx-5 -mb-[26px] bg-s1 px-5 pt-2 pb-[26px] shadow-[0_-10px_14px_-6px_var(--color-s1)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Sheet({ open, onClose, title, subtitle, aside, children }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const subtitleId = useId();
  const hasSubtitle = subtitle !== undefined && subtitle !== null;
  const hasAside = aside !== undefined && aside !== null && aside !== false;

  // F2: children stay mounted through the exit animation. `shown` flips true the instant `open`
  // does (adjust-during-render, the codebase's `wasOpen` pattern — no flash of empty content) and
  // false only once the closing phase actually finishes, in the same place `dialog.close()` runs
  // below (including the reduced-motion fallback and the already-closed-natively path).
  const [shown, setShown] = useState(open);
  const [wasOpen, setWasOpen] = useState(open);
  const shownRef = useRef(shown);
  shownRef.current = shown;
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setShown(true);
  }

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) {
        recordOpener(dialog);
        dialog.showModal();
      }
      dialog.removeAttribute('data-closing');
      return;
    }
    // Esc/backdrop already closed the dialog natively (dialog.open is false by the time this
    // effect runs): nothing to animate, but focus may still have been lost the same way a
    // sequenced programmatic close loses it (F4), so check anyway. Guarded on `shownRef` (not
    // `shown` itself, which this effect must not depend on): the table mounts every sheet closed
    // from the start, so this branch also runs once for each of them on first mount, and an
    // unconditional `setShown(false)` there — a same-value update, since `shown` starts false —
    // was observed to occasionally still surface as a stray extra render for a sheet that was
    // opening in that same batch, clobbering the `shown: true` its own opening had just
    // committed. Skipping the call entirely when content was never shown avoids relying on
    // React's same-value bailout to paper over that.
    if (!dialog.open) {
      if (shownRef.current) {
        returnFocus(dialog);
        setShown(false);
      }
      return;
    }
    // Otherwise the caller closed it (backdrop tap → onClose → caller flips `open`, or any other
    // caller-driven close): play the exit animation, then close.
    dialog.setAttribute('data-closing', '');
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      dialog.removeAttribute('data-closing');
      dialog.close();
      returnFocus(dialog);
      setShown(false);
    };
    const onAnimationEnd = (event: AnimationEvent) => {
      if (event.animationName === 'sheet-out') finish();
    };
    dialog.addEventListener('animationend', onAnimationEnd);
    // Fallback for reduced motion (animation: none, no animationend) and any environment that
    // never fires the event.
    const fallback = setTimeout(finish, 250);
    return () => {
      dialog.removeEventListener('animationend', onAnimationEnd);
      clearTimeout(fallback);
      // Reopened mid-close (this cleanup runs before the effect above re-enters the `open`
      // branch): drop the marker so the dialog doesn't look like it's still closing.
      if (!done) dialog.removeAttribute('data-closing');
    };
  }, [open]);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the click only detects taps on the backdrop; Esc closes natively.
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={hasSubtitle ? subtitleId : undefined}
      onClose={() => {
        // `close` also fires after the caller set `open` to false; only a user close counts.
        if (open) onClose();
      }}
      onClick={(event) => {
        // The `open` guard mirrors the native-close handler above: a backdrop tap that lands
        // during the closing phase (open already false, data-closing playing) must not re-fire
        // onClose.
        if (open && event.target === event.currentTarget) onClose();
      }}
      className="sheet m-0 mx-auto mt-auto w-full max-w-[560px] max-h-[88dvh] overflow-hidden rounded-t-[28px] bg-s1 p-0 text-text"
    >
      <div className="flex max-h-[88dvh] flex-col gap-4 overflow-y-auto px-5 pt-3.5 pb-[26px]">
        <div aria-hidden className="mx-auto h-[5px] w-10 shrink-0 rounded-[3px] bg-line" />
        {/* With an aside, the title stays on one line; when title and aside can't share the
            row (min-content basis), the aside wraps below rather than breaking the title. */}
        <div
          data-sheet-head
          className="flex flex-wrap items-start justify-between gap-x-2 gap-y-2.5"
        >
          <div className="flex min-w-0 grow basis-[min-content] flex-col gap-0.5">
            <h2 id={titleId} className={cx('text-2xl font-black', hasAside && 'whitespace-nowrap')}>
              {title}
            </h2>
            {hasSubtitle && (
              <p id={subtitleId} className="text-sm font-semibold text-pretty text-muted">
                {subtitle}
              </p>
            )}
          </div>
          {aside}
        </div>
        {shown && children}
      </div>
    </dialog>
  );
}
