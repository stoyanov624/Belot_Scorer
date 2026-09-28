// @vitest-environment happy-dom
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMatch, totals } from '../../core/match';
import type { Match, MatchRecord, Player, Seats } from '../../core/model';
import { DEFAULT_RULES } from '../../core/rules';
import { buildPayload, type SharePayload, type ShareScope } from '../../core/share';
import { STRINGS } from '../../core/strings';
import { encodeShare, readShared } from '../../share/codec';
import { appStore } from '../../store/instance';
import { renderRoute, resetApp } from '../../test/app';
import ImportSheet, { type ImportSheetProps } from './ImportSheet';

// Only `readShared` is overridden per test (via `mockImplementationOnce`); every other export,
// and every other test's calls to `readShared`, keep the real codec (`restoreMocks` in
// vite.config.ts resets it back to `actual.readShared` before each test).
vi.mock('../../share/codec', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../share/codec')>();
  return { ...actual, readShared: vi.fn(actual.readShared) };
});

// A fake `qr-scanner`: every `new QrScanner(...)` is recorded in `scanner.instances`, and its
// `onDecode` is exposed so a test can feed it a scanned result. `start()` rejects when
// `scanner.failStart` is set, to exercise the camera-denied path.
const scanner = vi.hoisted(() => ({
  instances: [] as Array<{
    onDecode: (r: { data: string }) => void;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
  }>,
  failStart: false,
}));
vi.mock('qr-scanner', () => ({
  default: class {
    start = vi.fn(() =>
      scanner.failStart ? Promise.reject(new Error('denied')) : Promise.resolve(),
    );
    stop = vi.fn();
    destroy = vi.fn();
    constructor(_v: HTMLVideoElement, onDecode: (r: { data: string }) => void) {
      scanner.instances.push({
        onDecode,
        start: this.start,
        stop: this.stop,
        destroy: this.destroy,
      });
    }
  },
}));

const S = STRINGS.import;
const SETUP = STRINGS.setup;

/** A promise this test can resolve on its own schedule, to force a specific read ordering. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

beforeEach(() => {
  resetApp();
  scanner.instances = [];
  scanner.failStart = false;
});

function fakePlayer(id: string, name: string): Player {
  return { id, name, emoji: null, photo: null };
}

const FAKE_ROSTER: Player[] = [
  fakePlayer('far-0', 'Ани'),
  fakePlayer('far-1', 'Бончо'),
  fakePlayer('far-2', 'Вили'),
  fakePlayer('far-3', 'Гого'),
];

function fakeRecord(id: string): MatchRecord {
  return {
    id,
    date: 1,
    seats: FAKE_ROSTER.map((p) => p.id) as unknown as Seats,
    names: FAKE_ROSTER.map((p) => p.name) as [string, string, string, string],
    teamA: 'Те',
    teamB: 'Ние',
    totalA: 90,
    totalB: 61,
    games: [],
  };
}

function fakeMatch(): Match {
  return createMatch({
    seats: FAKE_ROSTER.map((p) => p.id) as unknown as Seats,
    teamA: 'Те',
    teamB: 'Ние',
    bestOf: 1,
    rules: DEFAULT_RULES,
  });
}

/** Builds a real share code from a fake, "other phone" data set (never the local store). */
async function codeFor(
  state: { roster: Player[]; stats: MatchRecord[]; match: Match | null },
  scope: ShareScope,
) {
  const payload = buildPayload(state, scope, Date.now());
  return { code: await encodeShare(payload), payload };
}

/** Seeds unique-named local players and returns their ids, in store order. */
function seedRoster(names: readonly string[]): string[] {
  return names.map((name) => {
    const result = appStore.getState().savePlayer({ id: null, name, emoji: null, photo: null });
    if (!result.ok) throw new Error(`setup failed for ${name}`);
    return result.id;
  });
}

/** The most recently created mock `QrScanner` instance; throws if the camera never started. */
function lastScannerInstance() {
  const instance = scanner.instances.at(-1);
  if (!instance) throw new Error('no scanner instance was created');
  return instance;
}

