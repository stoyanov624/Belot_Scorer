import { useRef, useState } from 'react';
import { Navigate } from 'react-router';
import { allowedDeclarations } from '../core/declarations';
import { dealer } from '../core/match';
import type { Seat as SeatIndex } from '../core/model';
import { teamOf } from '../core/rules';
import { STRINGS } from '../core/strings';
import { ThemeSheet } from '../features/settings/ThemeSheet';
import { Coaster } from '../features/table/Coaster';
import { ContractPill } from '../features/table/ContractPill';
import { ContractSheet } from '../features/table/ContractSheet';
import { contractLine, declOptionPoints, headerLine } from '../features/table/copy';
import { Seat } from '../features/table/Seat';
import { playerAt as playerAtSeat } from '../features/table/seat-player';
import { TableHeader } from '../features/table/TableHeader';
import { useAppStore } from '../store/instance';
import { Button } from '../ui/Button';
import { feltStyle } from '../ui/theme';

const S = STRINGS.table;
const SEATS = [0, 1, 2, 3] as const satisfies readonly SeatIndex[];
const GRID_AREAS = { gridTemplateAreas: "'. n .' 'w c e' '. s .'" };

/** Wired in Tasks 7–9 (clear, deal end, match end). */
const later = () => {};

export function Table() {
  // The match object only changes on store writes, so selecting it whole is stable.
  const match = useAppStore((s) => s.match);
  const roster = useAppStore((s) => s.roster);
  const showDealer = useAppStore((s) => s.settings.showDealer);
  const felt = useAppStore((s) => s.settings.felt);
  const removeDeclaration = useAppStore((s) => s.removeDeclaration);
  const addDeclaration = useAppStore((s) => s.addDeclaration);
  const [themeOpen, setThemeOpen] = useState(false);
  const [openSeat, setOpenSeat] = useState<SeatIndex | null>(null);
  const [contractSheet, setContractSheet] = useState<'set' | 'toPoints' | null>(null);
  // One plain statement per ref (React Compiler, see docs/Architecture/Overview.md).
  const northRef = useRef<HTMLButtonElement>(null);
  const eastRef = useRef<HTMLButtonElement>(null);
  const southRef = useRef<HTMLButtonElement>(null);
  const westRef = useRef<HTMLButtonElement>(null);

  if (!match) return <Navigate to="/" replace />;

  const anchors = [northRef, eastRef, southRef, westRef] as const;
  const playerAt = (seat: SeatIndex) => playerAtSeat(match, roster, seat);
  const dealerSeat = dealer(match);

  return (
    // RootLayout pads 24px vertically; §4 wants 16px on top and 20px below.
    <div className="-mt-2 -mb-1 flex flex-1 flex-col gap-3.5">
      <TableHeader
        line={headerLine(match)}
        dealNo={match.games.length + 1}
        historyCount={match.games.length}
        onClear={later}
        onTheme={() => setThemeOpen(true)}
      />

      <div
        style={GRID_AREAS}
        className="grid flex-1 grid-cols-[minmax(88px,1fr)_minmax(0,1.5fr)_minmax(88px,1fr)] grid-rows-[auto_minmax(200px,1fr)_auto] place-items-center gap-3"
      >
        <div
          style={{ gridArea: 'c', ...feltStyle(felt) }}
          className="flex flex-col items-center justify-center gap-2.5 place-self-stretch rounded-[32px] border-[6px] p-3 shadow-[inset_0_0_50px_oklch(0.1_0.02_50/0.6),0_20px_40px_oklch(0.08_0.02_50/0.5)]"
        >
          <ContractPill
            contract={match.contract}
            line={contractLine(match, (seat) => playerAt(seat).name)}
            onClick={() => setContractSheet('set')}
          />
          <Coaster match={match} />
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
              onRemoveDecl={removeDeclaration}
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
              }}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-[1.4fr_1fr] gap-2.5">
        <Button
          variant="primary"
          size="bar"
          onClick={() => (match.contract === null ? setContractSheet('toPoints') : later())}
        >
          {S.endDeal}
        </Button>
        <Button size="bar" onClick={later}>
          {S.endMatch}
        </Button>
      </div>

      <ThemeSheet open={themeOpen} onClose={() => setThemeOpen(false)} />
      <ContractSheet
        open={contractSheet !== null}
        mode={contractSheet ?? 'set'}
        onClose={() => setContractSheet(null)}
        onConfirmed={() => {
          // Task 7 opens the deal-end sheet here when contractSheet === 'toPoints'.
          setContractSheet(null);
        }}
      />
    </div>
  );
}
