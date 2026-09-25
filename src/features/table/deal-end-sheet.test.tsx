// @vitest-environment happy-dom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DeclKey, Seat, Seats } from '../../core/model';
import { STRINGS } from '../../core/strings';
import { appStore } from '../../store/instance';
import { resetApp } from '../../test/app';
import { DealEndSheet } from './DealEndSheet';

const S = STRINGS.deal;
const NAMES = ['Иван', 'Петър', 'Мария', 'Гошо'] as const;

beforeEach(() => {
  resetApp();
});

/** Seeds the four players, starts a match (N, E, S, W) and sets a hearts contract. */
function startMatch() {
  const ids = NAMES.map((name) => {
    const result = appStore.getState().savePlayer({ id: null, name, emoji: null, photo: null });
    if (!result.ok) throw new Error(`setup failed for ${name}`);
    return result.id;
  });
  appStore
    .getState()
    .startMatch({ seats: ids as unknown as Seats, teamA: 'Ние', teamB: 'Вие', bestOf: 1 });
  appStore.getState().setContract('hearts', 0);
}

function declare(...decls: [Seat, DeclKey][]) {
  for (const [seat, key] of decls) appStore.getState().addDeclaration(seat, key);
}

const current = () => appStore.getState().match?.current ?? [];

function renderSheet(props: Partial<Parameters<typeof DealEndSheet>[0]> = {}) {
  const onClose = props.onClose ?? vi.fn();
  render(
    <DealEndSheet
      open
      onClose={onClose}
      onChangeContract={() => {}}
      onSaved={() => {}}
      {...props}
    />,
  );
  return { onClose };
}

/** The resolution card that belongs to `name`, found by the player name it shows. */
const card = (name: string) => {
  const item = screen.getAllByRole('listitem').find((li) => within(li).queryByText(name));
  if (!item) throw new Error(`no card for ${name}`);
  return item;
};

const chipLabels = (el: HTMLElement) =>
  within(el)
    .getAllByRole('button')
    .map((b) => b.textContent);

describe('DealEndSheet, step 1', () => {
  it('shows one card per sequence with the player, "Терца · 2", "до" and the tops from core', () => {
    startMatch();
    declare([0, 'terca'], [1, 'terca'], [0, 'belot']);
    renderSheet();

    const sheet = screen.getByRole('dialog', { name: S.resolveTitle });
    expect(within(sheet).getByText(S.resolveHint)).toBeTruthy();
    // Belot has nothing to resolve, so it gets no card.
    expect(within(sheet).getAllByRole('listitem')).toHaveLength(2);

    for (const name of ['Иван', 'Петър']) {
      const c = card(name);
      expect(within(c).getByText('Терца · 2')).toBeTruthy();
      expect(within(c).getByText(S.to)).toBeTruthy();
      expect(chipLabels(c)).toEqual(['9', '10', 'J', 'Q', 'K', 'A']);
    }
  });

  it('shows a four of a kind with "от" and the ranks Q K 10 A 9 J, labelled by its points once ranked', async () => {
    startMatch();
    declare([2, 'kare']);
    renderSheet();

    const c = card('Мария');
    expect(within(c).getByText('Каре')).toBeTruthy();
    expect(within(c).getByText(S.from)).toBeTruthy();
    expect(chipLabels(c)).toEqual(['Q', 'K', '10', 'A', '9', 'J']);

    await userEvent.click(within(c).getByRole('button', { name: 'J' }));

    expect(current()[0]?.rank).toBe('J');
    expect(within(card('Мария')).getByText('Каре · 20')).toBeTruthy();
    expect(
      within(card('Мария')).getByRole('button', { name: 'J' }).getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('blocks "Напред" with an error while equal sequences on both teams have no tops', async () => {
    startMatch();
    declare([0, 'terca'], [1, 'terca']);
    renderSheet();

    expect(screen.getByText(S.errors['seq-top-missing'])).toBeTruthy();
    const next = screen.getByRole('button', { name: S.next });
    expect(next.getAttribute('aria-disabled')).toBe('true');

    await userEvent.click(next);

    expect(screen.getByRole('dialog', { name: S.resolveTitle })).toBeTruthy();
  });

  it('resolves the clash from the picked tops and moves on to step 2', async () => {
    startMatch();
    declare([0, 'terca'], [1, 'terca']);
    renderSheet();

    // No status while the clash is undecided.
    expect(screen.queryByText(S.counts)).toBeNull();
    expect(screen.queryByText(S.drops)).toBeNull();

    await userEvent.click(within(card('Иван')).getByRole('button', { name: 'K' }));
    await userEvent.click(within(card('Петър')).getByRole('button', { name: 'Q' }));

    expect(within(card('Иван')).getByText(S.counts)).toBeTruthy();
    expect(within(card('Петър')).getByText(S.drops)).toBeTruthy();
    expect(screen.getByText(S.seqWin('Ние'))).toBeTruthy();
    expect(screen.queryByText(S.errors['seq-top-missing'])).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: S.next }));

    expect(screen.getByRole('dialog', { name: S.pointsTitle(1) })).toBeTruthy();
  });

  it('shows no status or verdict when only one team declared sequences', () => {
    startMatch();
    declare([0, 'terca'], [2, 'kvarta']);
    renderSheet();

    expect(screen.queryByText(S.counts)).toBeNull();
    expect(screen.queryByText(S.seqWin('Ние'))).toBeNull();
  });

  it('clears a top when its selected chip is tapped again', async () => {
    startMatch();
    declare([0, 'terca']);
    renderSheet();

    const k = () => within(card('Иван')).getByRole('button', { name: 'K' });
    expect(k().getAttribute('aria-pressed')).toBe('false');

    await userEvent.click(k());
    expect(current()[0]?.top).toBe('K');
    expect(k().getAttribute('aria-pressed')).toBe('true');

    await userEvent.click(k());
    expect(current()[0]?.top).toBe(null);
    expect(k().getAttribute('aria-pressed')).toBe('false');
  });

  it('"Отказ" closes the sheet and keeps the declarations with their tops and ranks', async () => {
    startMatch();
    declare([0, 'terca'], [1, 'kare']);
    const { onClose } = renderSheet();

    await userEvent.click(within(card('Иван')).getByRole('button', { name: 'A' }));
    await userEvent.click(within(card('Петър')).getByRole('button', { name: '9' }));
    await userEvent.click(screen.getByRole('button', { name: S.cancel }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(current().map((d) => [d.key, d.top, d.rank])).toEqual([
      ['terca', 'A', null],
      ['kare', null, '9'],
    ]);
  });

  it('starts again at step 1 when reopened after moving on', async () => {
    startMatch();
    declare([0, 'terca']);
    const props = { onClose: () => {}, onChangeContract: () => {}, onSaved: () => {} };
    const { rerender } = render(<DealEndSheet open {...props} />);

    await userEvent.click(screen.getByRole('button', { name: S.next }));
    expect(screen.getByRole('dialog', { name: S.pointsTitle(1) })).toBeTruthy();

    rerender(<DealEndSheet open={false} {...props} />);
    rerender(<DealEndSheet open {...props} />);

    expect(screen.getByRole('dialog', { name: S.resolveTitle })).toBeTruthy();
  });

  it('starts at step 2 when the deal has no sequence or four of a kind', () => {
    startMatch();
    declare([0, 'belot']);
    renderSheet();

    expect(screen.getByRole('dialog', { name: S.pointsTitle(1) })).toBeTruthy();
  });
});
