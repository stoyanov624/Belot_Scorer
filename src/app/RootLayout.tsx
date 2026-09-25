import { Outlet } from 'react-router';

/**
 * Centred mobile column; the themed background fills the page behind it. It pads sideways
 * only: each screen sets its own vertical padding (the handoff's differs per screen).
 */
export function RootLayout() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[780px] flex-col gap-4 px-4">
      <Outlet />
    </main>
  );
}
