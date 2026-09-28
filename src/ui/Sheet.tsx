import { type ReactNode, useEffect, useId, useRef } from 'react';
import { cx } from './cx';

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
 * open. Children stay mounted while closed.
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

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.showModal();
      dialog.removeAttribute('data-closing');
      return;
    }
    // Esc/backdrop already closed the dialog natively (dialog.open is false by the time this
    // effect runs): nothing to animate. Otherwise the caller closed it (backdrop tap → onClose →
    // caller flips `open`, or any other caller-driven close): play the exit animation, then close.
    if (!dialog.open) return;
    dialog.setAttribute('data-closing', '');
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      dialog.removeAttribute('data-closing');
      dialog.close();
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
        if (event.target === event.currentTarget) onClose();
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
        {children}
      </div>
    </dialog>
  );
}
