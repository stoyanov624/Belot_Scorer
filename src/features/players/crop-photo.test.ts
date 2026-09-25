import { describe, expect, it } from 'vitest';
import { squareSource } from './crop-photo';

describe('squareSource', () => {
  it('takes the centred square of a landscape image', () => {
    expect(squareSource(400, 300)).toEqual({ sx: 50, sy: 0, size: 300 });
  });

  it('takes the centred square of a portrait image', () => {
    expect(squareSource(300, 500)).toEqual({ sx: 0, sy: 100, size: 300 });
  });
});
