import type { ButtonHTMLAttributes } from 'react';
import { cx } from './cx';

type Tone = 'a' | 'b' | 'neutral';

const TONE: Record<Tone, string> = {
  a: 'bg-team-a text-on',
  b: 'bg-team-b text-on',
  neutral: 'bg-s3 text-text',
};

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: Tone;
  /**
   * Makes the chip a toggle (`aria-pressed`); a selected chip always uses the accent, whatever
   * its tone. Leave it out for a plain action chip (e.g. the table's remove-declaration chips).
   */
  selected?: boolean;
  size?: 'sm' | 'md';
}

export function Chip({
  tone = 'neutral',
  selected,
  size = 'md',
  type = 'button',
  className,
  ...rest
}: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cx(
        'inline-flex items-center justify-center gap-1 font-extrabold transition-transform active:scale-95',
        size === 'sm'
          ? 'h-[26px] rounded-xl px-2.5 text-xs'
          : 'h-[42px] min-w-11 rounded-[14px] px-3 text-base',
        selected ? 'bg-team-a text-on' : TONE[tone],
        className,
      )}
      {...rest}
    />
  );
}
