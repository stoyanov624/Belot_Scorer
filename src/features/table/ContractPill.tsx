import type { ContractKey } from '../../core/model';
import { RED_CONTRACTS } from '../../core/rules';
import { STRINGS } from '../../core/strings';
import { cx } from '../../ui/cx';

const PILL =
  'inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-[20px] transition-transform active:scale-95';

/**
 * The 40px contract pill: "Избери игра" before a contract, else the suit symbol and
 * `line` ("Купа · Иван", from `contractLine`).
 */
export function ContractPill({
  contract,
  line,
  onClick,
}: {
  contract: ContractKey | null;
  line: string | null;
  onClick: () => void;
}) {
  if (contract === null || line === null) {
    return (
      <button
        type="button"
        onClick={onClick}
        // Hard to miss (product owner, 2026-10-01): taller, bolder, and ringed while no contract
        // is set, since «Край на раздаване» waits for it. No max-w-full: it may spill into the
        // felt's padding rather than clip its text.
        className={cx(
          PILL,
          'h-12 bg-team-a px-6 text-[17px] font-black text-on ring-4 ring-text/70 shadow-[0_0_28px_var(--color-team-a)]',
        )}
      >
        {STRINGS.table.pickContract}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        PILL,
        'max-w-full border border-line bg-s1 px-3.5 text-sm font-extrabold text-text shadow-[0_6px_16px_oklch(0.08_0.02_50/0.5)]',
      )}
    >
      <span
        aria-hidden
        className={cx(
          'text-xl font-black leading-none',
          RED_CONTRACTS.has(contract) && 'text-suit-red',
        )}
      >
        {STRINGS.contracts[contract].sym}
      </span>
      <span className="truncate">{line}</span>
    </button>
  );
}
