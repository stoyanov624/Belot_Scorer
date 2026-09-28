import { useEffect, useState } from 'react';
import type { Match, MatchRecord, Player } from '../../core/model';
import {
  buildPayload,
  qrTexts,
  type SharePayload,
  type ShareScope,
  shareLink,
} from '../../core/share';
import { STRINGS } from '../../core/strings';
import { encodeShare, shareFileName } from '../../share/codec';
import { attachPhotos } from '../../share/photos';
import { photoStore, useAppStore } from '../../store/instance';
import { Button } from '../../ui/Button';
import { cx } from '../../ui/cx';
import { Segmented } from '../../ui/Segmented';
import { Sheet, SheetActions } from '../../ui/Sheet';
import { shareSummary } from './copy';
import { qrDataUrl } from './qr';

const S = STRINGS.share;

export interface ShareSheetProps {
  open: boolean;
  onClose: () => void;
  defaultScope: ShareScope;
  allowMatch: boolean;
  /** Fires on "Внос от друг телефон": close me and open import. */
  onImport: () => void;
}

interface Build {
  payload: SharePayload;
  link: string;
  /** One image per QR part, in order; null for a part that doesn't fit a QR code. */
  images: (string | null)[];
}

/** The "Сподели" bottom sheet: a scope switch, a cycling QR code, a link and a file. */
export default function ShareSheet({
  open,
  onClose,
  defaultScope,
  allowMatch,
  onImport,
}: ShareSheetProps) {
  const roster = useAppStore((s) => s.roster);
  const stats = useAppStore((s) => s.stats);
  // Reset on every fresh opening (not merely on unmount: `open` never goes true→false→true
  // without a render in between, so this catches every reopening while still letting the
  // control below live outside the open-only content).
  const [scope, setScope] = useState<ShareScope>(defaultScope);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setScope(defaultScope);
  }

  const summary = shareSummary(scope, roster.length, stats.length);

  return (
    <Sheet open={open} onClose={onClose} title={S.title} subtitle={summary}>
      {open && (
        <ShareForm
          scope={scope}
          onScopeChange={setScope}
          allowMatch={allowMatch}
          onClose={onClose}
          onImport={onImport}
        />
      )}
    </Sheet>
  );
}

