import { describe, expect, it } from 'vitest';
import { DEAL_ORDER } from './rules';

describe('DEAL_ORDER', () => {
  it('rotates counter-clockwise N → W → S → E', () => {
    expect(DEAL_ORDER).toEqual([0, 3, 2, 1]);
  });
});
