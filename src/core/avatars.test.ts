import { describe, expect, it } from 'vitest';
import { AVATAR_EMOJI, randomEmoji } from './avatars';

describe('avatars', () => {
  it('has the 30 handoff emojis, all different', () => {
    expect(AVATAR_EMOJI).toHaveLength(30);
    expect(new Set(AVATAR_EMOJI).size).toBe(30);
    expect(AVATAR_EMOJI[0]).toBe('🍺');
    expect(AVATAR_EMOJI[29]).toBe('👑');
  });

  it('picks by the random source', () => {
    expect(randomEmoji(() => 0)).toBe('🍺');
    expect(randomEmoji(() => 0.999999)).toBe('👑');
  });
});
