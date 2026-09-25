import { cx } from './cx';

const RING = { a: 'border-team-a', b: 'border-team-b', line: 'border-line' } as const;

export interface AvatarProps {
  name: string;
  emoji: string | null;
  /** Object URL from usePhotoUrl; wins over the emoji. */
  photoUrl?: string | null;
  size: number;
  ring?: keyof typeof RING;
  /**
   * Set when a visible name sits next to the avatar, so it isn't announced twice: the photo
   * gets `alt=""` and the emoji/initial drops its `role`/`aria-label`.
   */
  decorative?: boolean;
}

/** Round player avatar: photo, else emoji, else the name's first letter. */
export function Avatar({
  name,
  emoji,
  photoUrl,
  size,
  ring = 'line',
  decorative = false,
}: AvatarProps) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.5) };
  const frame = cx(
    'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] bg-s2 shadow-[0_6px_18px_oklch(0.08_0.02_50/0.6)]',
    RING[ring],
  );
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={decorative ? '' : name}
        className={cx(frame, 'object-cover')}
        style={style}
      />
    );
  }
  const glyphClass = cx(frame, 'font-black leading-none');
  const glyph = emoji ?? name.trim().charAt(0).toLocaleUpperCase('bg');
  if (decorative) {
    return (
      <span aria-hidden="true" className={glyphClass} style={style}>
        {glyph}
      </span>
    );
  }
  return (
    <span role="img" aria-label={name} className={glyphClass} style={style}>
      {glyph}
    </span>
  );
}
