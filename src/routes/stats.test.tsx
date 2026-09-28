// @vitest-environment happy-dom
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Seats } from '../core/model';
import { STRINGS } from '../core/strings';
import { appStore } from '../store/instance';
import { renderRoute, resetApp } from '../test/app';

const S = STRINGS.stats;
// Fixed ids (instead of the store's random nanoid) so a pair's `playerIds` sort deterministically
// into seat order: team A is seats 0/2 ('p0', 'p2'), team B is seats 1/3 ('p1', 'p3').
const SEATED = [
  ['p0', 'Иван'],
  ['p1', 'Петър'],
  ['p2', 'Мария'],
  ['p3', 'Гошо'],
] as const;
const IDS = SEATED.map(([id]) => id);

beforeEach(() => {
  resetApp();
});

/** Seeds the four players with fixed ids and starts a match with them seated N, E, S, W. */
function startMatch() {
  for (const [id, name] of SEATED) {
    const result = appStore.getState().savePlayer({ id, name, emoji: null, photo: null });
    if (!result.ok) throw new Error(`setup failed for ${name}`);
  }
  appStore
    .getState()
    .startMatch({ seats: IDS as unknown as Seats, teamA: 'Ние', teamB: 'Вие', bestOf: 1 });
}

/** Lowers the target score so one deal wins the match outright. */
function lowerTargetScore() {
  appStore
    .getState()
    .updateSettings({ rules: { ...appStore.getState().settings.rules, targetScore: 10 } });
}

/**
 * Plays a hearts deal called by North (Иван, team A) with a belot for North, then saves it with
 * 10 card points for team A: totals become 10 : 6, ending the match and recording it.
 */
function playAndEndMatch() {
  const s = appStore.getState();
  s.setContract('hearts', 0);
  s.addDeclaration(0, 'belot');
  const result = s.saveDeal({ cardPointsA: 10, capo: null });
  if (!result.ok) throw new Error('saveDeal failed');
}

/** Renders /stats and waits for the lazy screen to mount. */
async function renderStats() {
  const rendered = renderRoute('/stats');
  await screen.findByRole('heading', { name: S.title });
  return rendered;
}

/** All row name headings, in the order the screen renders them. */
function rowNames(): string[] {
  return screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent ?? '');
}

