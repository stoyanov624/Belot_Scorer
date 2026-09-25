import { describe, expect, it } from 'vitest';
import { popoverPosition } from './popover-position';

const viewport = { width: 800, height: 800 };
const size = { width: 224, height: 150 };
const anchor = { top: 100, left: 150, width: 80, height: 80 }; // centre x = 190, centre y = 140

describe('popoverPosition', () => {
  it('centres below the anchor with an 8px gap', () => {
    expect(popoverPosition(anchor, size, 'below', viewport)).toEqual({ top: 188, left: 78 });
  });

  it('centres above the anchor', () => {
    expect(popoverPosition({ ...anchor, top: 300 }, size, 'above', viewport)).toEqual({
      top: 142,
      left: 78,
    });
  });

  it('places right and left of the anchor, vertically centred', () => {
    expect(popoverPosition(anchor, size, 'right', viewport)).toEqual({ top: 65, left: 238 });
    expect(popoverPosition({ ...anchor, left: 300 }, size, 'left', viewport)).toEqual({
      top: 65,
      left: 68,
    });
  });

  it('keeps the card inside the viewport with an 8px margin', () => {
    const narrow = { width: 400, height: 800 };
    expect(popoverPosition({ ...anchor, left: 0 }, size, 'below', narrow).left).toBe(8);
    expect(popoverPosition({ ...anchor, left: 380 }, size, 'below', narrow).left).toBe(
      400 - 224 - 8,
    );
    expect(popoverPosition({ ...anchor, top: 0 }, size, 'above', narrow).top).toBe(8);
  });
});
