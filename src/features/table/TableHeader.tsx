import { PreloadLink } from '../../app/PreloadLink';
import { STRINGS } from '../../core/strings';
import { Button, buttonClass } from '../../ui/Button';
import { cx } from '../../ui/cx';

const S = STRINGS.table;

export interface TableHeaderProps {
  /** "Белот · до 151", or the series line. */
  line: string;
  dealNo: number;
  historyCount: number;
  onClear: () => void;
  onTheme: () => void;
}

/** The table's title block and its row of 44px actions, which scrolls sideways when narrow. */
export function TableHeader({ line, dealNo, historyCount, onClear, onTheme }: TableHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2.5">
      <div className="flex min-w-0 flex-[1_1_180px] flex-col">
        <p className="truncate text-xs font-extrabold uppercase tracking-[0.08em] text-team-a">
          {line}
        </p>
        <h1 className="whitespace-nowrap text-[22px] font-black">{S.deal(dealNo)}</h1>
      </div>
      <div className="flex max-w-full flex-[0_1_auto] gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* Not in mockup 04: without it, resume-on-start would leave no way Home (ADR 0011). */}
        <PreloadLink to="/" className={cx(buttonClass('secondary', 'sm'), 'shrink-0')}>
          {STRINGS.setup.back}
        </PreloadLink>
        {/* Sharing arrives in Phase 6. */}
        <Button size="sm" disabled className="shrink-0">
          {S.share}
        </Button>
        <Button size="sm" onClick={onClear} className="shrink-0">
          {S.clear}
        </Button>
        <Button size="sm" onClick={onTheme} className="shrink-0">
          {S.theme}
        </Button>
        <PreloadLink to="/history" className={cx(buttonClass('secondary', 'sm'), 'shrink-0')}>
          {S.history}
          {historyCount > 0 && (
            <>
              {' '}
              <span className="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-[11px] bg-s3 px-1.5 text-xs">
                {historyCount}
              </span>
            </>
          )}
        </PreloadLink>
      </div>
    </header>
  );
}
