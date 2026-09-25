// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Popover } from './Popover';
import { Sheet } from './Sheet';

describe('Sheet', () => {
  it('opens as a modal dialog titled by its heading', () => {
    render(
      <Sheet open onClose={() => {}} title="Място: Север">
        <p>body</p>
      </Sheet>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Място: Север' }) as HTMLDialogElement;
    expect(dialog.open).toBe(true);
  });

  it('closes when the open prop turns false', () => {
    const { rerender } = render(
      <Sheet open onClose={() => {}} title="T">
        <p>body</p>
      </Sheet>,
    );
    rerender(
      <Sheet open={false} onClose={() => {}} title="T">
        <p>body</p>
      </Sheet>,
    );
    expect((screen.getByRole('dialog', { hidden: true }) as HTMLDialogElement).open).toBe(false);
  });

  it('calls onClose on an overlay tap, not on a tap inside the panel', async () => {
    const onClose = vi.fn();
    render(
      <Sheet open onClose={onClose} title="T">
        <p>body</p>
      </Sheet>,
    );
    await userEvent.click(screen.getByText('body'));
    expect(onClose).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('reports a native close (Esc) through onClose', () => {
    const onClose = vi.fn();
    render(
      <Sheet open onClose={onClose} title="T">
        <p>body</p>
      </Sheet>,
    );
    (screen.getByRole('dialog') as HTMLDialogElement).close();
    expect(onClose).toHaveBeenCalled();
  });
});

describe('Popover', () => {
  // happy-dom has no Popover API (no showPopover/hidePopover, no ToggleEvent), so light-dismiss
  // and the toggle-driven onClose can't run in this environment. These tests cover what happy-dom
  // can observe: the card renders labelled, with its content, and declares the native popover.
  it('renders labelled with its content and the native popover attribute while open', () => {
    const anchor = createRef<HTMLButtonElement>();
    render(
      <>
        <button ref={anchor} type="button">
          Иво
        </button>
        <Popover open onClose={() => {}} anchor={anchor} placement="below" label="Иво обявява">
          <p>Белот</p>
        </Popover>
      </>,
    );
    const popover = screen.getByRole('dialog', { name: 'Иво обявява' });
    expect(popover).toBeTruthy();
    expect(popover.getAttribute('popover')).toBe('auto');
    expect(screen.getByText('Белот')).toBeTruthy();
  });
});
