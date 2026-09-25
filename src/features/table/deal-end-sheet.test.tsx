// @vitest-environment happy-dom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContractKey, DeclKey, Seat, Seats } from '../../core/model';
import { STRINGS } from '../../core/strings';
import { appStore } from '../../store/instance';
import { resetApp } from '../../test/app';
import { DealEndSheet } from './DealEndSheet';

const S = STRINGS.deal;
const NAMES = ['Иван', 'Петър', 'Мария', 'Гошо'] as const;

beforeEach(() => {
  resetApp();
});

/** Seeds the four players, starts a match (N, E, S, W) and sets the contract (hearts by North). */
function startMatch(contract: ContractKey = 'hearts', caller: Seat = 0) {
  const ids = NAMES.map((name) => {
    const result = appStore.getState().savePlayer({ id: null, name, emoji: null, photo: null });
    if (!result.ok) throw new Error(`setup failed for ${name}`);
    return result.id;
  });
  appStore
    .getState()
    .startMatch({ seats: ids as unknown as Seats, teamA: 'Ние', teamB: 'Вие', bestOf: 1 });
  appStore.getState().setContract(contract, caller);
}

function declare(...decls: [Seat, DeclKey][]) {
  for (const [seat, key] of decls) appStore.getState().addDeclaration(seat, key);
}

const current = () => appStore.getState().match?.current ?? [];

