import type { Match, Player, Seat } from '../../core/model';
import { STRINGS } from '../../core/strings';

/**
 * The player seated at `seat`, or a placeholder (the seat's Bulgarian name, no avatar) when the
 * roster doesn't have them — e.g. a deleted player still referenced by an old match record.
 */
export function playerAt(
  match: Pick<Match, 'seats'>,
  roster: readonly Player[],
  seat: Seat,
): Pick<Player, 'name' | 'emoji' | 'photo'> {
  return (
    roster.find((p) => p.id === match.seats[seat]) ?? {
      name: STRINGS.seats[seat] ?? '',
      emoji: null,
      photo: null,
    }
  );
}
