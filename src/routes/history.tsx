import { Navigate } from 'react-router';
import { PreloadLink } from '../app/PreloadLink';
import { resumePath } from '../app/resume';
import { totals } from '../core/match';
import type { Seat } from '../core/model';
import { STRINGS } from '../core/strings';
import { currentEntry, type HistoryDeclRow, historyEntries } from '../features/history/copy';
import { teamNameOf } from '../features/table/copy';
import { playerAt } from '../features/table/seat-player';
import { useAppStore } from '../store/instance';
import { buttonClass } from '../ui/Button';
import { cx } from '../ui/cx';

const S = STRINGS.history;

/** The match history screen (§9): a score bar, the in-progress deal, then past deals newest first. */
export function Component() {
  const match = useAppStore((s) => s.match);
  const roster = useAppStore((s) => s.roster);

  if (!match) return <Navigate to="/" replace />;

  const playerName = (seat: Seat) => playerAt(match, roster, seat).name;
  const teamName = teamNameOf(match);
  const entries = historyEntries(match, playerName, teamName);
  const current = currentEntry(match);
  const score = totals(match);
  const backTo = resumePath(match) ?? '/';

  return (
    <div className="flex flex-col gap-4 py-6">
      <div className="flex items-center gap-3">
        <PreloadLink to={backTo} className={cx(buttonClass('secondary', 'sm'), 'shrink-0')}>
          {S.back}
        </PreloadLink>
        <h1 className="text-2xl font-black">{S.title}</h1>
      </div>

      <div className="flex items-center justify-between gap-2 rounded-[20px] border border-line bg-s1 px-[18px] py-3.5">
        <p className="text-[17px] font-extrabold text-team-a">
          {match.teamA} <span className="text-[26px] font-black text-text">{score.A}</span>
        </p>
        <p className="text-[13px] font-bold text-muted">{S.to(match.rules.targetScore)}</p>
        <p className="text-[17px] font-extrabold text-team-b">
          <span className="text-[26px] font-black text-text">{score.B}</span> {match.teamB}
        </p>
      </div>

      {current && (
        <section className="flex flex-col gap-2 rounded-[20px] border border-dashed border-line p-4">
          <h2 className="text-[15px] font-extrabold text-muted">{S.inProgress(current.no)}</h2>
          {current.decls.map((row) => (
            <DeclRow key={row.id} row={row} name={playerName(row.seat)} />
          ))}
        </section>
      )}

      {entries.length === 0 && !current && (
        <p className="rounded-[20px] border-2 border-dashed border-line p-10 text-center text-[15px] font-semibold text-muted">
          {S.empty}
        </p>
      )}

      {entries.map((entry) => (
        <section key={entry.no} className="flex flex-col gap-2.5 rounded-[20px] bg-s1 p-4">
          <div className="flex items-baseline justify-between gap-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="flex-none text-base font-black">{S.deal(entry.no)}</h2>
              <p className="truncate text-[13px] font-extrabold text-muted">
                <span aria-hidden className={cx(entry.red && 'text-suit-red')}>
                  {entry.contract.sym}
                </span>{' '}
                {entry.contract.rest}
              </p>
            </div>
            <p className="shrink-0 text-[15px] font-extrabold tabular-nums">
              <span className="text-team-a">{entry.a}</span> :{' '}
              <span className="text-team-b">{entry.b}</span>
            </p>
          </div>

          {entry.decls.length === 0 ? (
            <p className="text-sm font-semibold text-muted">{S.noDecls}</p>
          ) : (
            entry.decls.map((row) => <DeclRow key={row.id} row={row} name={playerName(row.seat)} />)
          )}

          {entry.notes && <p className="text-[13px] font-black text-team-b">{entry.notes}</p>}

          <p className="text-xs font-bold text-muted">{S.runningTotal(entry.runA, entry.runB)}</p>
        </section>
      ))}
    </div>
  );
}

function DeclRow({ row, name }: { row: HistoryDeclRow; name: string }) {
  const dot = (
    <span
      aria-hidden
      className={cx('h-2 w-2 flex-none rounded-full', row.team === 'A' ? 'bg-team-a' : 'bg-team-b')}
    />
  );
  if (row.valid) {
    return (
      <div className="flex items-center gap-2.5 text-[15px]">
        {dot}
        <span className="flex-1 font-bold">{name}</span>
        <span className="font-extrabold">{row.label}</span>
        <span className="w-10 text-right font-bold text-muted">{row.points}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2.5 text-[15px]">
      {dot}
      <span className="flex-1 font-bold">{name}</span>
      {/* One `<del>` around both label and points, so assistive tech announces the drop once. */}
      <del className="flex items-center gap-2.5 font-extrabold opacity-50">
        <span>{row.label}</span>
        <span className="w-10 text-right font-bold text-muted">{row.points}</span>
      </del>
    </div>
  );
}