describe('Leaderboard', () => {
  it('shows the title, the hint with 0, the empty box and no reset button', async () => {
    await renderStats();

    expect(screen.getByRole('heading', { name: S.title })).toBeTruthy();
    expect(screen.getByText(S.hint(0))).toBeTruthy();
    expect(screen.getByText(S.empty)).toBeTruthy();
    expect(screen.queryByRole('button', { name: S.reset })).toBeNull();
  });

  it('"← Начало" links to /', async () => {
    await renderStats();

    expect(screen.getByRole('link', { name: S.back }).getAttribute('href')).toBe('/');
  });

  describe('one recorded match', () => {
    async function setUp() {
      lowerTargetScore();
      startMatch();
      playAndEndMatch();
      return renderStats();
    }

    it('shows the hint with 1, with "По играчи" selected and 4 rows in rank order', async () => {
      await setUp();

      expect(screen.getByText(S.hint(1))).toBeTruthy();
      const tab = screen.getByRole('radio', { name: S.players });
      expect(tab.getAttribute('aria-checked')).toBe('true');
      expect(rowNames()).toEqual(['Иван', 'Мария', 'Петър', 'Гошо']);
    });

    it("highlights the first row's rank", async () => {
      const { container } = await setUp();

      const first = container.querySelector('[data-rank="1"]');
      expect(first).not.toBeNull();
      expect(first?.textContent).toContain('Иван');
      expect(first?.className).toContain('bg-s2');
    });

    it('shows each row\'s name, sub line, points and "точки", with decorative avatars', async () => {
      const { container } = await setUp();

      expect(container.querySelector('[data-rank="1"]')?.textContent).toContain(
        '1 обяви · 1 белота · 1/1 победи',
      );
      expect(container.querySelector('[data-rank="2"]')?.textContent).toContain(
        '0 обяви · 0 белота · 1/1 победи',
      );
      expect(container.querySelector('[data-rank="3"]')?.textContent).toContain(
        '0 обяви · 0 белота · 0/1 победи',
      );
      expect(screen.getAllByText(S.points)).toHaveLength(4);
      const first = container.querySelector<HTMLElement>('[data-rank="1"]');
      if (!first) throw new Error('missing row');
      expect(within(first).getByText('2')).toBeTruthy(); // Иван's points
      // Decorative: avatars carry no accessible name of their own.
      expect(screen.queryAllByRole('img')).toHaveLength(0);
    });

    it('"По отбори" lists the two pair rows, team-name prefixed, with overlapped avatars', async () => {
      const { container } = await setUp();

      await userEvent.click(screen.getByRole('radio', { name: S.pairs }));

      expect(rowNames()).toEqual(['Иван и Мария', 'Петър и Гошо']);
      expect(container.querySelector('[data-rank="1"]')?.textContent).toContain(
        'Ние · 1 обяви · 1 белота · 1/1 победи',
      );
      expect(container.querySelector('[data-rank="2"]')?.textContent).toContain(
        'Вие · 0 обяви · 0 белота · 0/1 победи',
      );
      const avatars = container.querySelectorAll('[data-rank="1"] [aria-hidden="true"]');
      expect(avatars.length).toBeGreaterThanOrEqual(2);
      expect((avatars[1] as HTMLElement).style.marginLeft).not.toBe('');
    });

    it('arms the reset on the first press, keeping the stats', async () => {
      await setUp();

      await userEvent.click(screen.getByRole('button', { name: S.reset }));

      expect(screen.getByRole('button', { name: S.resetArmed })).toBeTruthy();
      expect(screen.getByText(S.hint(1))).toBeTruthy();
      expect(rowNames()).toHaveLength(4);
    });

    it('clears the leaderboard on the second press', async () => {
      await setUp();

      await userEvent.click(screen.getByRole('button', { name: S.reset }));
      await userEvent.click(screen.getByRole('button', { name: S.resetArmed }));

      expect(appStore.getState().stats).toEqual([]);
      expect(screen.getByText(S.hint(0))).toBeTruthy();
      expect(screen.getByText(S.empty)).toBeTruthy();
      expect(screen.queryByRole('button', { name: S.reset })).toBeNull();
    });

    it('disarms the reset after leaving and returning to the screen', async () => {
      const { router } = await setUp();

      await userEvent.click(screen.getByRole('button', { name: S.reset }));
      expect(screen.getByRole('button', { name: S.resetArmed })).toBeTruthy();

      await userEvent.click(screen.getByRole('link', { name: S.back }));
      router.navigate('/stats');
      await screen.findByRole('heading', { name: S.title });

      expect(screen.getByRole('button', { name: S.reset })).toBeTruthy();
      expect(screen.queryByRole('button', { name: S.resetArmed })).toBeNull();
    });

    it('falls back to the recorded name and an initial avatar for a player no longer in the roster (ADR 0010)', async () => {
      lowerTargetScore();
      startMatch();
      playAndEndMatch();
      // Гошо (seat 3) is no longer seated once the match is left, so the delete is allowed.
      appStore.getState().leaveMatch();
      const removed = appStore.getState().removePlayer('p3');
      if (!removed.ok) throw new Error('removePlayer failed');

      const { container } = await renderStats();

      expect(rowNames()).toContain('Гошо');
      const row = container.querySelector('[data-rank="4"]');
      expect(row?.textContent).toContain('Гошо');
      const avatar = row?.querySelector('[aria-hidden="true"]');
      expect(avatar?.textContent).toBe('Г');
    });
  });
});
