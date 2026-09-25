import { cx } from './cx';

const RING = { a: 'border-a', b: 'border-b', line: 'border-line' } as const;

export interface AvatarProps {
  name: string;
  emoji: string | null;
  /** Object URL from usePhotoUrl; wins over the emoji. */
  photoUrl?: string | null;
  size: number;
  ring?: keyof typeof RING;
}

/** Round player avatar: photo, else emoji, else the name's first letter. */
export function Avatar({ name, emoji, photoUrl, size, ring = 'line' }: AvatarProps) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.5) };
  const frame = cx(
    'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] bg-s2 shadow-[0_6px_18px_oklch(0.08_0.02_50/0.6)]',
    RING[ring],
  );
  if (photoUrl) {
    return <img src={photoUrl} alt={name} className={cx(frame, 'object-cover')} style={style} />;
  }
  return (
    <span
      role="img"
      aria-label={name}
      className={cx(frame, 'font-black leading-none')}
      style={style}
    >
      {emoji ?? name.trim().charAt(0).toLocaleUpperCase('bg')}
    </span>
  );
}
