import { type KeyboardEvent, useId, useState } from 'react';
import type { ContractKey, Declaration, Team } from '../../core/model';
import { type Resolution, resolve } from '../../core/resolve';
import {
  isSequence,
  KARE_RANKS,
  RED_CONTRACTS,
  type RulesConfig,
  teamOf,
  validTops,
} from '../../core/rules';
import { type DealScore, scoreDeal } from '../../core/score';
import { STRINGS } from '../../core/strings';
import { useAppStore } from '../../store/instance';
import { Button } from '../../ui/Button';
import { Chip } from '../../ui/Chip';
import { cx } from '../../ui/cx';
import { nextRadioIndex } from '../../ui/radio-nav';
import { Sheet, SheetActions } from '../../ui/Sheet';
import {
  calcRows,
  dealVerdict,
  endBlockedNote,
  pointsHint,
  resolutionCardLabel,
  resolutionErrors,
  resolutionLines,
  teamNameOf,
} from './copy';
import { playerAt } from './seat-player';

const S = STRINGS.deal;

type Step = 'decls' | 'points';

export interface DealEndSheetProps {
  open: boolean;
  onClose: () => void;
  /** Step 2's contract pill. The table closes this sheet and opens the contract sheet, which
   * reopens this one on confirm (step 2's inputs start over). */
  onChangeContract: () => void;
  /** Fires after the deal is saved; `ended` when that save ended the match. */
  onSaved: (ended: boolean) => void;
}

/** Needs step 1: the deal has a sequence or a four of a kind to resolve. */
const needsResolving = (d: Pick<Declaration, 'key'>) => isSequence(d.key) || d.key === 'kare';

/**
 * The "Край на раздаване" sheet. Step 1 ("Уточнете обявите") resolves sequences and fours of
 * a kind and only appears when the deal has any; step 2 enters the card points and saves.
 */
export function DealEndSheet({ open, onClose, onChangeContract, onSaved }: DealEndSheetProps) {
  const match = useAppStore((s) => s.match);
  // null = the step this opening starts at. Reset on open (not on close, so the title holds
  // still while the sheet animates out); set during render, React's "adjust state on a prop
  // change" pattern, rather than in an effect. `dealNumber` snapshots the deal count the same
  // way: a save bumps `match.games.length` immediately, but the sheet is still animating closed
  // (ADR 0008's exit transition), so the title must keep naming the deal that was just saved.
  const [chosen, setChosen] = useState<Step | null>(null);
  const [dealNumber, setDealNumber] = useState((match?.games.length ?? 0) + 1);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setChosen(null);
      setDealNumber((match?.games.length ?? 0) + 1);
    }
  }

  const start: Step = match?.current.some(needsResolving) ? 'decls' : 'points';
  const step = chosen ?? start;
  const contract = match?.contract ?? null;
  const points = step === 'points';
  const title = points ? S.pointsTitle(dealNumber) : S.resolveTitle;
  const subtitle = points ? contract && match && pointsHint(contract) : S.resolveHint;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      aside={points && contract && <StepPill contract={contract} onClick={onChangeContract} />}
    >
      {step === 'decls' && <ResolveStep onCancel={onClose} onNext={() => setChosen('points')} />}
      {points && (
        <PointsStep
          onBack={start === 'decls' ? () => setChosen('decls') : onClose}
          onSaved={onSaved}
        />
      )}
    </Sheet>
  );
}

/** Step 2's contract pill (symbol only); tapping it changes the contract. */
function StepPill({ contract, onClick }: { contract: ContractKey; onClick: () => void }) {
  const { sym, label } = STRINGS.contracts[contract];
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-label={`${sym} ${label}`}
      onClick={onClick}
      className={cx(
        'ml-auto flex h-10 shrink-0 items-center justify-center rounded-[14px] border border-line bg-s2 px-2 text-base font-black leading-none transition-transform active:scale-95',
        RED_CONTRACTS.has(contract) && 'text-suit-red',
      )}
    >
      {sym}
    </button>
  );
}

/** A whole number (sign allowed, so an out-of-range B can drive A below zero), else null. */
const parsePoints = (raw: string): number | null => (/^-?\d+$/.test(raw) ? Number(raw) : null);

