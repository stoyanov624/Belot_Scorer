// @vitest-environment happy-dom
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Avatar } from './Avatar';
import { usePhotoUrl } from './usePhotoUrl';

describe('Avatar', () => {
  it('shows the photo when there is one, with the name as alt text', () => {
    render(<Avatar name="Иво" emoji="🐻" photoUrl="blob:x" size={60} />);
    expect(screen.getByRole('img', { name: 'Иво' }).getAttribute('src')).toBe('blob:x');
  });

  it('shows the emoji otherwise, labelled with the name', () => {
    render(<Avatar name="Иво" emoji="🐻" size={60} />);
    expect(screen.getByRole('img', { name: 'Иво' }).textContent).toBe('🐻');
  });

  it('falls back to the first letter of the name', () => {
    render(<Avatar name="мила" emoji={null} size={60} />);
    expect(screen.getByRole('img', { name: 'мила' }).textContent).toBe('М');
  });

  it('sizes itself from the size prop', () => {
    render(<Avatar name="Иво" emoji="🐻" size={68} />);
    expect(screen.getByRole('img').style.width).toBe('68px');
  });

  it('lets a style override the numeric size (the table passes a clamp() width)', () => {
    // happy-dom drops clamp() values, so a plain length stands in for it here.
    render(<Avatar name="Иво" emoji="🐻" size={92} style={{ width: '5rem', height: '5rem' }} />);
    expect(screen.getByRole('img').style.width).toBe('5rem');
    expect(screen.getByRole('img').style.fontSize).toBe('46px');
  });

  it('colours the team ring with a team-* utility, never the border-b width utility', () => {
    render(<Avatar name="Иво" emoji="🐻" size={60} ring="b" />);
    const classes = screen.getByRole('img').className.split(' ');
    expect(classes).toContain('border-team-b');
    expect(classes).not.toContain('border-b');
  });

  it('drops its accessible name and role when decorative, next to a visible name', () => {
    const { rerender } = render(<Avatar name="Иво" emoji="🐻" size={60} decorative />);
    expect(screen.queryByRole('img')).toBeNull();

    rerender(<Avatar name="Иво" emoji="🐻" photoUrl="blob:x" size={60} decorative />);
    expect(screen.queryByRole('img')).toBeNull();
    const img = document.querySelector('img');
    expect(img?.getAttribute('alt')).toBe('');
  });
});

describe('usePhotoUrl', () => {
  it('returns null without a photo id', () => {
    const { result } = renderHook(() => usePhotoUrl(null, { get: vi.fn() }));
    expect(result.current).toBeNull();
  });

  it('loads the blob into an object URL and revokes it on unmount', async () => {
    const blob = new Blob(['x'], { type: 'image/jpeg' });
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:photo');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const { result, unmount } = renderHook(() => usePhotoUrl('ph1', { get: async () => blob }));

    await waitFor(() => expect(result.current).toBe('blob:photo'));
    expect(create).toHaveBeenCalledWith(blob);
    unmount();
    expect(revoke).toHaveBeenCalledWith('blob:photo');
  });

  it('stays null when the photo read fails', async () => {
    const create = vi.spyOn(URL, 'createObjectURL');
    let reject: (error: Error) => void = () => {};
    const get = () =>
      new Promise<Blob | undefined>((_, fail) => {
        reject = fail;
      });
    const { result } = renderHook(() => usePhotoUrl('ph1', { get }));
    await act(async () => reject(new Error('idb down')));
    expect(result.current).toBeNull();
    expect(create).not.toHaveBeenCalled();
  });
});
