import { describe, expect, it } from 'vitest';
import type { MatchRecord } from '../../core/model';
import {
  type Day,
  daysInMonth,
  draftPeriod,
  filterRecords,
  inPeriod,
  monthGrid,
  monthTitle,
  periodLabel,
  presetOf,
  presetPeriod,
  shiftMonth,
  tapDay,
  weekday,
} from './period';

const day = (y: number, m: number, d: number): Day => ({ y, m, d });
const today = day(2026, 9, 1); // 1 October 2026, a Thursday

describe('calendar arithmetic', () => {
  it('knows month lengths, leap years included', () => {
    expect(daysInMonth(2026, 1)).toBe(28);
    expect(daysInMonth(2024, 1)).toBe(29);
    expect(daysInMonth(1900, 1)).toBe(28);
    expect(daysInMonth(2000, 1)).toBe(29);
    expect(daysInMonth(2026, 9)).toBe(31);
  });

  it('counts weekdays from Monday', () => {
    expect(weekday(today)).toBe(3); // Thursday
    expect(weekday(day(2026, 0, 1))).toBe(3); // Thursday
    expect(weekday(day(2024, 1, 29))).toBe(3); // Thursday
    expect(weekday(day(2026, 10, 1))).toBe(6); // Sunday
  });

  it('lays out a month in Monday-first weeks', () => {
    const weeks = monthGrid(2026, 9);
    expect(weeks).toHaveLength(5);
    expect(weeks[0]?.slice(0, 4)).toEqual([null, null, null, day(2026, 9, 1)]);
    expect(weeks.flat().filter(Boolean)).toHaveLength(31);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
  });

  it('steps months across years', () => {
    expect(shiftMonth({ y: 2026, m: 0 }, -1)).toEqual({ y: 2025, m: 11 });
    expect(shiftMonth({ y: 2026, m: 11 }, 1)).toEqual({ y: 2027, m: 0 });
    expect(shiftMonth({ y: 2026, m: 5 }, -12)).toEqual({ y: 2025, m: 5 });
  });
});

describe('presets', () => {
  it('turns presets into periods', () => {
    expect(presetPeriod('all', today)).toBeNull();
    expect(presetPeriod('thisYear', today)).toEqual({
      from: day(2026, 0, 1),
      to: day(2026, 11, 31),
    });
    expect(presetPeriod('lastYear', today)).toEqual({
      from: day(2025, 0, 1),
      to: day(2025, 11, 31),
    });
    expect(presetPeriod('thisMonth', today)).toEqual({
      from: day(2026, 9, 1),
      to: day(2026, 9, 31),
    });
  });

  it('recognises a period that equals a preset', () => {
    expect(presetOf(null, today)).toBe('all');
    expect(presetOf(presetPeriod('lastYear', today), today)).toBe('lastYear');
    expect(presetOf({ from: day(2026, 0, 1), to: day(2026, 2, 31) }, today)).toBeNull();
  });
});

describe('picking a range', () => {
  it('starts, closes in either order, and starts over', () => {
    const a = tapDay(null, day(2026, 2, 10));
    expect(a).toEqual({ from: day(2026, 2, 10), to: null });
    expect(tapDay(a, day(2026, 2, 3))).toEqual({ from: day(2026, 2, 3), to: day(2026, 2, 10) });
    const closed = tapDay(a, day(2026, 2, 20));
    expect(closed).toEqual({ from: day(2026, 2, 10), to: day(2026, 2, 20) });
    expect(tapDay(closed, day(2026, 3, 1))).toEqual({ from: day(2026, 3, 1), to: null });
  });

  it('reads a single tapped day as a one-day period', () => {
    expect(draftPeriod({ from: day(2026, 2, 10), to: null })).toEqual({
      from: day(2026, 2, 10),
      to: day(2026, 2, 10),
    });
    expect(draftPeriod(null)).toBeNull();
  });
});

describe('filtering', () => {
  const record = (id: string, date: number) => ({ id, date }) as unknown as MatchRecord;
  // A fake clock: the timestamp is the day key itself.
  const dayOf = (t: number) => day(Math.floor(t / 10000), Math.floor(t / 100) % 100, t % 100);

  it('includes both ends', () => {
    const p = { from: day(2026, 0, 1), to: day(2026, 0, 31) };
    expect(inPeriod(day(2026, 0, 1), p)).toBe(true);
    expect(inPeriod(day(2026, 0, 31), p)).toBe(true);
    expect(inPeriod(day(2026, 1, 1), p)).toBe(false);
    expect(inPeriod(day(2025, 11, 31), null)).toBe(true);
  });

  it('keeps the records played inside the period', () => {
    const records = [record('a', 20251231), record('b', 20260015), record('c', 20260101)];
    const p = presetPeriod('thisYear', today);
    expect(filterRecords(records, p, dayOf).map((r) => r.id)).toEqual(['b', 'c']);
    expect(filterRecords(records, null, dayOf)).toHaveLength(3);
  });
});

describe('labels', () => {
  it('names presets, single days and ranges', () => {
    expect(periodLabel(null, today)).toBe('Всички');
    expect(periodLabel(presetPeriod('thisMonth', today), today)).toBe('Този месец');
    expect(periodLabel({ from: day(2026, 0, 1), to: day(2026, 2, 31) }, today)).toBe(
      '1 яну – 31 мар 2026',
    );
    expect(periodLabel({ from: day(2025, 11, 20), to: day(2026, 0, 5) }, today)).toBe(
      '20 дек 2025 – 5 яну 2026',
    );
    expect(periodLabel({ from: day(2026, 4, 9), to: day(2026, 4, 9) }, today)).toBe('9 май 2026');
  });

  it('titles a month', () => {
    expect(monthTitle({ y: 2026, m: 9 })).toBe('октомври 2026');
  });
});
