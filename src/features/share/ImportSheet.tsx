import { type ChangeEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { resumePath } from '../../app/resume';
import { type ImportResult, needsTakeConfirm } from '../../core/import';
import { totals } from '../../core/match';
import { extractCode, type SharePayload } from '../../core/share';
import { STRINGS } from '../../core/strings';
import { parseSharedFile, readShared } from '../../share/codec';
import { useAppStore } from '../../store/instance';
import { Button, buttonClass } from '../../ui/Button';
import { Sheet, SheetActions } from '../../ui/Sheet';
import { importDone, importLines } from './copy';

const S = STRINGS.import;
const SETUP = STRINGS.setup;

export interface ImportSheetProps {
  open: boolean;
  onClose: () => void;
  /** A code the app was opened with (`#belot=`); Task 8 wires it from Home's `?import=`. */
  initialCode?: string | null;
}

/** The "Внос" bottom sheet: paste a link/code or choose a file, then merge, take or replace. */
export default function ImportSheet({ open, onClose, initialCode = null }: ImportSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title={S.title} subtitle={S.intro}>
      {open && <ImportForm onClose={onClose} initialCode={initialCode} />}
    </Sheet>
  );
}

function ImportForm({ onClose, initialCode }: { onClose: () => void; initialCode: string | null }) {
  const navigate = useNavigate();
  const localMatch = useAppStore((s) => s.match);
  const importShared = useAppStore((s) => s.importShared);

  const [text, setText] = useState('');
  const [data, setData] = useState<SharePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [replaceArmed, setReplaceArmed] = useState(false);
  // Set only while the inline "start a new match?" confirmation replaces the action buttons;
  // holds the local match's totals for its body text.
  const [confirmTotals, setConfirmTotals] = useState<{ A: number; B: number } | null>(null);

  // Reads a code the app was opened with, once, as soon as the sheet opens. A stale result
  // from a slower read (e.g. the sheet closed meanwhile) is dropped by the `active` flag.
  useEffect(() => {
    let active = true;
    if (!initialCode) return;
    void readShared(initialCode).then((result) => {
      if (!active) return;
      if (result.ok) {
        setData(result.data);
        setError(null);
        setDone(null);
        setReplaceArmed(false);
        setConfirmTotals(null);
      } else {
        setError(S.badCode);
      }
    });
    return () => {
      active = false;
    };
  }, [initialCode]);

  const show = (next: SharePayload) => {
    setData(next);
    setError(null);
    setDone(null);
    setReplaceArmed(false);
    setConfirmTotals(null);
  };

  const onRead = async () => {
    const code = extractCode(text);
    if (!code) {
      setData(null);
      setError(S.noCode);
      return;
    }
    const result = await readShared(code);
    if (!result.ok) {
      setData(null);
      setError(S.badCode);
      return;
    }
    show(result.data);
  };

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0] ?? null;
    if (!file) return;
    const text = await file.text();
    input.value = '';
    const result = parseSharedFile(text);
    if (!result.ok) {
      setData(null);
      setError(S.badFile);
      return;
    }
    show(result.data);
  };

  const finish = (result: ImportResult) => {
    setDone(importDone(result));
    setData(null);
    setError(null);
    setReplaceArmed(false);
    setConfirmTotals(null);
    if (result.tookMatch) {
      onClose();
      navigate(resumePath(result.match) ?? '/');
    }
  };

  const onMerge = () => {
    if (!data) return;
    finish(importShared(data, 'merge'));
  };

  const onTake = () => {
    if (!data) return;
    if (localMatch && needsTakeConfirm(localMatch)) {
      setConfirmTotals(totals(localMatch));
      return;
    }
    finish(importShared(data, 'take'));
  };

  const onReplace = () => {
    if (!data) return;
    if (!replaceArmed) {
      setReplaceArmed(true);
      return;
    }
    finish(importShared(data, 'replace'));
  };

  return (
    <>
      <p className="text-[13px] font-extrabold uppercase tracking-[0.06em] text-muted">{S.or}</p>
      <textarea
        aria-label={S.pasteLabel}
        placeholder={S.placeholder}
        rows={3}
        value={text}
        onChange={(event) => setText(event.target.value)}
        className="w-full resize-none rounded-2xl border border-line bg-bg p-3 text-sm font-semibold text-text outline-none"
      />
      <div className="grid grid-cols-2 gap-2.5">
        <Button onClick={() => void onRead()}>{S.read}</Button>
        <label className={buttonClass('secondary', 'md')}>
          {S.file}
          <input
            type="file"
            accept=".belot,.json,application/json"
            className="hidden"
            onChange={(event) => void onFile(event)}
          />
        </label>
      </div>

      {error && <p className="text-sm font-extrabold text-team-b">{error}</p>}

      {data && (
        <>
          <div className="flex flex-col gap-1.5 rounded-[18px] bg-s2 p-3.5">
            <p className="text-base font-black">{S.found}</p>
            {importLines(data).map((line) => (
              <p key={line} className="text-sm font-bold">
                {line}
              </p>
            ))}
          </div>

          {confirmTotals ? (
            <>
              <p className="text-sm font-semibold text-pretty text-muted">
                {SETUP.replaceBody(confirmTotals.A, confirmTotals.B)}
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <Button onClick={() => setConfirmTotals(null)}>{SETUP.replaceCancel}</Button>
                <Button variant="danger" onClick={() => finish(importShared(data, 'take'))}>
                  {SETUP.replaceConfirm}
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button variant="primary" size="lg" onClick={onMerge}>
                {S.merge}
              </Button>
              {data.match && <Button onClick={onTake}>{S.take}</Button>}
              <Button variant="dangerText" onClick={onReplace}>
                {replaceArmed ? S.replaceArmed : S.replace}
              </Button>
            </>
          )}
        </>
      )}

      {done && (
        <p role="status" className="text-sm font-extrabold text-team-a">
          {done}
        </p>
      )}

      <SheetActions>
        <Button size="lg" className="w-full" onClick={onClose}>
          {S.close}
        </Button>
      </SheetActions>
    </>
  );
}
