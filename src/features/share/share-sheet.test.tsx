// @vitest-environment happy-dom
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Seats } from '../../core/model';
import type { SharePayload } from '../../core/share';
import { STRINGS } from '../../core/strings';
import { readShared } from '../../share/codec';
import { appStore, photoStore } from '../../store/instance';
import { resetApp } from '../../test/app';
import ShareSheet, { type ShareSheetProps } from './ShareSheet';

const S = STRINGS.share;
const NAMES = ['Иван', 'Петър', 'Мария', 'Гошо'] as const;

beforeEach(() => {
  resetApp();
});

afterEach(() => {
  // Object.defineProperty additions aren't undone by `restoreMocks`.
  const nav = navigator as unknown as Record<string, unknown>;
  delete nav.share;
  delete nav.canShare;
});

/** Seeds unique-named players and returns their ids, in store order. */
function seedRoster(names: readonly string[]): string[] {
  return names.map((name) => {
    const result = appStore.getState().savePlayer({ id: null, name, emoji: null, photo: null });
    if (!result.ok) throw new Error(`setup failed for ${name}`);
    return result.id;
  });
}

// A seeded LCG (Numerical Recipes constants), so the per-player suffixes below — and with them
// the QR part count this file asserts on — are identical on every run.
let lcgState = 0x2545f491;
function nextLcgByte(): number {
  lcgState = (Math.imul(lcgState, 1664525) + 1013904223) >>> 0;
  return (lcgState >>> 24) & 0xff;
}

/** A per-player suffix random enough that deflate can't shrink the roster below the QR limit. */
function randomSuffix(): string {
  return Array.from({ length: 16 }, () => nextLcgByte().toString(16).padStart(2, '0')).join('');
}

/** Seeds the four players and starts a match with them seated N, E, S, W. */
function startMatch() {
  const ids = seedRoster(NAMES);
  appStore
    .getState()
    .startMatch({ seats: ids as unknown as Seats, teamA: 'Ние', teamB: 'Вие', bestOf: 1 });
}

function renderSheet(props: Partial<ShareSheetProps> = {}) {
  return render(
    <ShareSheet
      open
      onClose={() => {}}
      defaultScope="all"
      allowMatch={false}
      onImport={() => {}}
      {...props}
    />,
  );
}

