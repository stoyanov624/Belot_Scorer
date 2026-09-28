import type Scanner from 'qr-scanner';
import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { resumePath } from '../../app/resume';
import { type ImportResult, needsTakeConfirm } from '../../core/import';
import { totals } from '../../core/match';
import { extractCode, readScanText, type ScanProgress, type SharePayload } from '../../core/share';
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

  const [scanning, setScanning] = useState(false);
  // `{ got, total }` while a multi-part scan is being collected; null before the first part
  // and once a scan finishes, stops or fails.
  const [scanProgress, setScanProgress] = useState<{ got: number; total: number } | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<Scanner | null>(null);
  // The multi-part session collected so far (Task 1's reducer state); reset whenever scanning
  // (re)starts.
  const scanSession = useRef<ScanProgress | null>(null);

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

  // The guarded read path shared by pasting, the `#belot=` startup code and a completed scan:
  // bumps the token first, so a slower earlier read can never overwrite a faster later one.
  const readCode = async (code: string) => {
    const token = ++requestId.current;
    const result = await readShared(code);
    if (token !== requestId.current) return;
    if (!result.ok) {
      fail(S.badCode);
      return;
    }
    show(result.data);
  };

  const onRead = async () => {
    const code = extractCode(text);
    if (!code) {
      ++requestId.current;
      fail(S.noCode);
      return;
    }
    await readCode(code);
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

  // One cleanup path for the scanner instance, used by the stop button, a decoded code, a
  // failed `start()` and the effect's own cleanup (leaving scan mode or unmounting the sheet).
  const stopScanner = () => {
    const instance = scannerRef.current;
    if (!instance) return;
    instance.stop();
    instance.destroy();
    scannerRef.current = null;
  };

  const startScan = () => {
    scanSession.current = null;
    setScanProgress(null);
    setScanning(true);
  };

  const stopScan = () => {
    stopScanner();
    setScanning(false);
    setScanProgress(null);
  };

  // Starts the camera once the video element is mounted (rendered as part of `scanning`, so
  // the ref is already populated by the time this effect runs). `qr-scanner` loads lazily,
  // keeping it out of the sheet's initial chunk — but a dynamic `import()` is exactly what
  // makes the React Compiler bail out of memoizing this whole component (confirmed with the
  // compiler's own diagnostics), so `fail`/`readCode`/`stopScanner` above can't be trusted to
  // keep a stable identity here the way `show` can elsewhere in this file. Rather than depend
  // on them, this effect stays self-contained — its own local `stop` and its own guarded-read
  // tail — exactly like the `initialCode` effect above does for the same reason, so it only
  // ever depends on `scanning` itself and never restarts the camera on an unrelated render.
  useEffect(() => {
    if (!scanning) return;
    let cancelled = false;

    const stop = () => {
      const instance = scannerRef.current;
      if (!instance) return;
      instance.stop();
      instance.destroy();
      scannerRef.current = null;
    };

    const run = async () => {
      const video = videoRef.current;
      if (!video) return;
      const { default: QrScanner } = await import('qr-scanner');
      if (cancelled) return;

      const onResult = (result: { data: string }) => {
        const step = readScanText(result.data, scanSession.current);
        if (step.kind === 'code') {
          stop();
          setScanning(false);
          setScanProgress(null);
          const token = ++requestId.current;
          void readShared(step.code).then((result) => {
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
        } else if (step.kind === 'progress') {
          scanSession.current = step.progress;
          setScanProgress({ got: step.progress.parts.size, total: step.progress.total });
        }
      };

      const instance = new QrScanner(video, onResult, {
        returnDetailedScanResult: true,
        preferredCamera: 'environment',
        onDecodeError: () => {},
      });
      scannerRef.current = instance;
      try {
        await instance.start();
      } catch {
        if (cancelled) return;
        stop();
        setScanning(false);
        setScanProgress(null);
        setData(null);
        setError(S.cameraError);
      }
    };

    void run();
    return () => {
      cancelled = true;
      stop();
    };
  }, [scanning]);

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
      {scanning ? (
        <>
          <div className="relative aspect-square w-full max-w-[320px] self-center overflow-hidden rounded-3xl bg-black">
            <video ref={videoRef} playsInline muted className="size-full object-cover" />
            <div
              aria-hidden
              className="absolute inset-[18%] rounded-[20px] border-[3px] border-team-a"
            />
            {scanProgress && scanProgress.total > 1 && (
              <p className="absolute inset-x-0 bottom-3 text-center text-[14px] font-black text-[#fff]">
                {S.scanned(scanProgress.got, scanProgress.total)}
              </p>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={stopScan}>
            {S.stop}
          </Button>
        </>
      ) : (
        <Button variant="primary" size="md" onClick={startScan}>
          {S.scan}
        </Button>
      )}

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