const VERDICT_BOX: Record<DealScore['verdict'], string> = {
  inside: 'bg-team-b text-on',
  hang: 'bg-s3 text-text',
  ok: 'bg-s2 text-text',
};

function PointsStep({
  onBack,
  onSaved,
}: {
  onBack: () => void;
  onSaved: (ended: boolean) => void;
}) {
  const match = useAppStore((s) => s.match);
  const saveDeal = useAppStore((s) => s.saveDeal);
  const [cardA, setCardA] = useState('');
  const [capo, setCapo] = useState<Team | null>(null);

  if (!match || match.contract === null || match.caller === null) return null;

  const parsed = parsePoints(cardA);
  const score = scoreDeal(
    {
      contract: match.contract,
      caller: match.caller,
      decls: match.current,
      hang: match.hang,
      cardPointsA: parsed,
      capo,
    },
    match.rules,
  );
  // Exact card points in, rounded score out (ADR 0020).
  const { total } = score;
  const teamName = teamNameOf(match);
  const error =
    score.error === 'points-missing'
      ? S.errMissing
      : score.error === 'points-range'
        ? S.errRange(total)
        : null;

  const endBlocked = error === null ? endBlockedNote(match, score, teamName) : null;

  let shownA = cardA;
  let shownB = parsed === null ? '' : String(total - parsed);
  if (capo) {
    shownA = String(capo === 'A' ? total : 0);
    shownB = String(capo === 'B' ? total : 0);
  }

  const onInputA = (value: string) => {
    setCardA(value);
    setCapo(null);
  };
  const onInputB = (value: string) => {
    const b = parsePoints(value);
    setCardA(b === null ? '' : String(total - b));
    setCapo(null);
  };

  const save = () => {
    if (error) return;
    const result = saveDeal({ cardPointsA: parsed, capo });
    if (result.ok) onSaved(result.ended);
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
        <PointsInput team="A" label={match.teamA} value={shownA} onChange={onInputA} />
        <PointsInput team="B" label={match.teamB} value={shownB} onChange={onInputB} />
        {(['A', 'B'] as const).map((team) => (
          <button
            key={team}
            type="button"
            aria-pressed={capo === team}
            onClick={() => setCapo((current) => (current === team ? null : team))}
            className={cx(
              'h-11 rounded-[14px] border-2 bg-s2 text-sm font-extrabold transition-transform active:scale-[0.97]',
              capo !== team && 'border-transparent',
              capo === team && (team === 'A' ? 'border-team-a' : 'border-team-b'),
            )}
          >
            {S.capo}
          </button>
        ))}
      </div>

      {/* A collapsed-border table ignores padding and radius, so the box wraps it. */}
      <div className="rounded-[18px] bg-s2 px-3.5 py-2">
        <table className="w-full table-fixed tabular-nums">
          <colgroup>
            <col className="w-[39%]" />
            <col />
            <col />
          </colgroup>
          <tbody>
            {calcRows(score, capo).map((row) => (
              <tr key={row.label}>
                <th scope="row" className="py-1 text-left text-sm font-bold text-muted">
                  {row.label}
                </th>
                <td className="py-1 text-center text-[15px] font-extrabold">{row.a}</td>
                <td className="py-1 text-center text-[15px] font-extrabold">{row.b}</td>
              </tr>
            ))}
            <tr>
              <th
                scope="row"
                className="border-t border-line pt-2 text-left text-[15px] font-black"
              >
                {S.rows.match}
              </th>
              <td className="border-t border-line pt-1 text-center text-[26px] font-black text-team-a">
                {score.match.A}
              </td>
              <td className="border-t border-line pt-1 text-center text-[26px] font-black text-team-b">
                {score.match.B}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {error === null && (
        <p
          data-verdict={score.verdict}
          className={cx(
            'rounded-2xl px-3.5 py-3 text-[15px] font-black text-pretty',
            VERDICT_BOX[score.verdict],
          )}
        >
          {dealVerdict(score, match.caller, capo, match.hang, teamName, match.rules)}
        </p>
      )}
      {endBlocked && <p className="text-sm font-extrabold text-team-b">{endBlocked}</p>}
      {error && <p className="text-sm font-extrabold text-team-b">{error}</p>}

      <SheetActions className="grid grid-cols-[1fr_1.6fr] gap-2.5">
        <Button onClick={onBack}>{S.back}</Button>
        <Button variant="primary" aria-disabled={error !== null} onClick={save}>
          {S.save}
        </Button>
      </SheetActions>
    </>
  );
}

