import type { RefObject } from 'react';
import type { Declaration, Player, Seat as SeatIndex, Team } from '../../core/model';
import { STRINGS } from '../../core/strings';
import { Chip } from '../../ui/Chip';
import { cx } from '../../ui/cx';
import { PlayerAvatar } from '../players/PlayerAvatar';
import { declLabel } from './copy';

/** Grid area per seat: 0 North, 1 East, 2 South, 3 West. */
const AREA = ['n', 'e', 's', 'w'] as const;
const AVATAR_SIZE = 'clamp(64px,15vw,92px)';
const AVATAR_STYLE = {
  width: AVATAR_SIZE,
  height: AVATAR_SIZE,
  fontSize: 'clamp(32px,7.5vw,46px)',
};

export interface SeatProps {
  seat: SeatIndex;
  player: Pick<Player, 'name' | 'emoji' | 'photo'>;
  team: Team;
  isDealer: boolean;
  /** The current deal's declarations for this seat. */
  decls: readonly Declaration[];
  onAvatar: () => void;
  onRemoveDecl: (id: string) => void;
  /** The avatar button, where the declarations popover anchors. */
  anchorRef: RefObject<HTMLButtonElement | null>;
}

/** A player at the table: avatar button, name, dealer badge and declaration chips. */
export function Seat({
  seat,
  player,
  team,
  isDealer,
  decls,
  onAvatar,
  onRemoveDecl,
  anchorRef,
}: SeatProps) {
  const vertical = seat % 2 === 0;
  return (
    <section
      aria-label={STRINGS.seats[seat]}
      style={{ gridArea: AREA[seat] }}
      className={cx(
        'flex max-w-full items-center gap-1.5',
        // South sits below the felt, so its avatar goes to the bottom, nearest the player.
        seat === 2 ? 'flex-col-reverse' : 'flex-col',
      )}
    >
      <button
        ref={anchorRef}
        type="button"
        aria-label={player.name}
        onClick={onAvatar}
        className="rounded-full transition-transform active:scale-95"
      >
        <PlayerAvatar
          player={player}
          size={92}
          ring={team === 'A' ? 'a' : 'b'}
          decorative
          style={AVATAR_STYLE}
        />
      </button>
      <p
        className={cx(
          'truncate text-center text-[15px] font-extrabold',
          vertical ? 'max-w-[120px]' : 'max-w-[110px]',
        )}
      >
        {player.name}
      </p>
      {isDealer && (
        <p className="rounded-lg bg-s3 px-2 py-0.5 text-[11px] font-extrabold text-muted">
          {STRINGS.table.dealer}
        </p>
      )}
      {decls.length > 0 && (
        <ul
          className={cx(
            'flex flex-wrap justify-center gap-1',
            vertical ? 'max-w-[200px]' : 'max-w-[120px]',
          )}
        >
          {decls.map((d) => {
            const label = declLabel(d);
            return (
              <li key={d.id}>
                <Chip
                  size="sm"
                  tone={team === 'A' ? 'a' : 'b'}
                  aria-label={STRINGS.table.removeDecl(label)}
                  onClick={() => onRemoveDecl(d.id)}
                >
                  {label}
                  <span aria-hidden className="opacity-70">
                    ×
                  </span>
                </Chip>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
