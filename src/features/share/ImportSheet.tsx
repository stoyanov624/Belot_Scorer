import { type ChangeEvent, useEffect, useRef, useState } from 'react';
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
  // Bumped by every read attempt (paste, file or the initial `#belot=` code). A read applies
  // its result only if its token is still the latest, so a slower earlier read (e.g. link A,
  // then quickly link B) can never overwrite a faster later one.
  const requestId = useRef(0);

  const show = (next: SharePayload) => {
    setData(next);
    setError(null);
    setDone(null);
    setReplaceArmed(false);
    setConfirmTotals(null);
  };

  const fail = (message: string) => {
    setData(null);
    setError(message);
  };

  // Reads a code the app was opened with, once, as soon as the sheet opens, through the same
  // token guard as `onRead` and `onFile`. Inlined rather than calling `show`/`fail` directly, so
  // the effect doesn't depend on functions that change identity on every render.
  useEffect(() => {
    if (!initialCode) return;
    const token = ++requestId.current;
    void readShared(initialCode).then((result) => {
      if (token !== requestId.current) return;
      if (result.ok) {
        setData(result.data);
        setError(null);
        setDone(null);
        setReplaceArmed(false);
        setConfirmTotals(null);
      } else {
        setData(null);
        setError(S.badCode);
      }
    });
  }, [initialCode]);

  const onRead = async () => {
    const token = ++requestId.current;
    const code = extractCode(text);
    if (!code) {
      fail(S.noCode);
      return;
    }
    const result = await readShared(code);
    if (token !== requestId.current) return;
    if (!result.ok) {
      fail(S.badCode);
      return;
    }
    show(result.data);
  };

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0] ?? null;
    if (!file) return;
    const token = ++requestId.current;
    const fileText = await file.text();
    input.value = '';
    if (token !== requestId.current) return;
    const result = parseSharedFile(fileText);
    if (!result.ok) {
      fail(S.badFile);
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

  const onMerge = async () => {
    if (!data) return;
    finish(await importShared(data, 'merge'));
  };

  const onTake = async () => {
    if (!data) return;
    if (localMatch !== null && needsTakeConfirm(localMatch)) {
      setConfirmTotals(totals(localMatch));
      return;
    }
    finish(await importShared(data, 'take'));
  };

  const onConfirmTake = async () => {
    if (!data) return;
    finish(await importShared(data, 'take'));
  };

  const onReplace = async () => {
    if (!data) return;
    if (!replaceArmed) {
      setReplaceArmed(true);
      return;
    }
    finish(await importShared(data, 'replace'));
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
                <Button variant="danger" onClick={() => void onConfirmTake()}>
                  {SETUP.replaceConfirm}
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button variant="primary" size="lg" onClick={() => void onMerge()}>
                {S.merge}
              </Button>
              {data.match && <Button onClick={() => void onTake()}>{S.take}</Button>}
              <Button variant="dangerText" onClick={() => void onReplace()}>
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
