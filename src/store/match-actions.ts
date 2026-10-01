import {
  addDeclaration,
  clearCurrentDeal,
  createMatch,
  endMatch,
  nextMatch,
  rematch,
  removeDeclaration,
  type SaveDealResult,
  saveDeal,
  setContract,
  toMatchRecord,
  undoLastDeal,
  updateDeclaration,
} from '../core/match';
import type {
  BestOf,
  Card,
  ContractKey,
  DeclKey,
  KareRank,
  Match,
  MatchRecord,
  Seat,
  Seats,
  Team,
} from '../core/model';
import type { AppDeps, GetState, SetState } from './app-store';

export interface MatchActions {
  startMatch(opts: { seats: Seats; teamA: string; teamB: string; bestOf: BestOf }): void;
  setContract(contract: ContractKey, caller: Seat): void;
  addDeclaration(seat: Seat, key: DeclKey): void;
  removeDeclaration(id: string): void;
  updateDeclaration(id: string, patch: { top?: Card | null; rank?: KareRank | null }): void;
  clearCurrentDeal(): void;
  undoLastDeal(): void;
  /** Saves the current deal. When it ends the match, the match is recorded in the same update. */
  saveDeal(input: {
    cardPointsA: number | null;
    capo: Team | null;
    /** The «Висяща» toggle, read only when the deal's totals tie (ADR 0018). */
    hangOnTie?: boolean;
  }): SaveDealResult | { ok: false; error: 'no-match' };
  /** Ends the match by hand (after the user confirms) and records it. */
  endMatch(): void;
  nextMatch(): void;
  rematch(): void;
  leaveMatch(): void;
}

export function matchActions(set: SetState, get: GetState, deps: AppDeps): MatchActions {
  const update = (fn: (m: Match) => Match) => {
    const { match } = get();
    if (match) set({ match: fn(match) });
  };

  /** Leaderboard entry for a just-ended match. Matches with no deals are not recorded. */
  const withRecord = (m: Match): MatchRecord[] => {
    const { stats, roster } = get();
    if (m.games.length === 0) return stats;
    const nameOf = (id: string) => roster.find((p) => p.id === id)?.name ?? '';
    const names: MatchRecord['names'] = [
      nameOf(m.seats[0]),
      nameOf(m.seats[1]),
      nameOf(m.seats[2]),
      nameOf(m.seats[3]),
    ];
    return [...stats, toMatchRecord(m, names, { id: deps.newId(), date: deps.now() })];
  };

  return {
    startMatch(opts) {
      set({ match: createMatch({ ...opts, rules: get().settings.rules }) });
    },
    setContract: (contract, caller) => update((m) => setContract(m, contract, caller)),
    addDeclaration: (seat, key) =>
      update((m) => addDeclaration(m, { id: deps.newId(), seat, key })),
    removeDeclaration: (id) => update((m) => removeDeclaration(m, id)),
    updateDeclaration: (id, patch) => update((m) => updateDeclaration(m, id, patch)),
    clearCurrentDeal: () => update(clearCurrentDeal),
    undoLastDeal: () => update(undoLastDeal),

    saveDeal(input) {
      const { match } = get();
      if (!match) return { ok: false, error: 'no-match' };
      const result = saveDeal(match, input);
      if (!result.ok) return result;
      set(
        result.ended
          ? { match: result.match, stats: withRecord(result.match) }
          : { match: result.match },
      );
      return result;
    },

    endMatch() {
      const { match } = get();
      if (!match || match.status === 'ended') return;
      const ended = endMatch(match);
      set({ match: ended, stats: withRecord(ended) });
    },

    nextMatch: () => update(nextMatch),
    rematch: () => update(rematch),
    leaveMatch: () => set({ match: null }),
  };
}
