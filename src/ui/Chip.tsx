import type { ButtonHTMLAttributes } from 'react';
import { cx } from './cx';

type Tone = 'a' | 'b' | 'neutral' | 'sunken';

const TONE: Record<Tone, string> = {
  a: 'bg-team-a text-on',
  b: 'bg-team-b text-on',
  neutral: 'bg-s3 text-text',
  /** For chips on an `s2` card (the deal-end sheet's resolution cards). */
  sunken: 'bg-s1 text-text',
};

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: Tone;
  /**
   * Makes the chip a toggle (`aria-pressed`); a selected chip always uses the accent, whatever
   * its tone. Leave it out for a plain action chip (e.g. the table's remove-declaration chips).
   */
  selected?: boolean;
  /**
   * The chip is one option in an ARIA radiogroup: renders `role="radio"` + `aria-checked`
   * instead of `aria-pressed`. Pass together with `selected`; the container owns
   * `role="radiogroup"` and the roving tabindex/arrow-key navigation (see `ui/radio-nav.ts`).
   */
  choice?: boolean;
  size?: 'sm' | 'md';
}

export function Chip({
  tone = 'neutral',
  selected,
  choice,
  size = 'md',
  type = 'button',
  className,
  ...rest
}: ChipProps) {
  return (
    // biome-ignore lint/a11y/useAriaPropsSupportedByRole: choice mode gives the button role="radio", which does support aria-checked; Biome can't see the conditional
    <button
      type={type}
      role={choice ? 'radio' : undefined}
      aria-checked={choice ? Boolean(selected) : undefined}
      aria-pressed={choice ? undefined : selected}
      className={cx(
        'inline-flex items-center justify-center gap-1 font-extrabold transition-transform active:scale-95',
        size === 'sm'
          ? "relative h-[26px] rounded-xl px-2.5 text-xs before:absolute before:-inset-[9px] before:content-['']"
          : 'h-[42px] min-w-11 rounded-[14px] px-3 text-base',
        selected ? 'bg-team-a text-on' : TONE[tone],
        className,
      )}
      {...rest}
    />
  );
}
