export type Placement = 'below' | 'above' | 'right' | 'left';

export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const MARGIN = 8;
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** Top-left of a popover card placed next to `anchor`, kept `MARGIN` inside the viewport. */
export function popoverPosition(
  anchor: Rect,
  size: { width: number; height: number },
  placement: Placement,
  viewport: { width: number; height: number },
  gap = 8,
): { top: number; left: number } {
  const centreX = anchor.left + anchor.width / 2 - size.width / 2;
  const centreY = anchor.top + anchor.height / 2 - size.height / 2;
  const raw = {
    below: { top: anchor.top + anchor.height + gap, left: centreX },
    above: { top: anchor.top - gap - size.height, left: centreX },
    right: { top: centreY, left: anchor.left + anchor.width + gap },
    left: { top: centreY, left: anchor.left - gap - size.width },
  }[placement];
  return {
    top: clamp(raw.top, MARGIN, viewport.height - size.height - MARGIN),
    left: clamp(raw.left, MARGIN, viewport.width - size.width - MARGIN),
  };
}
