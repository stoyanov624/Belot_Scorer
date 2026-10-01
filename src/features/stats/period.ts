/**
 * The leaderboard's period filter (product owner, 2026-10-01): calendar days, a picked range,
 * presets, the month grid and the button's label. Pure and Date-free, so it copies verbatim to
 * the mobile app: callers turn a timestamp into a local `Day` themselves (`dayOf`).
 */
import type { MatchRecord } from '../../core/model';
import { STRINGS } from '../../core/strings';

const S = STRINGS.stats;

/** A calendar day; `m` is 0-based (0 = January), like the platform's own date APIs. */
export interface Day {
  y: number;
  m: number;
  d: number;
}

/** Both ends inclusive. `null` is «Всички». */
export type Period = { from: Day; to: Day } | null;

export type Preset = 'all' | 'thisYear' | 'lastYear' | 'thisMonth';
export const PRESETS: readonly Preset[] = ['all', 'thisYear', 'lastYear', 'thisMonth'];

/** A sortable number for a day: 2026-10-01 → 20260901 (0-based month). */
export const dayKey = (day: Day): number => day.y * 10000 + day.m * 100 + day.d;
export const sameDay = (a: Day, b: Day): boolean => dayKey(a) === dayKey(b);

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
export function daysInMonth(y: number, m: number): number {
  return [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m] ?? 30;
}

/** 0 = Monday … 6 = Sunday (Sakamoto's method, shifted to a Monday-first week). */
export function weekday(day: Day): number {
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  const y = day.m < 2 ? day.y - 1 : day.y;
  const sunday0 =
    (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + (t[day.m] ?? 0) + day.d) %
    7;
  return (sunday0 + 6) % 7;
}

/** The month's days in Monday-first weeks, padded with nulls before the 1st and after the last. */
export function monthGrid(y: number, m: number): (Day | null)[][] {
  const cells: (Day | null)[] = Array.from({ length: weekday({ y, m, d: 1 }) }, () => null);
  for (let d = 1; d <= daysInMonth(y, m); d++) cells.push({ y, m, d });
  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

/** The month before or after: `shiftMonth({ y: 2026, m: 0 }, -1)` is December 2025. */
export function shiftMonth(at: { y: number; m: number }, by: number): { y: number; m: number } {
  const index = at.y * 12 + at.m + by;
  return { y: Math.floor(index / 12), m: ((index % 12) + 12) % 12 };
}

export function presetPeriod(preset: Preset, today: Day): Period {
  switch (preset) {
    case 'all':
      return null;
    case 'thisYear':
      return { from: { y: today.y, m: 0, d: 1 }, to: { y: today.y, m: 11, d: 31 } };
    case 'lastYear':
      return { from: { y: today.y - 1, m: 0, d: 1 }, to: { y: today.y - 1, m: 11, d: 31 } };
    case 'thisMonth':
      return {
        from: { y: today.y, m: today.m, d: 1 },
        to: { y: today.y, m: today.m, d: daysInMonth(today.y, today.m) },
      };
  }
}

/** The preset a period equals, if any, so its chip shows as chosen. */
export function presetOf(period: Period, today: Day): Preset | null {
  return (
    PRESETS.find((p) => {
      const q = presetPeriod(p, today);
      return q === null || period === null
        ? q === period
        : sameDay(q.from, period.from) && sameDay(q.to, period.to);
    }) ?? null
  );
}

/** A range being picked in the calendar: the first tap sets `from`, the second closes it. */
export type Draft = { from: Day; to: Day | null } | null;

/** One tap on a day: start a range, close it (in either order), or start over once closed. */
export function tapDay(draft: Draft, day: Day): Draft {
  if (draft === null || draft.to !== null) return { from: day, to: null };
  return dayKey(day) < dayKey(draft.from)
    ? { from: day, to: draft.from }
    : { from: draft.from, to: day };
}

/** The draft as a period: a single tapped day is a one-day range. */
export const draftPeriod = (draft: Draft): Period =>
  draft === null ? null : { from: draft.from, to: draft.to ?? draft.from };

export function inPeriod(day: Day, period: Period): boolean {
  if (period === null) return true;
  const k = dayKey(day);
  return k >= dayKey(period.from) && k <= dayKey(period.to);
}

/** The recorded matches inside the period, judged by the local day each one was played. */
export function filterRecords(
  records: readonly MatchRecord[],
  period: Period,
  dayOf: (timestamp: number) => Day,
): MatchRecord[] {
  return period === null ? [...records] : records.filter((r) => inPeriod(dayOf(r.date), period));
}

const short = (day: Day) => `${day.d} ${S.monthsShort[day.m]}`;

/** The «Период» button's text: a preset's name, or «1 яну – 31 мар 2026». */
export function periodLabel(period: Period, today: Day): string {
  const preset = presetOf(period, today);
  if (preset) return S.presets[preset];
  if (period === null) return S.presets.all;
  const { from, to } = period;
  if (sameDay(from, to)) return `${short(from)} ${from.y}`;
  return from.y === to.y
    ? S.range(short(from), `${short(to)} ${to.y}`)
    : S.range(`${short(from)} ${from.y}`, `${short(to)} ${to.y}`);
}

/** A calendar month's heading, e.g. «октомври 2026». */
export const monthTitle = (at: { y: number; m: number }): string => `${S.months[at.m]} ${at.y}`;
