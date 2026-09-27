import { applyImport, type ImportMode, type ImportResult } from '../core/import';
import type { Player } from '../core/model';
import { EMPTY_STATE } from '../core/persisted';
import { type NameError, removePlayer, upsertPlayer, validatePlayerName } from '../core/roster';
import type { Settings } from '../core/settings';
import type { SharePayload } from '../core/share';
import type { AppDeps, GetState, SetState } from './app-store';

export interface PlayerInput {
  /** null for a new player. */
  id: string | null;
  name: string;
  emoji: string | null;
  /** Photo id from the photo store. When set, the emoji is dropped. */
  photo: string | null;
}

export interface RosterActions {
  savePlayer(input: PlayerInput): { ok: true; id: string } | { ok: false; error: NameError };
  removePlayer(id: string): { ok: true } | { ok: false; error: 'in-match' };
  updateSettings(patch: Partial<Settings>): void;
  /**
   * The "start fresh" choice on the failed-load screen: opens the storage write gate and
   * replaces everything with empty data. The backup key is left untouched.
   */
  resetData(): void;
  /** The leaderboard's reset: clears recorded match stats, nothing else. */
  clearStats(): void;
  /** Applies shared data (ADR 0013). Replace also drops the photos of players that are gone. */
  importShared(data: SharePayload, mode: ImportMode): ImportResult;
}

export function rosterActions(set: SetState, get: GetState, deps: AppDeps): RosterActions {
  // An orphaned blob only wastes space, so a failed delete is not worth surfacing.
  const dropPhoto = (id: string | null) => {
    if (id) deps.removePhoto(id).catch(() => {});
  };

  return {
    savePlayer(input) {
      const { roster } = get();
      const error = validatePlayerName(input.name, roster, input.id);
      if (error) return { ok: false, error };
      const id = input.id ?? deps.newId();
      const previous = roster.find((p) => p.id === id);
      const player: Player = {
        id,
        name: input.name.trim(),
        emoji: input.photo ? null : input.emoji,
        photo: input.photo,
      };
      set({ roster: upsertPlayer(roster, player) });
      if (previous?.photo !== player.photo) dropPhoto(previous?.photo ?? null);
      return { ok: true, id };
    },

    removePlayer(id) {
      const { roster, match } = get();
      if (match?.seats.includes(id)) return { ok: false, error: 'in-match' };
      const player = roster.find((p) => p.id === id);
      set({ roster: removePlayer(roster, id) });
      dropPhoto(player?.photo ?? null);
      return { ok: true };
    },

    updateSettings(patch) {
      set((s) => ({ settings: { ...s.settings, ...patch } }));
    },

    resetData() {
      deps.storage.unlock();
      set({ ...EMPTY_STATE, hydration: 'ready', saveError: false });
    },

    clearStats() {
      set({ stats: [] });
    },

    importShared(data, mode) {
      const { roster, stats, match } = get();
      const result = applyImport({ roster, stats, match }, data, mode);
      set({ roster: result.roster, stats: result.stats, match: result.match });
      if (mode === 'replace') {
        const kept = new Set(result.roster.map((p) => p.photo));
        for (const p of roster) if (p.photo && !kept.has(p.photo)) dropPhoto(p.photo);
      }
      return result;
    },
  };
}