/** Renders the sheet in its own memory router, so `useNavigate` works in isolation. */
function renderSheet(props: Partial<ImportSheetProps> = {}) {
  const merged: ImportSheetProps = { open: true, onClose: () => {}, initialCode: null, ...props };
  const router = createMemoryRouter([{ path: '*', Component: () => <ImportSheet {...merged} /> }], {
    initialEntries: ['/'],
  });
  return { router, ...render(<RouterProvider router={router} />) };
}

describe('ImportSheet', () => {
  it('shows the title, intro, paste area and read button', () => {
    renderSheet();

    expect(screen.getByRole('dialog', { name: S.title })).toBeTruthy();
    expect(screen.getByText(S.intro)).toBeTruthy();
    expect(screen.getByText(S.or)).toBeTruthy();
    expect(screen.getByRole('textbox', { name: S.pasteLabel })).toBeTruthy();
    expect(screen.getByPlaceholderText(S.placeholder)).toBeTruthy();
    expect(screen.getByRole('button', { name: S.read })).toBeTruthy();
  });

  describe('reading', () => {
    it('shows "no code" for text with no code', async () => {
      renderSheet();

      await userEvent.type(screen.getByRole('textbox', { name: S.pasteLabel }), 'not a code');
      await userEvent.click(screen.getByRole('button', { name: S.read }));

      expect(await screen.findByText(S.noCode)).toBeTruthy();
    });

    it('shows "bad link" for a link whose code cannot be read', async () => {
      renderSheet();

      await userEvent.type(
        screen.getByRole('textbox', { name: S.pasteLabel }),
        'http://x/#belot=zzzz',
      );
      await userEvent.click(screen.getByRole('button', { name: S.read }));

      expect(await screen.findByText(S.badCode)).toBeTruthy();
    });

    it('shows the preview and lines for a valid link, with "take" only when there is a match', async () => {
      const { code, payload } = await codeFor(
        { roster: FAKE_ROSTER, stats: [fakeRecord('m1')], match: null },
        'all',
      );
      renderSheet();

      await userEvent.type(
        screen.getByRole('textbox', { name: S.pasteLabel }),
        `http://x/#belot=${code}`,
      );
      await userEvent.click(screen.getByRole('button', { name: S.read }));

      expect(await screen.findByText(S.found)).toBeTruthy();
      expect(screen.getByText(S.players(4, 'Ани, Бончо, Вили, Гого'))).toBeTruthy();
      expect(screen.getByText(S.matches(1))).toBeTruthy();
      expect(screen.getByRole('button', { name: S.merge })).toBeTruthy();
      expect(screen.queryByRole('button', { name: S.take })).toBeNull();
      // Sanity: the payload really had no match, matching the assertion above.
      expect(payload.match).toBeNull();
    });

    it("keeps the later read's result when an earlier one resolves after it", async () => {
      const payloadA: SharePayload = {
        app: 'belot',
        v: 2,
        at: 1,
        roster: [fakePlayer('a', 'Ани')],
        stats: [],
        match: null,
      };
      const payloadB: SharePayload = {
        app: 'belot',
        v: 2,
        at: 2,
        roster: [fakePlayer('b', 'Боби')],
        stats: [],
        match: null,
      };
      const slowA = deferred<{ ok: true; data: SharePayload }>();
      vi.mocked(readShared).mockImplementationOnce(() => slowA.promise);
      vi.mocked(readShared).mockImplementationOnce(() =>
        Promise.resolve({ ok: true, data: payloadB }),
      );
      renderSheet();
      const textarea = screen.getByRole('textbox', { name: S.pasteLabel });

      // Reads link A (slow to resolve), then quickly reads link B (resolves first).
      await userEvent.type(textarea, 'zAAAA');
      await userEvent.click(screen.getByRole('button', { name: S.read }));
      await userEvent.clear(textarea);
      await userEvent.type(textarea, 'zBBBB');
      await userEvent.click(screen.getByRole('button', { name: S.read }));

      expect(await screen.findByText(S.players(1, 'Боби'))).toBeTruthy();

      // A's slow read finally resolves; it must not overwrite B's already-shown result.
      await act(async () => {
        slowA.resolve({ ok: true, data: payloadA });
        await Promise.resolve();
      });

      expect(screen.getByText(S.players(1, 'Боби'))).toBeTruthy();
      expect(screen.queryByText(S.players(1, 'Ани'))).toBeNull();
    });
  });

  it('adds to the roster and shows the done message on "Добави към моите"', async () => {
    appStore.getState().savePlayer({ id: null, name: 'Местен', emoji: null, photo: null });
    const before = appStore.getState().roster.length;
    const { code } = await codeFor({ roster: FAKE_ROSTER, stats: [], match: null }, 'all');
    renderSheet();

    await userEvent.type(screen.getByRole('textbox', { name: S.pasteLabel }), code);
    await userEvent.click(screen.getByRole('button', { name: S.read }));
    await screen.findByText(S.found);

    await userEvent.click(screen.getByRole('button', { name: S.merge }));

    expect(appStore.getState().roster).toHaveLength(before + FAKE_ROSTER.length);
    expect(await screen.findByText(S.done(4, 0, false))).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe(S.done(4, 0, false));
    expect(screen.queryByText(S.found)).toBeNull();
  });

  describe('choosing a file', () => {
    it('shows the preview for a valid .belot file', async () => {
      const { payload } = await codeFor({ roster: FAKE_ROSTER, stats: [], match: null }, 'all');
      const file = new File([JSON.stringify(payload)], 'shared.belot', {
        type: 'application/json',
      });
      const { container } = renderSheet();
      const input = container.querySelector('input[type=file]') as HTMLInputElement;

      await userEvent.upload(input, file);

      expect(await screen.findByText(S.found)).toBeTruthy();
      expect(input.value).toBe('');
    });

    it('shows "not from Belot" for a file with no recognizable payload', async () => {
      const file = new File(['{}'], 'bad.belot', { type: 'application/json' });
      const { container } = renderSheet();
      const input = container.querySelector('input[type=file]') as HTMLInputElement;

      await userEvent.upload(input, file);

      expect(await screen.findByText(S.badFile)).toBeTruthy();
    });
  });

  describe('replace', () => {
    it('arms on the first press, leaving the store unchanged', async () => {
      appStore.getState().savePlayer({ id: null, name: 'Местен', emoji: null, photo: null });
      const before = appStore.getState().roster;
      const { code } = await codeFor({ roster: FAKE_ROSTER, stats: [], match: null }, 'all');
      renderSheet();
      await userEvent.type(screen.getByRole('textbox', { name: S.pasteLabel }), code);
      await userEvent.click(screen.getByRole('button', { name: S.read }));
      await screen.findByText(S.found);

      await userEvent.click(screen.getByRole('button', { name: S.replace }));

      expect(screen.getByRole('button', { name: S.replaceArmed })).toBeTruthy();
      expect(appStore.getState().roster).toBe(before);
    });

    it('replaces everything on the second press, clearing a local match the data has none of', async () => {
      const [p0, p1, p2, p3] = seedRoster(['Иво', 'Гери', 'Мария', 'Петър']);
      appStore
        .getState()
        .startMatch({ seats: [p0, p1, p2, p3] as Seats, teamA: 'Ние', teamB: 'Вие', bestOf: 1 });
      const { code } = await codeFor({ roster: FAKE_ROSTER, stats: [], match: null }, 'all');
      renderSheet();
      await userEvent.type(screen.getByRole('textbox', { name: S.pasteLabel }), code);
      await userEvent.click(screen.getByRole('button', { name: S.read }));
      await screen.findByText(S.found);
      await userEvent.click(screen.getByRole('button', { name: S.replace }));

      await userEvent.click(screen.getByRole('button', { name: S.replaceArmed }));

      expect(appStore.getState().roster.map((p) => p.name)).toEqual(FAKE_ROSTER.map((p) => p.name));
      expect(appStore.getState().match).toBeNull();
    });
  });

  describe('take', () => {
    it('applies at once and navigates to /table with no local match', async () => {
      const { code } = await codeFor(
        { roster: FAKE_ROSTER, stats: [], match: fakeMatch() },
        'match',
      );
      const { router } = renderRoute('/');

      await userEvent.click(screen.getByRole('button', { name: STRINGS.home.share }));
      await userEvent.click(await screen.findByRole('button', { name: STRINGS.share.toImport }));
      await userEvent.type(await screen.findByRole('textbox', { name: S.pasteLabel }), code);
      await userEvent.click(screen.getByRole('button', { name: S.read }));
      await screen.findByText(S.found);

      await userEvent.click(screen.getByRole('button', { name: S.take }));

      expect(router.state.location.pathname).toBe('/table');
      expect(appStore.getState().match?.status).toBe('playing');
    });

    it('confirms before replacing a local match that is playing with a saved deal', async () => {
      const [p0, p1, p2, p3] = seedRoster(['Иво', 'Гери', 'Мария', 'Петър']);
      appStore.getState().startMatch({
        seats: [p0, p1, p2, p3] as Seats,
        teamA: 'Стария',
        teamB: 'Другия',
        bestOf: 1,
      });
      appStore.getState().setContract('hearts', 0);
      appStore.getState().saveDeal({ cardPointsA: 10, capo: null });
      const before = appStore.getState().match;
      if (!before) throw new Error('setup failed');
      const t = totals(before);

      const { code } = await codeFor(
        { roster: FAKE_ROSTER, stats: [], match: fakeMatch() },
        'match',
      );
      const { router } = renderSheet();
      await userEvent.type(screen.getByRole('textbox', { name: S.pasteLabel }), code);
      await userEvent.click(screen.getByRole('button', { name: S.read }));
      await screen.findByText(S.found);

      await userEvent.click(screen.getByRole('button', { name: S.take }));

      expect(screen.getByText(SETUP.replaceBody(t.A, t.B))).toBeTruthy();
      expect(screen.queryByRole('button', { name: S.merge })).toBeNull();
      expect(appStore.getState().match).toEqual(before);

      await userEvent.click(screen.getByRole('button', { name: SETUP.replaceCancel }));
      expect(await screen.findByText(S.found)).toBeTruthy();
      expect(appStore.getState().match).toEqual(before);

      await userEvent.click(screen.getByRole('button', { name: S.take }));
      await userEvent.click(screen.getByRole('button', { name: SETUP.replaceConfirm }));

      expect(appStore.getState().match?.status).toBe('playing');
      expect(appStore.getState().match?.games).toHaveLength(0);
      expect(router.state.location.pathname).toBe('/table');
    });
  });

  it('reads a valid initialCode as soon as the sheet opens', async () => {
    const { code } = await codeFor({ roster: FAKE_ROSTER, stats: [], match: null }, 'all');

    renderSheet({ initialCode: code });

    expect(await screen.findByText(S.found)).toBeTruthy();
  });

  describe('camera scanning', () => {
    it('shows the scan button; pressing it opens the camera and hides the button', async () => {
      renderSheet();
      expect(screen.getByRole('button', { name: S.scan })).toBeTruthy();

      await userEvent.click(screen.getByRole('button', { name: S.scan }));

      expect(screen.queryByRole('button', { name: S.scan })).toBeNull();
      expect(await screen.findByRole('button', { name: S.stop })).toBeTruthy();
    });

    it('still supports pasting a link while the scan button is shown', async () => {
      const { code } = await codeFor({ roster: FAKE_ROSTER, stats: [], match: null }, 'all');
      renderSheet();
      expect(screen.getByRole('button', { name: S.scan })).toBeTruthy();

      await userEvent.type(screen.getByRole('textbox', { name: S.pasteLabel }), code);
      await userEvent.click(screen.getByRole('button', { name: S.read }));

      expect(await screen.findByText(S.found)).toBeTruthy();
    });

    it('stops and destroys the scanner, leaves scanning mode and shows the preview for a decoded link', async () => {
      const { code } = await codeFor({ roster: FAKE_ROSTER, stats: [], match: null }, 'all');
      const link = `http://x/#belot=${code}`;
      renderSheet();

      await userEvent.click(screen.getByRole('button', { name: S.scan }));
      await waitFor(() => expect(scanner.instances).toHaveLength(1));
      const instance = lastScannerInstance();

      act(() => {
        instance.onDecode({ data: link });
      });

      expect(await screen.findByText(S.found)).toBeTruthy();
      expect(instance.stop).toHaveBeenCalled();
      expect(instance.destroy).toHaveBeenCalled();
      expect(screen.queryByRole('button', { name: S.stop })).toBeNull();
      expect(screen.getByRole('button', { name: S.scan })).toBeTruthy();
    });

    it('shows the multi-part overlay across three parts and completes on the last one', async () => {
      const { code } = await codeFor({ roster: FAKE_ROSTER, stats: [], match: null }, 'all');
      const n = 3;
      const size = Math.ceil(code.length / n);
      const part1 = `BELOT|abcd|1|${n}|${code.slice(0, size)}`;
      const part2 = `BELOT|abcd|2|${n}|${code.slice(size, size * 2)}`;
      const part3 = `BELOT|abcd|3|${n}|${code.slice(size * 2)}`;
      renderSheet();

      await userEvent.click(screen.getByRole('button', { name: S.scan }));
      await waitFor(() => expect(scanner.instances).toHaveLength(1));
      const instance = lastScannerInstance();

      act(() => {
        instance.onDecode({ data: part1 });
      });
      expect(await screen.findByText(S.scanned(1, 3))).toBeTruthy();

      act(() => {
        instance.onDecode({ data: part2 });
      });
      expect(await screen.findByText(S.scanned(2, 3))).toBeTruthy();

      act(() => {
        instance.onDecode({ data: part3 });
      });

      expect(await screen.findByText(S.found)).toBeTruthy();
      expect(instance.stop).toHaveBeenCalled();
      expect(instance.destroy).toHaveBeenCalled();
    });

    it('shows the camera error and returns to scan-off when the camera fails to start', async () => {
      scanner.failStart = true;
      renderSheet();

      await userEvent.click(screen.getByRole('button', { name: S.scan }));

      expect(await screen.findByText(S.cameraError)).toBeTruthy();
      expect(screen.getByRole('button', { name: S.scan })).toBeTruthy();
      expect(screen.queryByRole('button', { name: S.stop })).toBeNull();
    });

    it('stops and destroys the scanner on "Спри камерата", back to scan-off, no error', async () => {
      renderSheet();
      await userEvent.click(screen.getByRole('button', { name: S.scan }));
      await waitFor(() => expect(scanner.instances).toHaveLength(1));
      const instance = lastScannerInstance();

      await userEvent.click(screen.getByRole('button', { name: S.stop }));

      expect(instance.stop).toHaveBeenCalled();
      expect(instance.destroy).toHaveBeenCalled();
      expect(screen.getByRole('button', { name: S.scan })).toBeTruthy();
      expect(screen.queryByText(S.cameraError)).toBeNull();
    });

    it('destroys the scanner when the sheet closes mid-scan', async () => {
      function Wrapper() {
        const [open, setOpen] = useState(true);
        return <ImportSheet open={open} onClose={() => setOpen(false)} initialCode={null} />;
      }
      const router = createMemoryRouter([{ path: '*', Component: Wrapper }], {
        initialEntries: ['/'],
      });
      render(<RouterProvider router={router} />);

      await userEvent.click(screen.getByRole('button', { name: S.scan }));
      await waitFor(() => expect(scanner.instances).toHaveLength(1));
      const instance = lastScannerInstance();

      await userEvent.click(screen.getByRole('button', { name: S.close }));

      expect(instance.destroy).toHaveBeenCalled();
    });
  });
});