function ShareForm({
  scope,
  onScopeChange,
  allowMatch,
  onClose,
  onImport,
}: {
  scope: ShareScope;
  onScopeChange: (scope: ShareScope) => void;
  allowMatch: boolean;
  onClose: () => void;
  onImport: () => void;
}) {
  const roster = useAppStore((s) => s.roster);
  const stats = useAppStore((s) => s.stats);
  const match = useAppStore((s) => s.match);
  const [build, setBuild] = useState<Build | null>(null);
  const [frame, setFrame] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  // Only "Изпрати файл" reads this; the link/QR build above always keeps `withPhotos` false
  // (link and QR stay photo-free, per the checkbox's own label).
  const [photos, setPhotos] = useState(false);

  // Builds the link and QR images for the current scope; a stale result from a slower encode
  // (an older scope, or one from before the sheet closed) is dropped by the `active` flag.
  useEffect(() => {
    let active = true;
    setBuild(null);
    setStatus(null);
    void buildShare({ roster, stats, match }, scope).then((next) => {
      if (active) setBuild(next);
    });
    return () => {
      active = false;
    };
  }, [scope, roster, stats, match]);

  // Cycles the QR frame every 900ms while the data needs more than one part; restarts whenever
  // a new build arrives.
  useEffect(() => {
    setFrame(0);
    if (!build || build.images.length <= 1) return;
    const id = setInterval(() => {
      setFrame((current) => (current + 1) % build.images.length);
    }, 900);
    return () => clearInterval(id);
  }, [build]);

  const onCopy = async () => {
    if (!build) return;
    const { link } = build;
    if (navigator.share) {
      try {
        await navigator.share({ title: STRINGS.appName, url: link });
        setStatus(S.copied);
        return;
      } catch {
        // Fall through to the clipboard, e.g. the user cancelled the share sheet.
      }
    }
    try {
      await navigator.clipboard.writeText(link);
      setStatus(S.copied);
    } catch {
      // No clipboard access on this device; nothing else to offer here.
    }
  };

  const onFile = async () => {
    if (!build) return;
    let data = buildPayload({ roster, stats, match }, scope, Date.now(), photos);
    if (photos) data = await attachPhotos(data, (id) => photoStore.get(id));
    const file = new File([JSON.stringify(data)], shareFileName(Date.now()), {
      type: 'application/json',
    });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: STRINGS.appName });
      } catch {
        // The user cancelled the share sheet; no fallback and no status.
      }
      return;
    }
    const url = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = file.name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    // Revoking synchronously right after click() can cancel the download on some browsers; a
    // tick later the browser has already read the blob.
    setTimeout(() => URL.revokeObjectURL(url), 0);
    setStatus(S.downloaded);
  };

  // The switch always shows (mockup 15, prototype ~583); with no match to offer, only the
  // first option ("Играчи + класация") appears.
  const scopeOptions = allowMatch ? S.scopes : S.scopes.slice(0, 1);

  return (
    <>
      <Segmented
        label={S.scopeLabel}
        options={scopeOptions}
        value={scope}
        onChange={onScopeChange}
      />

      <QrBlock build={build} frame={frame} />

      <div className="grid grid-cols-2 gap-2.5">
        <Button onClick={() => void onCopy()}>{S.copyLink}</Button>
        <Button onClick={() => void onFile()}>{S.sendFile}</Button>
      </div>

      <button
        type="button"
        aria-pressed={photos}
        onClick={() => setPhotos((current) => !current)}
        className="flex flex-none items-center gap-2.5 bg-transparent px-0 py-1 text-left text-sm font-bold text-text"
      >
        <span
          aria-hidden
          className={cx(
            'flex size-6 flex-none items-center justify-center rounded-lg border-2 border-team-a text-sm font-black',
            photos && 'bg-team-a text-on',
          )}
        >
          {photos && '✓'}
        </span>
        {S.photos}
      </button>

      {status && (
        <p role="status" className="text-sm font-extrabold text-team-a">
          {status}
        </p>
      )}

      <SheetActions className="grid grid-cols-[1fr_1.6fr] gap-2.5">
        <Button size="bar" onClick={onClose}>
          {S.close}
        </Button>
        <Button variant="primary" size="bar" onClick={onImport}>
          {S.toImport}
        </Button>
      </SheetActions>
    </>
  );
}

async function buildShare(
  state: { roster: readonly Player[]; stats: readonly MatchRecord[]; match: Match | null },
  scope: ShareScope,
): Promise<Build> {
  const payload = buildPayload(state, scope, Date.now());
  const code = await encodeShare(payload);
  const link = shareLink(`${location.origin}${import.meta.env.BASE_URL}`, code);
  const texts = qrTexts(link, code, Date.now().toString(36).slice(-4));
  const images = texts.map(qrDataUrl);
  return { payload, link, images };
}

function QrBlock({ build, frame }: { build: Build | null; frame: number }) {
  if (!build) return <Placeholder>{S.preparing}</Placeholder>;
  if (build.images.some((image) => image === null)) return <Placeholder>{S.tooBig}</Placeholder>;

  const multi = build.images.length > 1;
  const src = build.images[frame % build.images.length];

  return (
    <div className="flex flex-none flex-col items-center gap-2">
      <div className="flex size-[220px] items-center justify-center rounded-[20px] bg-[#fff] p-3">
        {src && (
          <img
            src={src}
            alt={S.qrAlt}
            className="size-[196px]"
            style={{ imageRendering: 'pixelated' }}
          />
        )}
      </div>
      {multi && (
        <p className="text-[15px] font-black text-team-a">
          {S.part(frame + 1, build.images.length)}
        </p>
      )}
      <p className="text-center text-[13px] font-bold text-pretty text-muted">
        {multi ? S.hintMulti : S.hintSingle}
      </p>
    </div>
  );
}

function Placeholder({ children }: { children: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-line p-3.5 text-center text-sm font-bold text-pretty text-muted">
      {children}
    </p>
  );
}
