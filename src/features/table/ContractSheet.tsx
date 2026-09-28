import { type KeyboardEvent, useId, useState } from 'react';
import { type ContractKey, ContractKeySchema, type Seat } from '../../core/model';
import { RED_CONTRACTS, teamOf } from '../../core/rules';
import { STRINGS } from '../../core/strings';
import { useAppStore } from '../../store/instance';
import { Button } from '../../ui/Button';
import { cx } from '../../ui/cx';
import { nextRadioIndex } from '../../ui/radio-nav';
import { Sheet, SheetActions } from '../../ui/Sheet';
import { PlayerAvatar } from '../players/PlayerAvatar';
import { playerAt } from './seat-player';

const S = STRINGS.contract;
const SEATS = [0, 1, 2, 3] as const satisfies readonly Seat[];

export interface ContractSheetProps {
  open: boolean;
  /** `set`: opened from the contract pill, CTA reads "Готово". `toPoints`: opened from
   * "Край на раздаване" with no contract yet, CTA reads "Напред към точките". */
  mode: 'set' | 'toPoints';
  onClose: () => void;
  /** Fires right after `setContract` saves. In `toPoints` mode the table opens the
   * deal-end sheet from here (Task 7). */
  onConfirmed: () => void;
}

/** The "Каква е играта?" sheet: pick the deal's contract and who called it. */
export function ContractSheet({ open, mode, onClose, onConfirmed }: ContractSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title={S.title}>
      <ContractForm mode={mode} onConfirmed={onConfirmed} />
    </Sheet>
  );
}

function ContractForm({
  mode,
  onConfirmed,
}: {
  mode: ContractSheetProps['mode'];
  onConfirmed: () => void;
}) {
  const match = useAppStore((s) => s.match);
  const roster = useAppStore((s) => s.roster);
  const setContract = useAppStore((s) => s.setContract);
  const [picked, setPicked] = useState<ContractKey | null>(match?.contract ?? null);
  const [caller, setCaller] = useState<Seat | null>(match?.caller ?? null);
  const callerLabelId = useId();

  // Not `indexOf`: `picked` is nullable, and the array's element type isn't.
  const tileTabStop = Math.max(
    0,
    // biome-ignore lint/complexity/useIndexOf: see above
    ContractKeySchema.options.findIndex((key) => key === picked),
  );
  const onTileKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = nextRadioIndex(event, index, ContractKeySchema.options.length);
    if (next === null) return;
    event.preventDefault();
    const key = ContractKeySchema.options[next];
    if (key) setPicked(key);
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
      [next]?.focus();
  };

  // Not `indexOf`: `caller` is nullable, and the array's element type isn't.
  const callerTabStop = Math.max(
    0,
    // biome-ignore lint/complexity/useIndexOf: see above
    SEATS.findIndex((seat) => seat === caller),
  );
  const onCallerKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = nextRadioIndex(event, index, SEATS.length);
    if (next === null) return;
    event.preventDefault();
    const seat = SEATS[next];
    if (seat !== undefined) setCaller(seat);
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
      [next]?.focus();
  };

  if (!match) return null;

  const ready = picked !== null && caller !== null;
  const warn = picked === 'nt' && match.current.length > 0;
  const cta = ready ? (mode === 'toPoints' ? S.toPoints : S.done) : S.pick;

  const confirm = () => {
    if (picked === null || caller === null) return;
    setContract(picked, caller);
    onConfirmed();
  };

  return (
    <>
      <div role="radiogroup" aria-label={S.title} className="grid grid-cols-3 gap-2.5">
        {ContractKeySchema.options.map((key, index) => {
          const selected = picked === key;
          return (
            // biome-ignore lint/a11y/useSemanticElements: ARIA radio pattern; native radio inputs can't be styled this way without extra markup
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={index === tileTabStop ? 0 : -1}
              onClick={() => setPicked(key)}
              onKeyDown={(event) => onTileKeyDown(event, index)}
              className={cx(
                'flex h-[78px] flex-col items-center justify-center gap-1 rounded-[18px] border-2 bg-s2 transition-transform active:scale-[0.98]',
                selected ? 'border-team-a' : 'border-transparent',
              )}
            >
              <span
                aria-hidden
                className={cx(
                  'text-[28px] font-black leading-none',
                  RED_CONTRACTS.has(key) && 'text-suit-red',
                )}
              >
                {STRINGS.contracts[key].sym}
              </span>
              <span className="text-[13px] font-extrabold">{STRINGS.contracts[key].label}</span>
            </button>
          );
        })}
      </div>

      <fieldset className="m-0 flex min-w-0 flex-col gap-2.5 border-0 p-0">
        <legend
          id={callerLabelId}
          className="p-0 text-[13px] font-extrabold uppercase tracking-[0.06em] text-muted"
        >
          {S.caller}
        </legend>
        {/* Mockup 06: four columns, the avatar (ringed in its team's colour) above the name. */}
        <div role="radiogroup" aria-labelledby={callerLabelId} className="grid grid-cols-4 gap-2">
          {SEATS.map((seat, index) => {
            const player = playerAt(match, roster, seat);
            const selected = caller === seat;
            return (
              // biome-ignore lint/a11y/useSemanticElements: ARIA radio pattern; native radio inputs can't be styled this way without extra markup
              <button
                key={seat}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={index === callerTabStop ? 0 : -1}
                onClick={() => setCaller(seat)}
                onKeyDown={(event) => onCallerKeyDown(event, index)}
                className={cx(
                  'flex min-w-0 flex-col items-center gap-1.5 rounded-[18px] border-2 bg-s2 px-1 py-2 transition-transform active:scale-[0.98]',
                  selected ? 'border-team-a' : 'border-transparent',
                )}
              >
                <PlayerAvatar
                  player={player}
                  size={44}
                  ring={teamOf(seat) === 'A' ? 'a' : 'b'}
                  decorative
                />
                <span className="max-w-full truncate text-xs font-extrabold">{player.name}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {warn && <p className="text-sm font-bold text-team-b">{S.ntWarning}</p>}

      <SheetActions className="flex flex-col">
        <Button
          variant={ready ? 'primary' : 'muted'}
          size="lg"
          aria-disabled={!ready}
          onClick={confirm}
        >
          {cta}
        </Button>
      </SheetActions>
    </>
  );
}
