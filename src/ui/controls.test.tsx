// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Button, buttonClass } from './Button';
import { Chip } from './Chip';
import { Segmented } from './Segmented';

describe('Button', () => {
  it('is a type="button" by default and fires onClick', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Запази</Button>);
    const button = screen.getByRole('button', { name: 'Запази' });
    expect(button.getAttribute('type')).toBe('button');
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not fire when disabled', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Запази
      </Button>,
    );
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('buttonClass', () => {
  it('matches what Button renders for the same variant and size', () => {
    render(
      <Button variant="primary" size="lg">
        X
      </Button>,
    );
    expect(screen.getByRole('button').className).toBe(buttonClass('primary', 'lg'));
  });

  it('has a 44px small size and a muted variant', () => {
    expect(buttonClass('secondary', 'sm')).toContain('h-11');
    expect(buttonClass('muted', 'md')).toContain('bg-s3');
  });
});

describe('Chip', () => {
  it('exposes selection as aria-pressed', () => {
    render(<Chip selected>Q</Chip>);
    expect(screen.getByRole('button', { name: 'Q' }).getAttribute('aria-pressed')).toBe('true');
  });
});

describe('Segmented', () => {
  const OPTIONS = [
    { value: 1, label: '1 мач' },
    { value: 3, label: '2 от 3' },
  ] as const;

  function Harness() {
    const [value, setValue] = useState<1 | 3>(1);
    return <Segmented label="Брой мачове" options={OPTIONS} value={value} onChange={setValue} />;
  }

  const THREE = [
    { value: 'a', label: 'А' },
    { value: 'b', label: 'Б' },
    { value: 'c', label: 'В' },
  ] as const;

  function ThreeHarness() {
    const [value, setValue] = useState<'a' | 'b' | 'c'>('b');
    return (
      <>
        <button type="button">преди</button>
        <Segmented label="Тема" options={THREE} value={value} onChange={setValue} />
        <button type="button">след</button>
      </>
    );
  }

  const checkedLabel = () =>
    screen.getAllByRole('radio').find((radio) => radio.getAttribute('aria-checked') === 'true')
      ?.textContent;

  it('is one tab stop: Tab lands on the checked option only', async () => {
    render(<ThreeHarness />);
    await userEvent.tab();
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Б' }));
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'след' }));
  });

  it('moves selection and focus with the arrow keys, wrapping at both ends', async () => {
    render(<ThreeHarness />);
    await userEvent.click(screen.getByRole('radio', { name: 'Б' }));
    await userEvent.keyboard('{ArrowRight}');
    expect(checkedLabel()).toBe('В');
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'В' }));
    await userEvent.keyboard('{ArrowDown}');
    expect(checkedLabel()).toBe('А');
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'А' }));
    await userEvent.keyboard('{ArrowLeft}');
    expect(checkedLabel()).toBe('В');
    await userEvent.keyboard('{ArrowUp}');
    expect(checkedLabel()).toBe('Б');
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Б' }));
  });

  it('is a labelled radio group that moves the checked option on click', async () => {
    render(<Harness />);
    expect(screen.getByRole('radiogroup', { name: 'Брой мачове' })).toBeTruthy();
    const second = screen.getByRole('radio', { name: '2 от 3' });
    expect(second.getAttribute('aria-checked')).toBe('false');
    await userEvent.click(second);
    expect(second.getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: '1 мач' }).getAttribute('aria-checked')).toBe('false');
  });
});
