import type { ButtonHTMLAttributes } from 'react';
import { cx } from './cx';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'md' | 'lg';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-team-a text-on',
  secondary: 'bg-s1 text-text border border-line',
  danger: 'bg-transparent text-team-b border border-team-b',
  ghost: 'bg-transparent text-muted',
};
const SIZE: Record<Size, string> = {
  md: 'h-14 rounded-2xl px-4 text-[17px] font-extrabold',
  lg: 'h-16 rounded-[20px] px-5 text-lg font-black',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  type = 'button',
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex min-h-11 items-center justify-center gap-2 transition-transform active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...rest}
    />
  );
}
