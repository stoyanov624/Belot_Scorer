// @vitest-environment happy-dom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { appStore } from '../../store/instance';
import { resetApp } from '../../test/app';
import { ThemeSheet } from './ThemeSheet';

beforeEach(() => {
  resetApp();
});

describe('ThemeSheet', () => {
  it('shows the dialog titled "Атмосфера" with 4 theme buttons and 4 felt buttons when open', () => {
    const onClose = vi.fn();
    render(<ThemeSheet open onClose={onClose} />);

    expect(screen.getByRole('dialog', { name: 'Атмосфера' })).toBeTruthy();
    expect(screen.getByRole('radiogroup', { name: 'Тема' })).toBeTruthy();
    expect(screen.getByRole('radiogroup', { name: 'Маса' })).toBeTruthy();
  });

  it('displays 4 theme buttons with theme names: Кръчма, Вкъщи, Сукно, Късна нощ', () => {
    render(<ThemeSheet open onClose={() => {}} />);
    const themeGroup = screen.getByRole('radiogroup', { name: 'Тема' });

    expect(within(themeGroup).getByRole('radio', { name: /Кръчма/ })).toBeTruthy();
    expect(within(themeGroup).getByRole('radio', { name: /Вкъщи/ })).toBeTruthy();
    expect(within(themeGroup).getByRole('radio', { name: /Сукно/ })).toBeTruthy();
    expect(within(themeGroup).getByRole('radio', { name: /Късна нощ/ })).toBeTruthy();
  });

  it('displays 4 felt buttons with felt names: Дърво, Сукно, Покривка, Камък', () => {
    render(<ThemeSheet open onClose={() => {}} />);
    const feltGroup = screen.getByRole('radiogroup', { name: 'Маса' });

    expect(within(feltGroup).getByRole('radio', { name: 'Дърво' })).toBeTruthy();
    expect(within(feltGroup).getByRole('radio', { name: 'Сукно' })).toBeTruthy();
    expect(within(feltGroup).getByRole('radio', { name: 'Покривка' })).toBeTruthy();
    expect(within(feltGroup).getByRole('radio', { name: 'Камък' })).toBeTruthy();
  });

  it('has "Кръчма" theme and "Дърво" felt with aria-checked="true" by default', () => {
    render(<ThemeSheet open onClose={() => {}} />);

    const themeGroup = screen.getByRole('radiogroup', { name: 'Тема' });
    const feltGroup = screen.getByRole('radiogroup', { name: 'Маса' });

    expect(
      within(themeGroup)
        .getByRole('radio', { name: /Кръчма/ })
        .getAttribute('aria-checked'),
    ).toBe('true');
    expect(
      within(feltGroup).getByRole('radio', { name: 'Дърво' }).getAttribute('aria-checked'),
    ).toBe('true');
  });

  it('clicks "Късна нощ" to set theme to "night"', async () => {
    render(<ThemeSheet open onClose={() => {}} />);

    const themeGroup = screen.getByRole('radiogroup', { name: 'Тема' });
    const nightButton = within(themeGroup).getByRole('radio', { name: /Късна нощ/ });

    await userEvent.click(nightButton);

    expect(appStore.getState().settings.theme).toBe('night');
  });

  it('clicks "Камък" to set felt to "stone"', async () => {
    render(<ThemeSheet open onClose={() => {}} />);

    const feltGroup = screen.getByRole('radiogroup', { name: 'Маса' });
    const stoneButton = within(feltGroup).getByRole('radio', { name: 'Камък' });

    await userEvent.click(stoneButton);

    expect(appStore.getState().settings.felt).toBe('stone');
  });

  it('calls onClose when "Готово" button is clicked', async () => {
    const onClose = vi.fn();
    render(<ThemeSheet open onClose={onClose} />);

    const doneButton = screen.getByRole('button', { name: 'Готово' });

    await userEvent.click(doneButton);

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('updates aria-checked when theme is changed', async () => {
    render(<ThemeSheet open onClose={() => {}} />);

    const themeGroup = screen.getByRole('radiogroup', { name: 'Тема' });
    const pubButton = within(themeGroup).getByRole('radio', { name: /Кръчма/ });
    const nightButton = within(themeGroup).getByRole('radio', { name: /Късна нощ/ });

    expect(pubButton.getAttribute('aria-checked')).toBe('true');
    expect(nightButton.getAttribute('aria-checked')).toBe('false');

    await userEvent.click(nightButton);

    expect(pubButton.getAttribute('aria-checked')).toBe('false');
    expect(nightButton.getAttribute('aria-checked')).toBe('true');
  });

  it('updates aria-checked when felt is changed', async () => {
    render(<ThemeSheet open onClose={() => {}} />);

    const feltGroup = screen.getByRole('radiogroup', { name: 'Маса' });
    const woodButton = within(feltGroup).getByRole('radio', { name: 'Дърво' });
    const stoneButton = within(feltGroup).getByRole('radio', { name: 'Камък' });

    expect(woodButton.getAttribute('aria-checked')).toBe('true');
    expect(stoneButton.getAttribute('aria-checked')).toBe('false');

    await userEvent.click(stoneButton);

    expect(woodButton.getAttribute('aria-checked')).toBe('false');
    expect(stoneButton.getAttribute('aria-checked')).toBe('true');
  });
});
