import { Outlet } from 'react-router';
import { STRINGS } from '../core/strings';
import { useAppStore } from '../store/instance';
import { Button } from '../ui/Button';

const S = STRINGS.recovery;

/**
 * Centred mobile column; the themed background fills the page behind it. It pads sideways
 * only: each screen sets its own vertical padding (the handoff's differs per screen).
 *
 * On a failed load (ADR 0006) the outlet is replaced by a recovery screen offering
 * `resetData`; a save error instead shows a banner above the outlet and doesn't block it.
 */
export function RootLayout() {
  const hydration = useAppStore((s) => s.hydration);
  const saveError = useAppStore((s) => s.saveError);
  const resetData = useAppStore((s) => s.resetData);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[780px] flex-col gap-4 px-4">
      {saveError && (
        <p
          role="alert"
          className="rounded-[14px] bg-team-b px-4 py-2 text-center text-[14px] font-extrabold text-on"
        >
          {S.saveError}
        </p>
      )}
      {hydration === 'failed' ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-6 text-center">
          <h1 className="text-2xl font-black">{S.title}</h1>
          <p className="text-[15px] font-semibold text-muted">{S.body}</p>
          <Button variant="primary" size="lg" onClick={resetData}>
            {S.reset}
          </Button>
        </div>
      ) : (
        <Outlet />
      )}
    </main>
  );
}
