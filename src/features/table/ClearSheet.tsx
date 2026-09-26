import { STRINGS } from '../../core/strings';
import { useAppStore } from '../../store/instance';
import { Button } from '../../ui/Button';
import { Sheet } from '../../ui/Sheet';

const S = STRINGS.clear;

export interface ClearSheetProps {
  open: boolean;
  onClose: () => void;
}

/** The "Изчистване" sheet (opened from "Изчисти"): restart the current deal, or undo the last saved one. */
export function ClearSheet({ open, onClose }: ClearSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title={S.title} subtitle={S.body}>
      {open && <ClearForm onClose={onClose} />}
    </Sheet>
  );
}

function ClearForm({ onClose }: { onClose: () => void }) {
  const match = useAppStore((s) => s.match);
  const clearCurrentDeal = useAppStore((s) => s.clearCurrentDeal);
  const undoLastDeal = useAppStore((s) => s.undoLastDeal);

  if (!match) return null;

  const savedCount = match.games.length;

  return (
    <>
      <Button
        variant="primary"
        size="lg"
        onClick={() => {
          clearCurrentDeal();
          onClose();
        }}
      >
        {S.current(savedCount + 1)}
      </Button>
      {savedCount > 0 && (
        <Button
          variant="danger"
          size="lg"
          onClick={() => {
            undoLastDeal();
            onClose();
          }}
        >
          {S.undo(savedCount)}
        </Button>
      )}
      <Button onClick={onClose}>{S.cancel}</Button>
    </>
  );
}
