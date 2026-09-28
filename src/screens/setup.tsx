import { useId, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { totals } from '../core/match';
import type { BestOf, Match, Player, Seat, Team } from '../core/model';
import { assignSeat, draftFromSeats, isDraftComplete, type SeatDraft } from '../core/roster';
import { seatsOf } from '../core/rules';
import { STRINGS } from '../core/strings';
import { PlayerAvatar } from '../features/players/PlayerAvatar';
import { RegisterSheet } from '../features/players/RegisterSheet';
import { appStore, useAppStore } from '../store/instance';
import { Button, buttonClass } from '../ui/Button';
import { cx } from '../ui/cx';
import { Segmented } from '../ui/Segmented';
import { Sheet } from '../ui/Sheet';

const S = STRINGS.setup;

/** Where setup starts: the last match's table (the same friends usually play again). */
function initialSetup() {
  const { match, roster } = appStore.getState();
  const known = new Set(roster.map((p) => p.id));
  return {
    seats: draftFromSeats(match?.seats ?? null, (id) => known.has(id)),
    teamA: match?.teamA ?? S.teamA,
    teamB: match?.teamB ?? S.teamB,
    bestOf: match?.bestOf ?? 1,
  };
}

export function Component() {
  const navigate = useNavigate();
  const roster = useAppStore((s) => s.roster);
  const targetScore = useAppStore((s) => s.settings.rules.targetScore);
  const startMatch = useAppStore((s) => s.startMatch);
  const [initial] = useState(initialSetup);
  const [draft, setDraft] = useState<SeatDraft>(initial.seats);
  const [teamA, setTeamA] = useState(initial.teamA);
  const [teamB, setTeamB] = useState(initial.teamB);
  const [bestOf, setBestOf] = useState<BestOf>(initial.bestOf);
  const [pickSeat, setPickSeat] = useState<Seat | null>(null);
  const hintId = useId();
  const [registerSeat, setRegisterSeat] = useState<Seat | null>(null);
  // The match a "Раздавай!" tap would replace, kept only while its confirmation is open
  // (a sheet's form mounts only while the sheet is open).
  const [replacing, setReplacing] = useState<Match | null>(null);

  const byId = new Map(roster.map((p) => [p.id, p]));
  const complete = isDraftComplete(draft);

  const seatPlayer = (seat: Seat, playerId: string) =>
    setDraft((d) => assignSeat(d, seat, playerId));

  const beginMatch = () => {
    if (!isDraftComplete(draft)) return;
    startMatch({
      seats: draft,
      teamA: teamA.trim() || S.teamA,
      teamB: teamB.trim() || S.teamB,
      bestOf,
    });
    navigate('/table');
  };

  const start = () => {
    if (!isDraftComplete(draft)) return;
    // Read fresh at click time: a match still playing with at least one saved deal needs
    // confirmation before it's discarded (ADR 0011); a match with no deals, or an ended
    // match already recorded on the leaderboard, is replaced at once.
    const { match } = appStore.getState();
    if (match && match.status === 'playing' && match.games.length > 0) {
      setReplacing(match);
      return;
    }
    beginMatch();
  };

  const teamCard = (team: Team) => (
    <section className="flex flex-col gap-3 rounded-3xl border border-line bg-s1 p-[18px]">
      <header className="flex items-center gap-2.5">
        <span
          aria-hidden
          className={cx('size-3 shrink-0 rounded-full', team === 'A' ? 'bg-team-a' : 'bg-team-b')}
        />
        <input
          aria-label={team === 'A' ? S.teamAName : S.teamBName}
          value={team === 'A' ? teamA : teamB}
          onChange={
            team === 'A'
              ? (event) => setTeamA(event.target.value)
              : (event) => setTeamB(event.target.value)
          }
          className={cx(
            'min-w-0 flex-1 bg-transparent text-xl font-extrabold',
            team === 'A' ? 'text-team-a' : 'text-team-b',
          )}
        />
        <span className="shrink-0 text-sm font-bold text-muted">
          {team === 'A' ? S.teamASeats : S.teamBSeats}
        </span>
      </header>
      {seatsOf(team).map((seat) => (
        <SeatRow
          key={seat}
          seat={seat}
          team={team}
          player={byId.get(draft[seat] ?? '') ?? null}
          onPick={() => setPickSeat(seat)}
        />
      ))}
    </section>
  );

  return (
    <div className="flex flex-col gap-5 py-6 landscape:gap-[clamp(10px,2dvh,20px)] landscape:py-[clamp(12px,2.4dvh,24px)]">
      <Link to="/" className={cx(buttonClass('secondary', 'sm'), 'self-start')}>
        {S.back}
      </Link>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[32px] font-black leading-tight">{S.title}</h1>
        <p className="text-base font-semibold text-muted">{S.hint}</p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
        {teamCard('A')}
        {teamCard('B')}
      </div>

      <div className="flex flex-col gap-2.5">
        <span className="text-[13px] font-extrabold uppercase tracking-[0.06em] text-muted">
          {S.series}
        </span>
        <Segmented label={S.series} options={S.seriesOptions} value={bestOf} onChange={setBestOf} />
        <p id={hintId} className="text-center text-sm font-bold text-muted">
          {complete ? S.hintTarget(targetScore) : S.hintSeats}
        </p>
      </div>

      {/* aria-disabled, not disabled: the spec's inactive look is the muted variant, not faded primary. */}
      <Button
        variant={complete ? 'primary' : 'muted'}
        size="lg"
        aria-disabled={!complete}
        aria-describedby={hintId}
        onClick={start}
      >
        {S.deal}
      </Button>

      <SeatSheet
        seat={pickSeat}
        draft={draft}
        roster={roster}
        onClose={() => setPickSeat(null)}
        onPick={(playerId) => {
          if (pickSeat !== null) seatPlayer(pickSeat, playerId);
          setPickSeat(null);
        }}
        onNewPlayer={() => {
          setRegisterSeat(pickSeat);
          setPickSeat(null);
        }}
      />
      <RegisterSheet
        open={registerSeat !== null}
        playerId={null}
        onClose={() => setRegisterSeat(null)}
        onSaved={(playerId) => {
          if (registerSeat !== null) seatPlayer(registerSeat, playerId);
        }}
      />
      <Sheet
        open={replacing !== null}
        onClose={() => setReplacing(null)}
        title={S.replaceTitle}
        subtitle={replacing && S.replaceBody(totals(replacing).A, totals(replacing).B)}
      >
        <div className="grid grid-cols-2 gap-2.5">
          <Button onClick={() => setReplacing(null)}>{S.replaceCancel}</Button>
          <Button
            variant="danger"
            onClick={() => {
              setReplacing(null);
              beginMatch();
            }}
          >
            {S.replaceConfirm}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

function SeatRow({
  seat,
  team,
  player,
  onPick,
}: {
  seat: Seat;
  team: Team;
  player: Player | null;
  onPick: () => void;
}) {
  const ring = team === 'A' ? 'border-team-a' : 'border-team-b';
  return (
    <button
      type="button"
      onClick={onPick}
      className="flex w-full items-center gap-3.5 rounded-[20px] border border-line bg-bg p-3 text-left transition-transform active:scale-[0.98]"
    >
      {player ? (
        <PlayerAvatar player={player} size={60} ring={team === 'A' ? 'a' : 'b'} decorative />
      ) : (
        <span
          aria-hidden
          className={cx('size-[60px] shrink-0 rounded-full border-[3px] border-dashed', ring)}
        />
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-xs font-extrabold uppercase tracking-[0.06em] text-muted">
          {STRINGS.seats[seat]}
        </span>
        <span className={cx('truncate text-[17px] font-extrabold', !player && 'text-muted')}>
          {player?.name ?? S.pickPlayer}
        </span>
      </span>
      <span aria-hidden className="text-xl font-black text-muted">
        ›
      </span>
    </button>
  );
}

function SeatSheet({
  seat,
  draft,
  roster,
  onClose,
  onPick,
  onNewPlayer,
}: {
  seat: Seat | null;
  draft: SeatDraft;
  roster: readonly Player[];
  onClose: () => void;
  onPick: (playerId: string) => void;
  onNewPlayer: () => void;
}) {
  return (
    <Sheet
      open={seat !== null}
      onClose={onClose}
      title={seat === null ? '' : S.seatTitle(STRINGS.seats[seat])}
    >
      <button
        type="button"
        onClick={onNewPlayer}
        className="h-14 rounded-2xl border-2 border-dashed border-line text-base font-extrabold transition-transform active:scale-[0.98]"
      >
        {S.newPlayer}
      </button>
      <ul className="flex flex-col gap-2">
        {roster.map((player) => {
          const at = draft.indexOf(player.id);
          return (
            <li key={player.id}>
              <button
                type="button"
                onClick={() => onPick(player.id)}
                className="flex w-full items-center gap-3 rounded-2xl bg-s2 p-2.5 text-left transition-transform active:scale-[0.98]"
              >
                <PlayerAvatar player={player} size={48} decorative />
                <span className="min-w-0 flex-1 truncate text-base font-extrabold">
                  {player.name}
                </span>
                {at >= 0 && (
                  <span className="text-xs font-extrabold uppercase tracking-[0.06em] text-muted">
                    {STRINGS.seats[at]}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
