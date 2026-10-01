import { useState } from 'react';
import { STRINGS } from '../../core/strings';
import { Button } from '../../ui/Button';
import { cx } from '../../ui/cx';
import { Sheet, SheetActions } from '../../ui/Sheet';
import {
  type Day,
  type Draft,
  dayKey,
  draftPeriod,
  inPeriod,
  monthGrid,
  monthTitle,
  type Period,
  PRESETS,
  presetOf,
  presetPeriod,
  sameDay,
  shiftMonth,
  tapDay,
} from './period';

const S = STRINGS.stats;

export interface PeriodSheetProps {
  open: boolean;
  onClose: () => void;
  period: Period;
  today: Day;
  onApply: (period: Period) => void;
}

/** «Период»: preset chips, then a month calendar to pick a first and a last day. */
export function PeriodSheet({ open, onClose, period, today, onApply }: PeriodSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title={S.period} subtitle={S.pickHint}>
      <PeriodForm period={period} today={today} onApply={onApply} />
    </Sheet>
  );
}

function PeriodForm({
  period,
  today,
  onApply,
}: {
  period: Period;
  today: Day;
  onApply: (period: Period) => void;
}) {
  const [draft, setDraft] = useState<Draft>(period);
  const [month, setMonth] = useState(() => {
    const at = period?.to ?? today;
    return { y: at.y, m: at.m };
  });
  const shown = draftPeriod(draft);
  const preset = presetOf(shown, today);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={preset === p}
            onClick={() => onApply(presetPeriod(p, today))}
            className={cx(
              'h-10 rounded-full border px-4 text-sm font-extrabold transition-transform active:scale-95',
              preset === p ? 'border-team-a bg-team-a text-on' : 'border-line bg-s2 text-text',
            )}
          >
            {S.presets[p]}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2 rounded-[20px] bg-s2 p-3">
        <div className="flex items-center justify-between gap-1">
          <div className="flex gap-1">
            <NavButton label={S.prevYear} onClick={() => setMonth((at) => shiftMonth(at, -12))}>
              «
            </NavButton>
            <NavButton label={S.prevMonth} onClick={() => setMonth((at) => shiftMonth(at, -1))}>
              ‹
            </NavButton>
          </div>
          <p aria-live="polite" className="text-base font-black">
            {monthTitle(month)}
          </p>
          <div className="flex gap-1">
            <NavButton label={S.nextMonth} onClick={() => setMonth((at) => shiftMonth(at, 1))}>
              ›
            </NavButton>
            <NavButton label={S.nextYear} onClick={() => setMonth((at) => shiftMonth(at, 12))}>
              »
            </NavButton>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {S.weekdays.map((w) => (
            <span key={w} className="text-xs font-extrabold text-muted">
              {w}
            </span>
          ))}
          {monthGrid(month.y, month.m)
            .flat()
            .map((day, i) =>
              day === null ? (
                // biome-ignore lint/suspicious/noArrayIndexKey: padding cells have no identity
                <span key={`pad${i}`} />
              ) : (
                <DayButton
                  key={dayKey(day)}
                  day={day}
                  today={today}
                  period={shown}
                  onTap={() => setDraft((d) => tapDay(d, day))}
                />
              ),
            )}
        </div>
      </div>

      <SheetActions>
        <Button variant="primary" size="lg" className="w-full" onClick={() => onApply(shown)}>
          {S.apply}
        </Button>
      </SheetActions>
    </>
  );
}

function NavButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-10 items-center justify-center rounded-xl bg-s3 text-lg font-black text-text active:scale-95"
    >
      {children}
    </button>
  );
}

function DayButton({
  day,
  today,
  period,
  onTap,
}: {
  day: Day;
  today: Day;
  period: Period;
  onTap: () => void;
}) {
  const inside = period !== null && inPeriod(day, period);
  const edge = period !== null && (sameDay(day, period.from) || sameDay(day, period.to));
  return (
    <button
      type="button"
      aria-pressed={inside}
      aria-label={`${day.d} ${S.months[day.m]} ${day.y}`}
      onClick={onTap}
      className={cx(
        'h-10 rounded-xl text-[15px] font-extrabold tabular-nums transition-transform active:scale-95',
        edge ? 'bg-team-a text-on' : inside ? 'bg-team-a/30 text-text' : 'text-text',
        sameDay(day, today) && !edge && 'ring-2 ring-team-a',
      )}
    >
      {day.d}
    </button>
  );
}
