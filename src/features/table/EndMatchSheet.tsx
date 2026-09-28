import { totals } from '../../core/match';
import { STRINGS } from '../../core/strings';
import { useAppStore } from '../../store/instance';
import { Button } from '../../ui/Button';
import { Sheet } from '../../ui/Sheet';

const S = STRINGS.endMatch;

export interface EndMatchSheetProps {
  open: boolean;
  onClose: () => void;
  /** Fires right after `endMatch` records the match (existing store behaviour). */
  onEnded: () => void;
}

/** The "Край на мач" confirmation: end the match by hand, mid-play. */
export function EndMatchSheet({ open, onClose, onEnded }: EndMatchSheetProps) {
  const match = useAppStore((s) => s.match);
  const score = match && totals(match);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={S.title}
      subtitle={score && S.body(score.A, score.B)}
    >
      <EndMatchActions onClose={onClose} onEnded={onEnded} />
    </Sheet>
  );
}

function EndMatchActions({ onClose, onEnded }: { onClose: () => void; onEnded: () => void }) {
  const endMatch = useAppStore((s) => s.endMatch);

  return (
    <div className="grid grid-cols-[1fr_1.6fr] gap-2.5">
      <Button size="lg" onClick={onClose}>
        {S.keep}
      </Button>
      <Button
        variant="dangerFilled"
        size="lg"
        onClick={() => {
          endMatch();
          onEnded();
        }}
      >
        {S.end}
      </Button>
    </div>
  );
}
