import { describe, expect, it } from 'vitest';
import type { Player, Seats } from '../../core/model';
import { STRINGS } from '../../core/strings';
import { playerAt } from './seat-player';

const seats = ['p0', 'p1', 'p2', 'p3'] as unknown as Seats;

const roster: Player[] = [
  { id: 'p0', name: 'Иван', emoji: '🎲', photo: null },
  { id: 'p2', name: 'Мария', emoji: null, photo: 'photo-1' },
];

describe('playerAt', () => {
  it('returns the roster player seated there', () => {
    expect(playerAt({ seats }, roster, 0)).toEqual({
      id: 'p0',
      name: 'Иван',
      emoji: '🎲',
      photo: null,
    });
    expect(playerAt({ seats }, roster, 2)).toEqual({
      id: 'p2',
      name: 'Мария',
      emoji: null,
      photo: 'photo-1',
    });
  });

  it('falls back to the seat name when the seated id has no roster player', () => {
    expect(playerAt({ seats }, roster, 1)).toEqual({
      name: STRINGS.seats[1],
      emoji: null,
      photo: null,
    });
    expect(playerAt({ seats }, roster, 3)).toEqual({
      name: STRINGS.seats[3],
      emoji: null,
      photo: null,
    });
  });
});
