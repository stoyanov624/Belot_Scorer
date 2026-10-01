import { lazy, Suspense, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { resumePath } from '../app/resume';
import { allowedDeclarations } from '../core/declarations';
import { dealer } from '../core/match';
import type { Seat as SeatIndex } from '../core/model';
import { teamOf } from '../core/rules';
import { STRINGS } from '../core/strings';
import { ThemeSheet } from '../features/settings/ThemeSheet';
import { ClearSheet } from '../features/table/ClearSheet';
import { Coaster } from '../features/table/Coaster';
import { ContractPill } from '../features/table/ContractPill';
import { ContractSheet } from '../features/table/ContractSheet';
import { contractLine, declOptionPoints, headerLine } from '../features/table/copy';
import { DealEndSheet } from '../features/table/DealEndSheet';
import { EndMatchSheet } from '../features/table/EndMatchSheet';
import { Seat } from '../features/table/Seat';
import { playerAt as playerAtSeat } from '../features/table/seat-player';
import { TableHeader } from '../features/table/TableHeader';
import { useAppStore } from '../store/instance';
import { Button } from '../ui/Button';
import { feltStyle } from '../ui/theme';

const ShareSheet = lazy(() => import('../features/share/ShareSheet'));
const ImportSheet = lazy(() => import('../features/share/ImportSheet'));

const S = STRINGS.table;
const SEATS = [0, 1, 2, 3] as const satisfies readonly SeatIndex[];
const GRID_AREAS = { gridTemplateAreas: "'. n .' 'w c e' '. s .'" };
/** The felt's diameter: the row's height, or its width less most of the two side seats. */
const FELT_SIZE = 'min(calc(100cqw - 128px), 100cqh)';

export function Table() {
  // The match object only changes on store writes, so selecting it whole is stable.
  const match = useAppStore((s) => s.match);
  const roster = useAppStore((s) => s.roster);
  const showDealer = useAppStore((s) => s.settings.showDealer);
  const felt = useAppStore((s) => s.settings.felt);
  const removeDeclaration = useAppStore((s) => s.removeDeclaration);
  const addDeclaration = useAppStore((s) => s.addDeclaration);
  const navigate = useNavigate();
  const [themeOpen, setThemeOpen] = useState(false);
  const [openSeat, setOpenSeat] = useState<SeatIndex | null>(null);
  const [contractSheet, setContractSheet] = useState<'set' | 'toPoints' | null>(null);
  const [dealEndOpen, setDealEndOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [endMatchOpen, setEndMatchOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  // A lazy sheet stays mounted once it has ever opened, so closing it runs `dialog.close()`
  // (exit animation, focus return) instead of unmounting the `<dialog>` outright (F9).
  const [shareMounted, setShareMounted] = useState(false);
  if (shareOpen && !shareMounted) setShareMounted(true);
  const [importMounted, setImportMounted] = useState(false);
  if (importOpen && !importMounted) setImportMounted(true);
  // One plain statement per ref (React Compiler, see docs/Architecture/Overview.md).
  const northRef = useRef<HTMLButtonElement>(null);
  const eastRef = useRef<HTMLButtonElement>(null);
  const southRef = useRef<HTMLButtonElement>(null);
  const westRef = useRef<HTMLButtonElement>(null);

  // Only a playing match has a table: none goes Home, an ended one to its end screen.
  const path = resumePath(match);
  if (!match || path !== '/table') return <Navigate to={path ?? '/'} replace />;

  const anchors = [northRef, eastRef, southRef, westRef] as const;
  const playerAt = (seat: SeatIndex) => playerAtSeat(match, roster, seat);
  const dealerSeat = dealer(match);

  return (
    // §4: page padding 16px on top, 20px below (RootLayout pads sideways only).
    // An inline-size container, so the round felt's row (below) can size itself by the width.
    <div
      style={{ containerType: 'inline-size' }}
      className="flex flex-1 flex-col gap-[min(14px,1.7dvh)] pt-4 pb-5"
    >
      <TableHeader
        line={headerLine(match)}
        dealNo={match.games.length + 1}
        historyCount={match.games.length}
        onClear={() => setClearOpen(true)}
        onTheme={() => setThemeOpen(true)}
        onShare={() => setShareOpen(true)}
      />

      <div
        style={GRID_AREAS}
        className="grid flex-1 grid-cols-[minmax(88px,1fr)_minmax(0,1.5fr)_minmax(88px,1fr)] grid-rows-[auto_minmax(min(200px,22dvh),min(calc(100cqw-128px),50dvh))_auto] content-center place-items-center gap-[min(12px,1.5dvh)]"
      >
        {/* A round felt (product owner, 2026-10-01): it spans the whole middle row under the
            West and East seats, which sit on its rim. The row is a size container and the felt a
            circle sized by its narrower side, so it never stretches into a rectangle. */}
        <div
          style={{ gridArea: '2 / 1 / 3 / 4', containerType: 'size' }}
          className="flex items-center justify-center place-self-stretch"
        >
          <div
            style={{ ...feltStyle(felt), width: FELT_SIZE, height: FELT_SIZE }}
            className="flex flex-col items-center justify-center gap-2.5 rounded-full border-[6px] p-[11%] shadow-[inset_0_0_50px_oklch(0.1_0.02_50/0.6),0_20px_40px_oklch(0.08_0.02_50/0.5)]"
          >
            <ContractPill
              contract={match.contract}
              line={contractLine(match, (seat) => playerAt(seat).name)}
              onClick={() => setContractSheet('set')}
            />
            <Coaster match={match} />
          </div>
        </div>

        {SEATS.map((seat) => {
          const allowed = allowedDeclarations(match, seat);
          return (
            <Seat
              key={seat}
              seat={seat}
              player={playerAt(seat)}
              team={teamOf(seat)}
              isDealer={showDealer && dealerSeat === seat}
              decls={match.current.filter((d) => d.seat === seat)}
              onAvatar={() => setOpenSeat((current) => (current === seat ? null : seat))}
              onRemoveDecl={(id) => {
                removeDeclaration(id);
                anchors[seat].current?.focus();
              }}
              anchorRef={anchors[seat]}
              declOpen={openSeat === seat}
              onCloseDecl={() => setOpenSeat(null)}
              declOptions={allowed.options.map((key) => ({
                key,
                label: STRINGS.decls[key],
                points: declOptionPoints(key, match.rules),
              }))}
              declBlockedMessage={allowed.blocked ? STRINGS.table.blocked[allowed.blocked] : null}
              onPickDecl={(key) => {
                addDeclaration(seat, key);
                setOpenSeat(null);
                anchors[seat].current?.focus();
              }}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-[1.4fr_1fr] gap-2.5">
        {/* A deal ends only once its contract is set (product owner, 2026-10-01); until then
            the highlighted «Избери игра» pill on the felt is the way in. */}
        <Button
          variant="primary"
          size="bar"
          disabled={match.contract === null}
          onClick={() => setDealEndOpen(true)}
        >
          {S.endDeal}
        </Button>
        <Button size="bar" onClick={() => setEndMatchOpen(true)}>
          {S.endMatch}
        </Button>
      </div>

      <ThemeSheet open={themeOpen} onClose={() => setThemeOpen(false)} />
      <ClearSheet open={clearOpen} onClose={() => setClearOpen(false)} />
      <EndMatchSheet
        open={endMatchOpen}
        onClose={() => setEndMatchOpen(false)}
        onEnded={() => {
          setEndMatchOpen(false);
          // Replace: Back from the end screen must not return to a finished table.
          navigate('/end', { replace: true });
        }}
      />
      <ContractSheet
        open={contractSheet !== null}
        mode={contractSheet ?? 'set'}
        onClose={() => setContractSheet(null)}
        onConfirmed={() => {
          if (contractSheet === 'toPoints') setDealEndOpen(true);
          setContractSheet(null);
        }}
      />
      <DealEndSheet
        open={dealEndOpen}
        onClose={() => setDealEndOpen(false)}
        // Sequenced, not stacked: confirming the contract sheet reopens this one.
        onChangeContract={() => {
          setDealEndOpen(false);
          setContractSheet('toPoints');
        }}
        onSaved={(ended) => {
          setDealEndOpen(false);
          if (ended) navigate('/end', { replace: true });
        }}
      />
      {shareMounted && (
        <Suspense fallback={null}>
          <ShareSheet
            open={shareOpen}
            onClose={() => setShareOpen(false)}
            defaultScope="match"
            allowMatch
            onImport={() => {
              setShareOpen(false);
              setImportOpen(true);
            }}
          />
        </Suspense>
      )}
      {importMounted && (
        <Suspense fallback={null}>
          <ImportSheet open={importOpen} onClose={() => setImportOpen(false)} />
        </Suspense>
      )}
    </div>
  );
}
