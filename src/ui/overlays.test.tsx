// @vitest-environment happy-dom
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useRef, useState } from 'react';
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

  it('renders an aside next to the title', () => {
    render(
      <Sheet open onClose={() => {}} title="T" aside={<button type="button">pill</button>}>
        <p>body</p>
      </Sheet>,
    );
    const heading = screen.getByRole('heading', { name: 'T' });
    expect(heading.parentElement?.contains(screen.getByRole('button', { name: 'pill' }))).toBe(
      true,
    );
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

  it('does not call onClose when the caller closes it by setting open to false', async () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Sheet open onClose={onClose} title="T">
        <p>body</p>
      </Sheet>,
    );
    rerender(
      <Sheet open={false} onClose={onClose} title="T">
        <p>body</p>
      </Sheet>,
    );
    // Browsers fire `close` in a later task; give a late event the chance to arrive.
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(onClose).not.toHaveBeenCalled();
  });
});

/** The native toggle event. happy-dom has no ToggleEvent, so set `newState` on a plain Event. */
const toggle = (element: HTMLElement, newState: 'open' | 'closed') =>
  act(() => {
    element.dispatchEvent(
      Object.assign(new Event('toggle'), {
        newState,
        oldState: newState === 'open' ? 'closed' : 'open',
      }),
    );
  });

function TwoPopovers() {
  const [openId, setOpenId] = useState<'A' | 'B' | null>(null);
  const anchorA = useRef<HTMLButtonElement>(null);
  const anchorB = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={anchorA} type="button" onClick={() => setOpenId('A')}>
        A
      </button>
      <button ref={anchorB} type="button" onClick={() => setOpenId('B')}>
        B
      </button>
      <output>{openId ?? 'none'}</output>
      <Popover
        open={openId === 'A'}
        onClose={() => setOpenId(null)}
        anchor={anchorA}
        placement="below"
        label="A обявява"
      >
        <p>A</p>
      </Popover>
      <Popover
        open={openId === 'B'}
        onClose={() => setOpenId(null)}
        anchor={anchorB}
        placement="below"
        label="B обявява"
      >
        <p>B</p>
      </Popover>
    </>
  );
}

describe('Popover', () => {
  it('calls onClose when the browser closes it while open (light dismiss)', async () => {
    render(<TwoPopovers />);
    await userEvent.click(screen.getByRole('button', { name: 'A' }));
    expect(screen.getByRole('status').textContent).toBe('A');
    await toggle(screen.getByRole('dialog', { name: 'A обявява', hidden: true }), 'closed');
    expect(screen.getByRole('status').textContent).toBe('none');
  });

  it("ignores a closed popover's late toggle after another one opened", async () => {
    render(<TwoPopovers />);
    await userEvent.click(screen.getByRole('button', { name: 'A' }));
    await userEvent.click(screen.getByRole('button', { name: 'B' }));
    expect(screen.getByRole('status').textContent).toBe('B');
    // A's `toggle` (closed) arrives asynchronously, after B has already become the open one.
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    await toggle(screen.getByRole('dialog', { name: 'A обявява', hidden: true }), 'closed');
    expect(screen.getByRole('status').textContent).toBe('B');
  });

  // happy-dom has no Popover API (no showPopover/hidePopover, no ToggleEvent), so light dismiss
  // can't happen here; the tests above dispatch the browser's `toggle` event by hand instead.
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
