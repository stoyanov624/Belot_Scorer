import { lazy, Suspense, useState } from 'react';
import { useSearchParams } from 'react-router';
import { PreloadLink } from '../app/PreloadLink';
import { resumePath } from '../app/resume';
import { STRINGS } from '../core/strings';
import { PlayerAvatar } from '../features/players/PlayerAvatar';
import { RegisterSheet } from '../features/players/RegisterSheet';
import { ThemeSheet } from '../features/settings/ThemeSheet';
import { useAppStore } from '../store/instance';
import { Button, buttonClass } from '../ui/Button';

const ShareSheet = lazy(() => import('../features/share/ShareSheet'));
const ImportSheet = lazy(() => import('../features/share/ImportSheet'));

const S = STRINGS.home;

export function Home() {
  const theme = useAppStore((s) => s.settings.theme);
  const roster = useAppStore((s) => s.roster);
  // resumePath returns a primitive (or null), so this selector is stable across renders.
  const resume = useAppStore((s) => resumePath(s.match));
  const matchPlaying = useAppStore((s) => s.match?.status === 'playing');
  const [register, setRegister] = useState<{ playerId: string | null } | null>(null);
  const [themeOpen, setThemeOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [params, setParams] = useSearchParams();
  const pendingCode = params.get('import');
  const importSheetOpen = importOpen || pendingCode !== null;
  // A lazy sheet stays mounted once it has ever opened, so closing it runs `dialog.close()`
  // (exit animation, focus return) instead of unmounting the `<dialog>` outright (F9).
  const [shareMounted, setShareMounted] = useState(false);
  if (shareOpen && !shareMounted) setShareMounted(true);
  const [importMounted, setImportMounted] = useState(false);
  if (importSheetOpen && !importMounted) setImportMounted(true);

  return (
    <div className="flex flex-col gap-7 pt-12 pb-8">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-extrabold uppercase tracking-[0.08em] text-team-a">
          {STRINGS.themes[theme].name}
        </p>
        <h1 className="text-[64px] font-black leading-none">{STRINGS.appName}</h1>
        <p className="text-base font-semibold text-muted">{S.subtitle}</p>
      </header>

      <nav className="flex flex-col gap-2.5">
        {resume && (
          <PreloadLink to={resume} className={buttonClass('primary', 'lg')}>
            {S.continueMatch}
          </PreloadLink>
        )}
        <PreloadLink to="/setup" className={buttonClass(resume ? 'secondary' : 'primary', 'lg')}>
          {S.newGame}
        </PreloadLink>
        <div className="grid grid-cols-2 gap-2.5">
          <PreloadLink to="/stats" className={buttonClass('secondary', 'md')}>
            {S.stats}
          </PreloadLink>
          <Button onClick={() => setThemeOpen(true)}>{S.theme}</Button>
          <Button onClick={() => setRegister({ playerId: null })}>{S.newPlayer}</Button>
          <Button onClick={() => setShareOpen(true)}>{S.share}</Button>
        </div>
      </nav>

      <section aria-labelledby="home-players" className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between text-[13px] font-extrabold uppercase tracking-[0.06em] text-muted">
          <h2 id="home-players">{S.players}</h2>
          <span>{roster.length}</span>
        </div>
        {roster.length === 0 ? (
          <p className="rounded-[20px] border-2 border-dashed border-line p-6 text-center text-[15px] font-bold text-muted">
            {S.empty}
          </p>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-x-2.5 gap-y-3.5">
            {roster.map((player) => (
              <li key={player.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => setRegister({ playerId: player.id })}
                  className="flex w-full flex-col items-center gap-1.5 transition-transform active:scale-95"
                >
                  <PlayerAvatar player={player} size={68} decorative />
                  <span className="w-full truncate text-center text-sm font-extrabold">
                    {player.name}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <RegisterSheet
        open={register !== null}
        playerId={register?.playerId ?? null}
        onClose={() => setRegister(null)}
      />
      <ThemeSheet open={themeOpen} onClose={() => setThemeOpen(false)} />
      {shareMounted && (
        <Suspense fallback={null}>
          <ShareSheet
            open={shareOpen}
            onClose={() => setShareOpen(false)}
            defaultScope="all"
            allowMatch={matchPlaying}
            onImport={() => {
              setShareOpen(false);
              setImportOpen(true);
            }}
          />
        </Suspense>
      )}
      {importMounted && (
        <Suspense fallback={null}>
          <ImportSheet
            open={importSheetOpen}
            onClose={() => {
              setImportOpen(false);
              if (params.has('import')) setParams({}, { replace: true });
            }}
            initialCode={pendingCode}
          />
        </Suspense>
      )}
    </div>
  );
}
