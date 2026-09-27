// @vitest-environment happy-dom
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { STRINGS } from '../core/strings';
import { appStore } from '../store/instance';
import { renderRoute, resetApp } from '../test/app';

const S = STRINGS.home;

const SEATS = ['p0', 'p1', 'p2', 'p3'] as const;

beforeEach(() => {
  resetApp();
});

describe('Home', () => {
  it('shows the header, theme label, subtitle, and empty players state', () => {
    renderRoute('/');

    expect(screen.getByRole('heading', { name: STRINGS.appName })).toBeTruthy();
    expect(screen.getByText('Кръчма')).toBeTruthy();
    expect(screen.getByText(S.subtitle)).toBeTruthy();
    expect(screen.getByText(S.empty)).toBeTruthy();

    const playersSection = screen.getByRole('heading', { name: S.players }).closest('section');
    expect(playersSection).not.toBeNull();
    expect(within(playersSection as HTMLElement).getByText('0')).toBeTruthy();
  });

  it('links "Нова игра" to /setup and "Класация" to /stats', () => {
    renderRoute('/');

    expect(screen.getByRole('link', { name: S.newGame }).getAttribute('href')).toBe('/setup');
    expect(screen.getByRole('link', { name: S.stats }).getAttribute('href')).toBe('/stats');
  });

  it('opens the register sheet from "Нов играч" and shows the saved player in the grid', async () => {
    renderRoute('/');

    await userEvent.click(screen.getByRole('button', { name: S.newPlayer }));
    expect(screen.getByRole('dialog', { name: 'Нов играч' })).toBeTruthy();

    await userEvent.type(screen.getByRole('textbox', { name: 'Име или прякор' }), 'Иво');
    await userEvent.click(screen.getByRole('button', { name: 'Запази' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText('Иво')).toBeTruthy();
  });

  it('opens the register sheet prefilled when tapping a player', async () => {
    renderRoute('/');
    await userEvent.click(screen.getByRole('button', { name: S.newPlayer }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Име или прякор' }), 'Иво');
    await userEvent.click(screen.getByRole('button', { name: 'Запази' }));

    await userEvent.click(screen.getByRole('button', { name: 'Иво' }));

    expect(screen.getByRole('dialog', { name: 'Редакция на играч' })).toBeTruthy();
    const nameInput = screen.getByRole('textbox', { name: 'Име или прякор' }) as HTMLInputElement;
    expect(nameInput.value).toBe('Иво');
  });

  it('opens the theme sheet from "Тема"', async () => {
    renderRoute('/');

    await userEvent.click(screen.getByRole('button', { name: S.theme }));

    expect(screen.getByRole('dialog', { name: 'Атмосфера' })).toBeTruthy();
  });

  it('opens the share sheet from "Сподели / Внос"', async () => {
    renderRoute('/');

    await userEvent.click(screen.getByRole('button', { name: S.share }));

    expect(await screen.findByRole('dialog', { name: STRINGS.share.title })).toBeTruthy();
  });

  it('shows no "Продължи мача" link without a match', () => {
    renderRoute('/');

    expect(screen.queryByRole('link', { name: S.continueMatch })).toBeNull();
  });

  it('shows "Продължи мача" to /table, above "Нова игра", for a playing match', () => {
    appStore.getState().startMatch({ seats: [...SEATS], teamA: 'Ние', teamB: 'Вие', bestOf: 1 });

    renderRoute('/');

    const links = screen.getAllByRole('link');
    const continueIndex = links.findIndex((l) => l.textContent === S.continueMatch);
    const newGameIndex = links.findIndex((l) => l.textContent === S.newGame);
    expect(continueIndex).toBeGreaterThanOrEqual(0);
    expect(newGameIndex).toBeGreaterThan(continueIndex);
    expect(screen.getByRole('link', { name: S.continueMatch }).getAttribute('href')).toBe('/table');
  });

  it('links "Продължи мача" to /end for an ended match', () => {
    appStore.getState().startMatch({ seats: [...SEATS], teamA: 'Ние', teamB: 'Вие', bestOf: 1 });
    appStore.getState().endMatch();

    renderRoute('/');

    expect(screen.getByRole('link', { name: S.continueMatch }).getAttribute('href')).toBe('/end');
  });
});
