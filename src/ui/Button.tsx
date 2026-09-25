import type { ButtonHTMLAttributes } from 'react';
import { cx } from './cx';

type Variant = 'primary' | 'secondary' | 'danger' | 'dangerText' | 'ghost' | 'muted';
type Size = 'sm' | 'md' | 'lg';

const BASE =
  'inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap transition-transform active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100 aria-disabled:active:scale-100';
const VARIANT: Record<Variant, string> = {
  primary: 'bg-team-a text-on',
  secondary: 'bg-s1 text-text border border-line',
  danger: 'bg-transparent text-team-b border border-team-b',
  dangerText: 'bg-transparent text-team-b',
  ghost: 'bg-transparent text-muted',
  muted: 'bg-s3 text-muted',
};
const SIZE: Record<Size, string> = {
  sm: 'h-11 rounded-[14px] px-4 text-[15px] font-extrabold',
  md: 'h-14 rounded-[18px] px-4 text-[17px] font-extrabold',
  lg: 'h-16 rounded-[20px] px-5 text-xl font-black',
};

/**
 * Classes for a button look, e.g. on a router Link. Pass layout-only extras (width, margin)
 * through `className` — never colours, heights, radii or text sizes: without class merging a
 * conflicting utility wins unpredictably. Add a variant or size instead.
 */
export function buttonClass(variant: Variant = 'secondary', size: Size = 'md'): string {
  return cx(BASE, VARIANT[variant], SIZE[size]);
}

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
  return <button type={type} className={cx(buttonClass(variant, size), className)} {...rest} />;
}
