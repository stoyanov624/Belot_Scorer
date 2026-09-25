import { type ReactNode, type RefObject, useLayoutEffect, useRef } from 'react';
import { type Placement, popoverPosition } from './popover-position';

export interface PopoverProps {
  open: boolean;
  onClose: () => void;
  anchor: RefObject<HTMLElement | null>;
  placement: Placement;
  /** Accessible name, e.g. "Иван обявява". */
  label: string;
  children: ReactNode;
}

/**
 * 224px card next to its anchor on the native popover API (ADR 0008). The caller owns `open`;
 * `onClose` fires only when the user dismisses the card while it is open.
 */
export function Popover({ open, onClose, anchor, placement, label, children }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const card = ref.current;
    const target = anchor.current;
    if (!card) return;
    // happy-dom (component tests) has no Popover API: guard so tests can render open cards.
    const canTogglePopover =
      typeof card.showPopover === 'function' && typeof card.hidePopover === 'function';
    if (!open) {
      if (canTogglePopover && card.matches(':popover-open')) card.hidePopover();
      return;
    }
    if (canTogglePopover && !card.matches(':popover-open')) card.showPopover();
    if (!target) return;
    const { top, left } = popoverPosition(
      target.getBoundingClientRect(),
      { width: card.offsetWidth, height: card.offsetHeight },
      placement,
      { width: window.innerWidth, height: window.innerHeight },
    );
    card.style.top = `${top}px`;
    card.style.left = `${left}px`;
  }, [open, anchor, placement]);

  return (
    <div
      ref={ref}
      popover="auto"
      role="dialog"
      aria-label={label}
      onToggle={(event) => {
        // `toggle` fires asynchronously. Opening another auto popover closes this one, and by
        // then the caller has already moved `open` elsewhere: only a dismissal while open counts.
        if (open && event.newState === 'closed') onClose();
      }}
      className="popover fixed m-0 w-56 rounded-[20px] bg-s2 p-3 text-text shadow-[0_18px_40px_oklch(0.06_0.02_50/0.7)]"
    >
      {children}
    </div>
  );
}
