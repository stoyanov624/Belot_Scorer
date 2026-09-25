import { useState } from 'react';
import type { Declaration } from '../../core/model';
import { type Resolution, resolve } from '../../core/resolve';
import { isSequence, KARE_RANKS, type RulesConfig, teamOf, validTops } from '../../core/rules';
import { STRINGS } from '../../core/strings';
import { useAppStore } from '../../store/instance';
import { Button } from '../../ui/Button';
import { Chip } from '../../ui/Chip';
import { cx } from '../../ui/cx';
import { Sheet } from '../../ui/Sheet';
import { resolutionCardLabel, resolutionErrors, resolutionLines, teamNameOf } from './copy';
import { playerAt } from './seat-player';

const S = STRINGS.deal;

type Step = 'decls' | 'points';

export interface DealEndSheetProps {
  open: boolean;
  onClose: () => void;
  /** Step 2's contract pill: change the contract (Task 8). */
  onChangeContract: () => void;
  /** Fires after the deal is saved; `ended` when that save ended the match (Task 8). */
  onSaved: (ended: boolean) => void;
}

/** Needs step 1: the deal has a sequence or a four of a kind to resolve. */
const needsResolving = (d: Pick<Declaration, 'key'>) => isSequence(d.key) || d.key === 'kare';

/**
 * The "Край на раздаване" sheet. Step 1 ("Уточнете обявите") resolves sequences and fours of
 * a kind and only appears when the deal has any; step 2 enters the card points (Task 8).
 */
export function DealEndSheet({ open, onClose }: DealEndSheetProps) {
  const match = useAppStore((s) => s.match);
  // null = the step this opening starts at. Reset on open (not on close, so the title holds
  // still while the sheet animates out); set during render, React's "adjust state on a prop
  // change" pattern, rather than in an effect.
  const [chosen, setChosen] = useState<Step | null>(null);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setChosen(null);
  }

  const start: Step = match?.current.some(needsResolving) ? 'decls' : 'points';
  const step = chosen ?? start;
  const title = step === 'decls' ? S.resolveTitle : S.pointsTitle((match?.games.length ?? 0) + 1);

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {open && step === 'decls' && (
        <ResolveStep onCancel={onClose} onNext={() => setChosen('points')} />
      )}
    </Sheet>
  );
}

function ResolveStep({ onCancel, onNext }: { onCancel: () => void; onNext: () => void }) {
  const match = useAppStore((s) => s.match);
  const roster = useAppStore((s) => s.roster);
  const updateDeclaration = useAppStore((s) => s.updateDeclaration);

  if (!match) return null;

  const res = resolve(match.current, match.rules);
  const verdicts = resolutionLines(res, teamNameOf(match));
  const errors = resolutionErrors(res);
  const blocked = errors.length > 0;

  return (
    <>
      <p className="-mt-3.5 text-sm font-semibold text-pretty text-muted">{S.resolveHint}</p>

      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {match.current.map((d, i) =>
          needsResolving(d) ? (
            <ResolveCard
              key={d.id}
              decl={d}
              name={playerAt(match, roster, d.seat).name}
              status={statusOf(res, d, i)}
              rules={match.rules}
              onTop={(top) => updateDeclaration(d.id, { top: d.top === top ? null : top })}
              onRank={(rank) => updateDeclaration(d.id, { rank })}
            />
          ) : null,
        )}
      </ul>

      {verdicts.length > 0 && (
        <div className="flex flex-col gap-1 rounded-2xl border border-dashed border-line px-3.5 py-3">
          {verdicts.map((line) => (
            <p key={line} className="text-sm font-extrabold">
              {line}
            </p>
          ))}
        </div>
      )}

      {errors.map((error) => (
        <p key={error} className="text-sm font-extrabold text-team-b">
          {error}
        </p>
      ))}

      <div className="grid grid-cols-[1fr_1.6fr] gap-2.5">
        <Button onClick={onCancel}>{S.cancel}</Button>
        <Button
          variant="primary"
          aria-disabled={blocked}
          onClick={() => {
            if (!blocked) onNext();
          }}
        >
          {S.next}
        </Button>
      </div>
    </>
  );
}

/** "зачита се" / "отпада" only once the teams clash in this category and the clash is decided. */
function statusOf(res: Resolution, d: Declaration, i: number): 'counts' | 'drops' | null {
  const seq = isSequence(d.key);
  const contested = seq ? res.contested.seq : res.contested.kare;
  const decided = seq ? res.seqWinner !== null : res.kareWinner !== null;
  if (!contested || !decided) return null;
  return res.valid[i] ? 'counts' : 'drops';
}

function ResolveCard({
  decl,
  name,
  status,
  rules,
  onTop,
  onRank,
}: {
  decl: Declaration;
  name: string;
  status: 'counts' | 'drops' | null;
  rules: RulesConfig;
  onTop: (top: NonNullable<Declaration['top']>) => void;
  onRank: (rank: NonNullable<Declaration['rank']>) => void;
}) {
  const seq = isSequence(decl.key);
  return (
    <li className="flex flex-col gap-2 rounded-[18px] bg-s2 p-3">
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className={cx(
            'size-2.5 shrink-0 rounded-full',
            teamOf(decl.seat) === 'A' ? 'bg-team-a' : 'bg-team-b',
          )}
        />
        <span className="min-w-0 flex-1 truncate font-bold">{name}</span>
        <span className="font-black">{resolutionCardLabel(decl, rules)}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="min-w-6 text-[13px] font-bold text-muted">{seq ? S.to : S.from}</span>
        {seq
          ? validTops(decl.key).map((top) => (
              <Chip key={top} tone="sunken" selected={decl.top === top} onClick={() => onTop(top)}>
                {top}
              </Chip>
            ))
          : KARE_RANKS.map((rank) => (
              <Chip
                key={rank}
                tone="sunken"
                selected={decl.rank === rank}
                onClick={() => onRank(rank)}
              >
                {rank}
              </Chip>
            ))}
      </div>
      {status && (
        <p className={cx('text-xs font-black', status === 'counts' ? 'text-team-a' : 'text-muted')}>
          {status === 'counts' ? S.counts : S.drops}
        </p>
      )}
    </li>
  );
}
