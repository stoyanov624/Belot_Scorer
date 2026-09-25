import { Fragment } from 'react';
import { cx } from './cx';

export interface SegmentedProps<T extends string | number> {
  /** Accessible name of the group (the section label shown above it). */
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex gap-1 rounded-2xl border border-line bg-s1 p-1"
    >
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <Fragment key={option.value}>
            {/* biome-ignore lint/a11y/useSemanticElements: ARIA radio pattern; native radio inputs can't be styled this way without extra markup */}
            <button
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => onChange(option.value)}
              className={cx(
                'h-12 flex-1 rounded-xl text-[15px] font-extrabold transition-transform active:scale-[0.97]',
                checked ? 'bg-team-a text-on' : 'text-muted',
              )}
            >
              {option.label}
            </button>
          </Fragment>
        );
      })}
    </div>
  );
}
