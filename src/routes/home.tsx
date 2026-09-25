import { PreloadLink } from '../app/PreloadLink';
import { STRINGS } from '../core/strings';

/** Matches Button's secondary/md look so these links read as buttons. */
const LINK_CLASS =
  'inline-flex min-h-11 h-14 items-center justify-center gap-2 rounded-2xl border border-line bg-s1 px-4 text-[17px] font-extrabold text-text transition-transform active:scale-[0.97]';

/** Placeholder body; Phase 5 replaces it. Links exist so preload can be tried in the browser. */
export function Home() {
  return (
    <>
      <h1 className="text-[32px] font-black">{STRINGS.screens.home}</h1>
      <nav className="flex flex-col gap-3">
        <PreloadLink to="/setup" className={LINK_CLASS}>
          {STRINGS.screens.setup}
        </PreloadLink>
        <PreloadLink to="/stats" className={LINK_CLASS}>
          {STRINGS.screens.stats}
        </PreloadLink>
        <PreloadLink to="/table" className={LINK_CLASS}>
          {STRINGS.screens.table}
        </PreloadLink>
      </nav>
    </>
  );
}
