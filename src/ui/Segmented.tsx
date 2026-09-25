import { Fragment, type KeyboardEvent } from 'react';
import { cx } from './cx';

const STEP: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

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
  // ARIA radio group: arrows move the selection and the focus together, wrapping at the ends.
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = STEP[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const next = (index + step + options.length) % options.length;
    const option = options[next];
    if (!option) return;
    onChange(option.value);
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
      [next]?.focus();
  };

  // One tab stop: the checked option, or the first one if none is checked.
  const tabStop = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex gap-1 rounded-2xl border border-line bg-s1 p-1"
    >
      {options.map((option, index) => {
        const checked = option.value === value;
        return (
          <Fragment key={option.value}>
            {/* biome-ignore lint/a11y/useSemanticElements: ARIA radio pattern; native radio inputs can't be styled this way without extra markup */}
            <button
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={index === tabStop ? 0 : -1}
              onClick={() => onChange(option.value)}
              onKeyDown={(event) => onKeyDown(event, index)}
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
