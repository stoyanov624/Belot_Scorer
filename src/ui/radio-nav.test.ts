import { describe, expect, it } from 'vitest';
import { nextRadioIndex } from './radio-nav';

/** A minimal stand-in for the KeyboardEvent fields `nextRadioIndex` reads. */
function key(
  k: string,
  modifiers: Partial<Record<'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey', boolean>> = {},
) {
  return {
    key: k,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    ...modifiers,
  };
}

describe('nextRadioIndex', () => {
  it('steps right/down by +1 and left/up by -1', () => {
    expect(nextRadioIndex(key('ArrowRight'), 1, 4)).toBe(2);
    expect(nextRadioIndex(key('ArrowDown'), 1, 4)).toBe(2);
    expect(nextRadioIndex(key('ArrowLeft'), 1, 4)).toBe(0);
    expect(nextRadioIndex(key('ArrowUp'), 1, 4)).toBe(0);
  });

  it('wraps at both ends', () => {
    expect(nextRadioIndex(key('ArrowRight'), 3, 4)).toBe(0);
    expect(nextRadioIndex(key('ArrowLeft'), 0, 4)).toBe(3);
  });

  it('returns null for an unrelated key', () => {
    expect(nextRadioIndex(key('Enter'), 1, 4)).toBeNull();
    expect(nextRadioIndex(key(' '), 1, 4)).toBeNull();
  });

  it('returns null when a modifier is held, even for an arrow key', () => {
    expect(nextRadioIndex(key('ArrowRight', { metaKey: true }), 1, 4)).toBeNull();
    expect(nextRadioIndex(key('ArrowRight', { ctrlKey: true }), 1, 4)).toBeNull();
    expect(nextRadioIndex(key('ArrowRight', { altKey: true }), 1, 4)).toBeNull();
    expect(nextRadioIndex(key('ArrowRight', { shiftKey: true }), 1, 4)).toBeNull();
  });

  it('returns null for an empty group', () => {
    expect(nextRadioIndex(key('ArrowRight'), 0, 0)).toBeNull();
  });
});
