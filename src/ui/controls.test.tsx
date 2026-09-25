// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';
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
