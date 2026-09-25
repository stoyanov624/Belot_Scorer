// @vitest-environment happy-dom
import { render, renderHook, screen, waitFor } from '@testing-library/react';
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

  it('colours the team ring with a team-* utility, never the border-b width utility', () => {
    render(<Avatar name="Иво" emoji="🐻" size={60} ring="b" />);
    const classes = screen.getByRole('img').className.split(' ');
    expect(classes).toContain('border-team-b');
    expect(classes).not.toContain('border-b');
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
});
