import { useEffect } from 'react';
import { Link, useRouteError } from 'react-router';
import { STRINGS } from '../core/strings';

/**
 * Per-route error boundary: the rest of the app keeps working. It lays itself out in the page
 * column because at the root level it replaces RootLayout.
 */
export function RouteError() {
  const error = useRouteError();
  useEffect(() => {
    if (import.meta.env.DEV) console.error(error);
  }, [error]);
  return (
    <div
      role="alert"
      className="mx-auto flex w-full max-w-[780px] flex-col items-start gap-4 px-4 py-10"
    >
      <h1 className="text-[32px] font-black">{STRINGS.routeError.title}</h1>
      <Link
        to="/"
        className="inline-flex h-14 items-center rounded-2xl bg-team-a px-5 text-[17px] font-extrabold text-on"
      >
        {STRINGS.routeError.home}
      </Link>
    </div>
  );
}