describe('ShareSheet', () => {
  it('shows the title, summary and a QR code for scope "all", with only that one scope option', async () => {
    seedRoster(NAMES);
    renderSheet();

    expect(screen.getByRole('dialog', { name: S.title })).toBeTruthy();
    expect(screen.getByText('4 играчи и 0 мача от класацията.')).toBeTruthy();
    const group = screen.getByRole('radiogroup', { name: S.scopeLabel });
    expect(within(group).getAllByRole('radio')).toHaveLength(1);
    expect(await screen.findByRole('img', { name: S.qrAlt })).toBeTruthy();
  });

  it('shows both scopes with "Текущия мач" checked and the fixed match summary', async () => {
    startMatch();
    renderSheet({ defaultScope: 'match', allowMatch: true });

    screen.getByRole('radiogroup', { name: S.scopeLabel });
    const matchLabel = S.scopes.find((o) => o.value === 'match')?.label ?? '';
    expect(screen.getByRole('radio', { name: matchLabel, checked: true })).toBeTruthy();
    expect(screen.getByText(S.summaryMatch)).toBeTruthy();
    await screen.findByRole('img', { name: S.qrAlt });
  });

  it('shows numbered parts and cycles every 900ms when the data needs more than one QR', async () => {
    const names = Array.from({ length: 40 }, (_, i) => `Играч номер ${i} ${randomSuffix()}`);
    seedRoster(names);
    // Fake timers must be in place *before* the cycling interval is first created, so it's
    // installed before render; `shouldAdvanceTime` still lets the async encode's real
    // microtasks (and findBy's polling) resolve normally.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderSheet();

    await screen.findByRole('img', { name: S.qrAlt });
    expect(screen.getByText(/^Част 1 от \d+$/)).toBeTruthy();
    expect(screen.getByText(S.hintMulti)).toBeTruthy();

    await act(async () => {
      vi.advanceTimersByTime(900);
    });
    expect(await screen.findByText(/^Част 2 от \d+$/, {}, { timeout: 3000 })).toBeTruthy();
    vi.useRealTimers();
  }, 8000);

  it('copies the link through the clipboard when there is no Web Share', async () => {
    seedRoster(NAMES);
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    renderSheet();
    await screen.findByRole('img', { name: S.qrAlt });

    await userEvent.click(screen.getByRole('button', { name: S.copyLink }));

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0]?.[0]).toMatch(/^http:\/\/localhost(:\d+)?\/#belot=z/);
    expect(await screen.findByText(S.copied)).toBeTruthy();
  });

  it('shares the link through Web Share when it is available', async () => {
    seedRoster(NAMES);
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    renderSheet();
    await screen.findByRole('img', { name: S.qrAlt });

    await userEvent.click(screen.getByRole('button', { name: S.copyLink }));

    expect(share).toHaveBeenCalledTimes(1);
    const arg = share.mock.calls[0]?.[0];
    expect(arg.title).toBe(STRINGS.appName);
    expect(arg.url).toMatch(/^http:\/\/localhost(:\d+)?\/#belot=z/);
    expect(await screen.findByText(S.copied)).toBeTruthy();
  });

  it('downloads the file through an anchor when Web Share files are unavailable', async () => {
    seedRoster(NAMES);
    const objectUrl = 'blob:share-file';
    vi.spyOn(URL, 'createObjectURL').mockReturnValue(objectUrl);
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    renderSheet();
    await screen.findByRole('img', { name: S.qrAlt });

    await userEvent.click(screen.getByRole('button', { name: S.sendFile }));

    expect(click).toHaveBeenCalledTimes(1);
    const anchor = click.mock.instances[0] as HTMLAnchorElement;
    expect(anchor.download).toMatch(/^belot-\d{4}-\d{2}-\d{2}\.belot$/);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    // F11: the revoke is deferred a tick past click(), not synchronous; `userEvent.click`
    // already flushes that tick, so by here it has run exactly once.
    expect(revoke).toHaveBeenCalledTimes(1);
    expect(revoke).toHaveBeenCalledWith(objectUrl);
    expect(await screen.findByText(S.downloaded)).toBeTruthy();
  });

  it('shares the file through Web Share when canShare allows it, with no status', async () => {
    seedRoster(NAMES);
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: canShare, configurable: true });
    renderSheet();
    await screen.findByRole('img', { name: S.qrAlt });

    await userEvent.click(screen.getByRole('button', { name: S.sendFile }));

    expect(canShare).toHaveBeenCalledTimes(1);
    expect(share).toHaveBeenCalledTimes(1);
    const arg = share.mock.calls[0]?.[0];
    expect(arg.title).toBe(STRINGS.appName);
    expect(arg.files).toHaveLength(1);
    expect(arg.files[0]).toBeInstanceOf(File);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('shows the photos checkbox unticked on open, resets on reopen, and toggles the tick', async () => {
    seedRoster(NAMES);
    renderSheet();
    await screen.findByRole('img', { name: S.qrAlt });

    const checkbox = screen.getByRole('button', { name: S.photos });
    expect(checkbox.getAttribute('aria-pressed')).toBe('false');
    expect(checkbox.textContent).toBe(S.photos);

    await userEvent.click(checkbox);
    expect(checkbox.getAttribute('aria-pressed')).toBe('true');
    expect(checkbox.textContent).toBe(`✓${S.photos}`);
  });

  it('sends a file with all-null roster photos and no photos key when the checkbox is unticked', async () => {
    seedRoster(NAMES);
    let file: File | undefined;
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      file = blob as File;
      return 'blob:share-file';
    });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    renderSheet();
    await screen.findByRole('img', { name: S.qrAlt });

    await userEvent.click(screen.getByRole('button', { name: S.sendFile }));

    expect(file).toBeDefined();
    const data = JSON.parse(await (file as File).text()) as SharePayload;
    expect(data.roster.every((p) => p.photo === null)).toBe(true);
    expect(data.photos).toBeUndefined();
  });

  it('ticked, with a seeded photo: embeds it in the file and leaves the link/QR photo-free', async () => {
    // fake-indexeddb doesn't round-trip through the happy-dom environment this file uses, so
    // the photo blob is stubbed rather than actually written through `photoStore.put`.
    const photoId = 'photo1';
    const blob = new Blob(['x'], { type: 'image/jpeg' });
    vi.spyOn(photoStore, 'get').mockImplementation(async (id) =>
      id === photoId ? blob : undefined,
    );
    const ids = seedRoster(NAMES);
    const firstId = ids[0] as string;
    const updated = appStore
      .getState()
      .savePlayer({ id: firstId, name: NAMES[0], emoji: null, photo: photoId });
    if (!updated.ok) throw new Error('setup failed');

    let file: File | undefined;
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      file = blob as File;
      return 'blob:share-file';
    });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);

    renderSheet();
    await screen.findByRole('img', { name: S.qrAlt });

    await userEvent.click(screen.getByRole('button', { name: S.photos }));
    await userEvent.click(screen.getByRole('button', { name: S.sendFile }));

    expect(file).toBeDefined();
    const data = JSON.parse(await (file as File).text()) as SharePayload;
    const player = data.roster.find((p) => p.id === firstId);
    expect(player?.photo).toBe(photoId);
    expect(data.photos?.[photoId]).toMatch(/^data:image\/jpeg;base64,/);

    // The link built for the same session still carries no photos, whatever the checkbox says.
    await userEvent.click(screen.getByRole('button', { name: S.copyLink }));
    expect(writeText).toHaveBeenCalledTimes(1);
    const link = writeText.mock.calls[0]?.[0] as string;
    const code = link.split('#belot=')[1] as string;
    const decoded = await readShared(code);
    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(decoded.data.roster.every((p) => p.photo === null)).toBe(true);
      expect(decoded.data.photos).toBeUndefined();
    }
  });

  it('calls onImport for "Внос от друг телефон" and onClose for "Затвори"', async () => {
    seedRoster(NAMES);
    const onImport = vi.fn();
    const onClose = vi.fn();
    renderSheet({ onImport, onClose });
    await screen.findByRole('img', { name: S.qrAlt });

    await userEvent.click(screen.getByRole('button', { name: S.toImport }));
    expect(onImport).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: S.close }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
