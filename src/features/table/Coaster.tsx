import { currentDeclarationSum, totals } from '../../core/match';
import type { Match } from '../../core/model';
import { STRINGS } from '../../core/strings';
import { cx } from '../../ui/cx';

const NAME = 'max-w-full truncate text-xs font-extrabold';
const TOTAL = 'text-[min(clamp(28px,7.5vw,54px),5.2dvh)] font-black leading-none tabular-nums';

/** The round score coaster in the middle of the felt: totals, current declarations, hanging. */
export function Coaster({
  match,
}: {
  match: Pick<Match, 'teamA' | 'teamB' | 'games' | 'current' | 'rules' | 'hang'>;
}) {
  const total = totals(match);
  const declared = currentDeclarationSum(match);
  return (
    <div className="flex aspect-square w-[min(100%,230px,22dvh)] flex-col items-center justify-center gap-1 rounded-full border-4 border-dashed border-line bg-s1 p-2.5 shadow-[0_0_0_6px_var(--color-s1),0_10px_24px_oklch(0.08_0.02_50/0.6)]">
      <div className="flex w-full items-start justify-center gap-[clamp(6px,2vw,18px)]">
        <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <p className={cx(NAME, 'text-team-a')}>{match.teamA}</p>
          <p className={TOTAL}>{total.A}</p>
        </div>
        <p
          aria-hidden
          className="flex-none pt-5 text-[min(clamp(18px,4.5vw,34px),3.5dvh)] font-black text-muted"
        >
          :
        </p>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <p className={cx(NAME, 'text-team-b')}>{match.teamB}</p>
          <p className={TOTAL}>{total.B}</p>
        </div>
      </div>
      <p className="text-center text-[11px] font-bold text-muted">
        {STRINGS.table.declared(declared.A, declared.B)}
      </p>
      {match.hang > 0 && (
        <p className="text-[11px] font-black text-team-b">{STRINGS.table.hanging(match.hang)}</p>
      )}
    </div>
  );
}
