import { Navigate, useNavigate } from 'react-router';
import { PreloadLink } from '../app/PreloadLink';
import { resumePath } from '../app/resume';
import type { Seat } from '../core/model';
import { seatsOf } from '../core/rules';
import { STRINGS } from '../core/strings';
import { endSummary } from '../features/end/copy';
import { PlayerAvatar } from '../features/players/PlayerAvatar';
import { teamNameOf } from '../features/table/copy';
import { playerAt } from '../features/table/seat-player';
import { useAppStore } from '../store/instance';
import { Button, buttonClass } from '../ui/Button';
import { cx } from '../ui/cx';

const S = STRINGS.end;

/** The match-end screen (§10): winner or tie, series card, big score, declaration totals, actions. */
export function Component() {
  const match = useAppStore((s) => s.match);
  const roster = useAppStore((s) => s.roster);
  const nextMatch = useAppStore((s) => s.nextMatch);
  const rematch = useAppStore((s) => s.rematch);
  const leaveMatch = useAppStore((s) => s.leaveMatch);
  const navigate = useNavigate();

  // Only an ended match has an end screen: none goes Home, a playing one back to the table.
  if (match?.status !== 'ended') return <Navigate to={resumePath(match) ?? '/'} replace />;

  const playerName = (seat: Seat) => playerAt(match, roster, seat).name;
  const teamName = teamNameOf(match);
  const summary = endSummary(match, playerName, teamName);
  const showNext = summary.isSeries && !summary.seriesOver;

  const toNextMatch = () => {
    nextMatch();
    navigate('/table', { replace: true });
  };
  const toRematch = () => {
    rematch();
    navigate('/table', { replace: true });
  };
  const goHome = () => {
    leaveMatch();
    navigate('/', { replace: true });
  };

  return (
    <div className="flex flex-1 flex-col items-center gap-6 py-6 text-center">
      <p className="text-[13px] font-extrabold uppercase tracking-wide text-muted">
        {summary.line}
      </p>

      {summary.winner !== null ? (
        <div className="flex flex-col items-center gap-3.5">
          <div className="flex">
            {seatsOf(summary.winner).map((seat) => (
              <PlayerAvatar
                key={seat}
                player={playerAt(match, roster, seat)}
                size={100}
                ring={summary.winner === 'A' ? 'a' : 'b'}
                decorative
                style={{ margin: '0 -6px' }}
              />
            ))}
          </div>
          <h1
            className={cx(
              'text-[40px] font-black leading-tight',
              summary.winner === 'A' ? 'text-team-a' : 'text-team-b',
            )}
          >
            {summary.title}
          </h1>
          <p className="text-base font-bold text-muted">{summary.winnerNames}</p>
          <p className="rounded-[14px] border border-line bg-s1 px-4 py-2 text-base font-extrabold">
            {summary.pays}
          </p>
        </div>
      ) : (
        <h1 className="text-[40px] font-black leading-tight">{summary.title}</h1>
      )}

      {summary.isSeries && (
        <div className="flex flex-col items-center gap-2 rounded-[20px] border border-line bg-s1 px-[22px] py-3.5">
          <p className="text-xs font-extrabold uppercase tracking-wide text-muted">
            {summary.seriesLabel}
          </p>
          <div className="flex items-center gap-3.5 tabular-nums">
            <span className="text-[15px] font-extrabold text-team-a">{match.teamA}</span>
            <span className="text-[34px] font-black leading-none">
              {summary.series.A} : {summary.series.B}
            </span>
            <span className="text-[15px] font-extrabold text-team-b">{match.teamB}</span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-5 tabular-nums">
        <div className="flex flex-col items-center gap-0.5">
          <p className="text-sm font-extrabold text-team-a">{match.teamA}</p>
          <p className="text-[56px] font-black leading-none">{summary.totals.A}</p>
        </div>
        <p className="text-4xl font-black text-muted">:</p>
        <div className="flex flex-col items-center gap-0.5">
          <p className="text-sm font-extrabold text-team-b">{match.teamB}</p>
          <p className="text-[56px] font-black leading-none">{summary.totals.B}</p>
        </div>
      </div>

      <div className="grid w-full max-w-[440px] grid-cols-2 gap-2.5">
        <div className="rounded-[18px] bg-s1 p-3 text-center">
          <p className="text-xs font-bold text-muted">{S.decls(match.teamA)}</p>
          <p className="text-[22px] font-black">{summary.decls.A}</p>
        </div>
        <div className="rounded-[18px] bg-s1 p-3 text-center">
          <p className="text-xs font-bold text-muted">{S.decls(match.teamB)}</p>
          <p className="text-[22px] font-black">{summary.decls.B}</p>
        </div>
      </div>

      <div className="mt-auto flex w-full max-w-[440px] flex-col gap-2.5">
        {showNext ? (
          <Button variant="primary" size="lg" onClick={toNextMatch}>
            {S.next(summary.nextNo)}
          </Button>
        ) : (
          <Button variant="primary" size="lg" onClick={goHome}>
            {S.home}
          </Button>
        )}
        <div className="grid grid-cols-2 gap-2.5">
          <PreloadLink to="/history" className={buttonClass('secondary', 'md')}>
            {S.history}
          </PreloadLink>
          {showNext ? (
            <Button variant="secondary" size="md" onClick={goHome}>
              {S.stop}
            </Button>
          ) : (
            <Button variant="secondary" size="md" onClick={toRematch}>
              {S.rematch}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
