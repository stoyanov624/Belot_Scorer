import type { RefObject } from 'react';
import type { Declaration, DeclKey, Player, Seat as SeatIndex, Team } from '../../core/model';
import { STRINGS } from '../../core/strings';
import { Chip } from '../../ui/Chip';
import { cx } from '../../ui/cx';
import { Popover } from '../../ui/Popover';
import type { Placement } from '../../ui/popover-position';
import { PlayerAvatar } from '../players/PlayerAvatar';
import { declLabel } from './copy';

/** Grid area per seat: 0 North, 1 East, 2 South, 3 West. */
const AREA = ['n', 'e', 's', 'w'] as const;
/** Popover placement per seat (§4): below North, left of East, above South, right of West. */
const PLACEMENT: Record<SeatIndex, Placement> = { 0: 'below', 1: 'left', 2: 'above', 3: 'right' };
const AVATAR_SIZE = 'clamp(64px,15vw,92px)';
const AVATAR_STYLE = {
  width: AVATAR_SIZE,
  height: AVATAR_SIZE,
  fontSize: 'clamp(32px,7.5vw,46px)',
};

/** A declaration option offered in the popover, with its display points (copy.declOptionPoints). */
export interface DeclOption {
  key: DeclKey;
  label: string;
  points: string;
}

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
  /** Whether this seat's declarations popover is open. */
  declOpen: boolean;
  onCloseDecl: () => void;
  /** Allowed declarations for this seat; empty while `declBlockedMessage` is set. */
  declOptions: readonly DeclOption[];
  declBlockedMessage: string | null;
  onPickDecl: (key: DeclKey) => void;
}

/** A player at the table: avatar button, name, dealer badge, declaration chips and popover. */
export function Seat({
  seat,
  player,
  team,
  isDealer,
  decls,
  onAvatar,
  onRemoveDecl,
  anchorRef,
  declOpen,
  onCloseDecl,
  declOptions,
  declBlockedMessage,
  onPickDecl,
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
        aria-haspopup="dialog"
        aria-expanded={declOpen}
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
      {/* Mounted only while open: keeps closed seats out of the accessibility tree, since the
          native popover UA stylesheet that would otherwise hide them doesn't apply in happy-dom
          (component tests) — see docs/adr/0008. */}
      {declOpen && (
        <Popover
          open={declOpen}
          onClose={onCloseDecl}
          anchor={anchorRef}
          placement={PLACEMENT[seat]}
          label={STRINGS.table.declares(player.name)}
        >
          {declBlockedMessage ? (
            <p className="p-1 text-sm font-bold text-muted">{declBlockedMessage}</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {declOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  aria-label={`${option.label} ${option.points}`}
                  onClick={() => onPickDecl(option.key)}
                  className="flex h-12 flex-col items-center justify-center rounded-2xl bg-s3 transition-transform active:scale-95"
                >
                  <span aria-hidden className="text-[15px] font-extrabold">
                    {option.label}
                  </span>
                  <span
                    aria-hidden
                    className={cx(
                      'text-[11px] font-extrabold',
                      team === 'A' ? 'text-team-a' : 'text-team-b',
                    )}
                  >
                    {option.points}
                  </span>
                </button>
              ))}
            </div>
          )}
        </Popover>
      )}
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
