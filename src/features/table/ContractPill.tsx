import type { ContractKey } from '../../core/model';
import { RED_CONTRACTS } from '../../core/rules';
import { STRINGS } from '../../core/strings';
import { cx } from '../../ui/cx';

const PILL =
  'inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-[20px] shadow-[0_6px_16px_oklch(0.08_0.02_50/0.5)] transition-transform active:scale-95';

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
        // No max-w-full: at 390px the pill (114px, as in mockup 04) is wider than the felt's
        // content box and spills into its padding rather than clipping its text.
        className={cx(PILL, 'bg-team-a px-[18px] text-[15px] font-black text-on')}
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
        'max-w-full border border-line bg-s1 px-3.5 text-sm font-extrabold text-text',
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