function renderSheet(props: Partial<Parameters<typeof DealEndSheet>[0]> = {}) {
  const onClose = props.onClose ?? vi.fn();
  const onChangeContract = props.onChangeContract ?? vi.fn();
  const onSaved = props.onSaved ?? vi.fn();
  render(
    <DealEndSheet
      open
      {...props}
      onClose={onClose}
      onChangeContract={onChangeContract}
      onSaved={onSaved}
    />,
  );
  return { onClose, onChangeContract, onSaved };
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
    expect(sheet.getAttribute('aria-describedby')).toBe(within(sheet).getByText(S.resolveHint).id);
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

describe('DealEndSheet, step 2', () => {
  const inputA = () => screen.getByLabelText('Ние') as HTMLInputElement;
  const inputB = () => screen.getByLabelText('Вие') as HTMLInputElement;

  /** The calculation row labelled `label`, as [label, A, B]. */
  const calcRow = (label: string) => {
    const row = screen
      .getAllByRole('row')
      .find((r) => within(r).queryByRole('rowheader')?.textContent === label);
    if (!row) throw new Error(`no row ${label}`);
    return [
      within(row).getByRole('rowheader').textContent,
      ...within(row)
        .getAllByRole('cell')
        .map((c) => c.textContent),
    ];
  };

  const verdictBox = () => document.querySelector('[data-verdict]');

  it('shows the title, the hint under it and the contract pill beside it', () => {
    startMatch();
    renderSheet();

    const sheet = screen.getByRole('dialog', { name: S.pointsTitle(1) });
    expect(sheet.getAttribute('aria-describedby')).toBe(
      within(sheet).getByText(S.hintColor(16)).id,
    );
    const pill = within(sheet).getByRole('button', { name: 'Купа' });
    expect(pill.textContent).toBe('♥Купа');
  });

  it('shows the no-trumps hint', () => {
    startMatch('nt');
    renderSheet();

    expect(screen.getByText(S.hintNt(13))).toBeTruthy();
  });

  it('asks the table to change the contract from the pill', async () => {
    startMatch();
    const { onChangeContract } = renderSheet();

    await userEvent.click(screen.getByRole('button', { name: 'Купа' }));

    expect(onChangeContract).toHaveBeenCalledOnce();
  });

  it('labels the inputs by team name, numeric, and fills the other with max − value', async () => {
    startMatch();
    renderSheet();

    expect(inputA().getAttribute('inputmode')).toBe('numeric');
    expect(inputB().getAttribute('inputmode')).toBe('numeric');

    await userEvent.type(inputA(), '10');
    expect(inputB().value).toBe('6');

    await userEvent.clear(inputB());
    expect(inputA().value).toBe('');
    await userEvent.type(inputB(), '4');
    expect(inputA().value).toBe('12');
  });

  it('shows the calculation and the made verdict', async () => {
    startMatch();
    renderSheet();

    await userEvent.type(inputA(), '10');

    expect(calcRow(S.rows.cards)).toEqual([S.rows.cards, '10', '6']);
    expect(calcRow(S.rows.decls)).toEqual([S.rows.decls, '0', '0']);
    expect(calcRow(S.rows.total)).toEqual([S.rows.total, '10', '6']);
    expect(calcRow(S.rows.match)).toEqual([S.rows.match, '10', '6']);
    expect(verdictBox()?.textContent).toBe('Ние изкараха играта.');
    expect(verdictBox()?.getAttribute('data-verdict')).toBe('ok');
  });

  it('shows "Общо ×2" for no trumps', async () => {
    startMatch('nt');
    renderSheet();

    await userEvent.type(inputA(), '8');

    expect(calcRow(S.rows.totalNt)).toEqual([S.rows.totalNt, '16', '10']);
  });

  it('shows the inside verdict with its styling', async () => {
    startMatch('hearts', 1);
    renderSheet();

    await userEvent.type(inputA(), '10');

    expect(verdictBox()?.textContent).toBe('Вътре! Ние взимат всички 16 точки.');
    expect(verdictBox()?.getAttribute('data-verdict')).toBe('inside');
    expect(verdictBox()?.className).toContain('bg-team-b');
    expect(verdictBox()?.className).toContain('text-on');
  });

  it('shows the hanging verdict', async () => {
    startMatch();
    renderSheet();

    await userEvent.type(inputA(), '8');

    expect(verdictBox()?.textContent).toBe(
      'Висяща: Ние не записват, 8 т. висят за следващото раздаване.',
    );
    expect(verdictBox()?.getAttribute('data-verdict')).toBe('hang');
    expect(verdictBox()?.className).toContain('bg-s3');
  });

  it('toggles capot per team: inputs show max/0 and the rows and verdict follow', async () => {
    startMatch();
    renderSheet();
    const [capoA] = screen.getAllByRole('button', { name: S.capo });
    if (!capoA) throw new Error('no capo button');

    expect(capoA.getAttribute('aria-pressed')).toBe('false');
    await userEvent.click(capoA);

    expect(capoA.getAttribute('aria-pressed')).toBe('true');
    expect(inputA().value).toBe('16');
    expect(inputB().value).toBe('0');
    expect(calcRow(S.rows.cardsCapo)).toEqual([S.rows.cardsCapo, '25', '0']);
    expect(verdictBox()?.textContent?.startsWith('Капо за Ние (+9).')).toBe(true);

    await userEvent.click(capoA);

    expect(capoA.getAttribute('aria-pressed')).toBe('false');
    expect(screen.queryByRole('rowheader', { name: S.rows.cardsCapo })).toBeNull();
    expect(screen.getByText(S.errMissing)).toBeTruthy();
  });

  it('shows capot for the other team as 0/max', async () => {
    startMatch();
    renderSheet();
    const capoB = screen.getAllByRole('button', { name: S.capo })[1];
    if (!capoB) throw new Error('no capo button');

    await userEvent.click(capoB);

    expect(inputA().value).toBe('0');
    expect(inputB().value).toBe('16');
  });

  it('typing clears capot', async () => {
    startMatch();
    renderSheet();
    const [capoA] = screen.getAllByRole('button', { name: S.capo });
    if (!capoA) throw new Error('no capo button');

    await userEvent.click(capoA);
    await userEvent.clear(inputA());
    await userEvent.type(inputA(), '9');

    expect(capoA.getAttribute('aria-pressed')).toBe('false');
    expect(inputB().value).toBe('7');
  });

  it('blocks saving with an error for missing or out-of-range points', async () => {
    startMatch();
    const { onSaved } = renderSheet();
    const save = screen.getByRole('button', { name: S.save });

    expect(screen.getByText(S.errMissing)).toBeTruthy();
    expect(verdictBox()).toBeNull();
    expect(save.getAttribute('aria-disabled')).toBe('true');
    await userEvent.click(save);
    expect(onSaved).not.toHaveBeenCalled();

    await userEvent.type(inputA(), '17');

    expect(screen.getByText(S.errRange(16))).toBeTruthy();
    expect(save.getAttribute('aria-disabled')).toBe('true');
    await userEvent.click(save);
    expect(onSaved).not.toHaveBeenCalled();
    expect(appStore.getState().match?.games).toHaveLength(0);
  });

  it('saves the deal through the store and reports whether the match ended', async () => {
    startMatch();
    const { onSaved } = renderSheet();

    await userEvent.type(inputA(), '10');
    await userEvent.click(screen.getByRole('button', { name: S.save }));

    expect(appStore.getState().match?.games).toEqual([
      expect.objectContaining({ a: 10, b: 6, contract: 'hearts', caller: 0 }),
    ]);
    expect(onSaved).toHaveBeenCalledWith(false);
  });

  it('"Назад" closes the sheet when it opened at step 2', async () => {
    startMatch();
    const { onClose } = renderSheet();

    await userEvent.click(screen.getByRole('button', { name: S.back }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('"Назад" returns to step 1 when the deal had declarations to resolve', async () => {
    startMatch();
    declare([0, 'terca']);
    const { onClose } = renderSheet();

    await userEvent.click(screen.getByRole('button', { name: S.next }));
    await userEvent.click(screen.getByRole('button', { name: S.back }));

    expect(screen.getByRole('dialog', { name: S.resolveTitle })).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });
});
