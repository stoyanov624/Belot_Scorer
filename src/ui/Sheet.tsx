import { type ReactNode, useEffect, useId, useRef } from 'react';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/**
 * Bottom sheet on the native <dialog>: focus trap, Esc and top layer come from the browser.
 * The caller owns `open`; `onClose` fires only for a user dismissal (Esc, overlay tap) while
 * open. Children stay mounted while closed.
 */
export function Sheet({ open, onClose, title, children }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the click only detects taps on the backdrop; Esc closes natively.
    <dialog
      ref={ref}
      aria-labelledby={titleId}
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
        <h2 id={titleId} className="text-2xl font-black">
          {title}
        </h2>
        {children}
      </div>
    </dialog>
  );
}