function PointsInput({
  team,
  label,
  value,
  onChange,
}: {
  team: Team;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className={cx('text-sm font-extrabold', team === 'A' ? 'text-team-a' : 'text-team-b')}>
        {label}
      </span>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="0"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cx(
          'h-16 w-full min-w-0 rounded-[18px] border-2 bg-bg text-center text-[30px] font-black text-text outline-none',
          team === 'A' ? 'border-team-a' : 'border-team-b',
        )}
      />
    </label>
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

      <SheetActions className="grid grid-cols-[1fr_1.6fr] gap-2.5">
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
      </SheetActions>
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
  const labelId = useId();

  const topOptions = validTops(decl.key);
  // Not `indexOf`: `decl.top` is nullable, and the array's element type isn't.
  const topTabStop = Math.max(
    0,
    // biome-ignore lint/complexity/useIndexOf: see above
    topOptions.findIndex((top) => top === decl.top),
  );
  const onTopKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = nextRadioIndex(event, index, topOptions.length);
    if (next === null) return;
    event.preventDefault();
    const top = topOptions[next];
    if (top) onTop(top);
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
      [next]?.focus();
  };

  // Not `indexOf`: `decl.rank` is nullable, and the array's element type isn't.
  const rankTabStop = Math.max(
    0,
    // biome-ignore lint/complexity/useIndexOf: see above
    KARE_RANKS.findIndex((rank) => rank === decl.rank),
  );
  const onRankKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = nextRadioIndex(event, index, KARE_RANKS.length);
    if (next === null) return;
    event.preventDefault();
    const rank = KARE_RANKS[next];
    if (rank) onRank(rank);
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
      [next]?.focus();
  };

  return (
    // Name and chips share a line when the sheet is wide enough (a laptop), halving the card's
    // height; on a phone the chips wrap below, as in mockup 07 (ADR 0012).
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[18px] bg-s2 p-3">
      <div className="flex min-w-[150px] flex-1 items-center gap-2.5">
        <span
          aria-hidden
          className={cx(
            'size-2.5 shrink-0 rounded-full',
            teamOf(decl.seat) === 'A' ? 'bg-team-a' : 'bg-team-b',
          )}
        />
        {/* Always readable (product owner, 2026-10-01): the name wraps instead of truncating. */}
        <span className="min-w-0 flex-1 break-words text-[15px] font-extrabold text-text">
          {name}
        </span>
        <span id={labelId} className="shrink-0 font-black">
          {resolutionCardLabel(decl, rules)}
        </span>
      </div>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className="flex flex-wrap items-center gap-1.5"
      >
        <span className="min-w-6 text-[13px] font-bold text-muted">{seq ? S.to : S.from}</span>
        {seq
          ? topOptions.map((top, index) => (
              <Chip
                key={top}
                choice
                tone="sunken"
                selected={decl.top === top}
                tabIndex={index === topTabStop ? 0 : -1}
                onKeyDown={(event) => onTopKeyDown(event, index)}
                onClick={() => onTop(top)}
              >
                {top}
              </Chip>
            ))
          : KARE_RANKS.map((rank, index) => (
              <Chip
                key={rank}
                choice
                tone="sunken"
                selected={decl.rank === rank}
                tabIndex={index === rankTabStop ? 0 : -1}
                onKeyDown={(event) => onRankKeyDown(event, index)}
                onClick={() => onRank(rank)}
              >
                {rank}
              </Chip>
            ))}
      </div>
      {status && (
        <p
          className={cx(
            'basis-full text-xs font-black',
            status === 'counts' ? 'text-team-a' : 'text-muted',
          )}
        >
          {status === 'counts' ? S.counts : S.drops}
        </p>
      )}
    </li>
  );
}
