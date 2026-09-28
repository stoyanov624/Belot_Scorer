import { applyImport, type ImportMode, type ImportResult } from '../core/import';
import type { Player } from '../core/model';
import { EMPTY_STATE } from '../core/persisted';
import { type NameError, removePlayer, upsertPlayer, validatePlayerName } from '../core/roster';
import type { Settings } from '../core/settings';
import type { SharePayload } from '../core/share';
import { dataUrlToBlob } from '../share/photos';
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
  /**
   * Applies shared data (ADR 0013). Resolves every embedded photo to a new local id through
   * the photo store first, then drops the photos of local players the result roster no longer
   * references.
   */
  importShared(data: SharePayload, mode: ImportMode): Promise<ImportResult>;
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

    async importShared(data, mode) {
      // Resolve every incoming photo, one `putPhoto` call PER PLAYER (never per payload id): an
      // embedded blob is saved as a brand-new local id for each player that carries it, so no
      // two players ever end up sharing a photo id (ADR 0013). An id with no embedded blob
      // always resolves to null — a same-device share loses nothing, since applyImport's
      // null-keeps-local rule preserves the real owner's photo untouched. This is what makes
      // applyImport's "any non-null incoming photo id is already valid locally" contract true.
      // None of this touches store state, so it's safe to run concurrently with another call.
      const blobCache = new Map<string, Blob | null>();
      const createdIds: string[] = [];
      const resolvedRoster: SharePayload['roster'] = [];
      for (const p of data.roster) {
        if (!p.photo) {
          resolvedRoster.push(p);
          continue;
        }
        let blob = blobCache.get(p.photo);
        if (blob === undefined) {
          const dataUrl = data.photos?.[p.photo];
          blob = dataUrl ? dataUrlToBlob(dataUrl) : null;
          blobCache.set(p.photo, blob);
        }
        if (!blob) {
          resolvedRoster.push({ ...p, photo: null });
          continue;
        }
        // A failed photo write costs that photo, not the import: fall back to null instead of
        // letting the rejection escape importShared (an orphaned write attempt is no worse than
        // the write never happening).
        try {
          const newId = await deps.putPhoto(blob);
          createdIds.push(newId);
          resolvedRoster.push({ ...p, photo: newId });
        } catch {
          resolvedRoster.push({ ...p, photo: null });
        }
      }
      const resolvedData: SharePayload = { ...data, roster: resolvedRoster };

      // Re-read state fresh, after every await above: a concurrent import (or any other state
      // change) during the resolution loop must not be clobbered by a stale snapshot.
      const { roster, stats, match } = get();
      const result = applyImport({ roster, stats, match }, resolvedData, mode);
      set({ roster: result.roster, stats: result.stats, match: result.match });

      // Every mode can now change photo ids (an embedded photo resolves to a new one), so the
      // gone-photo cleanup runs unconditionally; a photo-less merge keeps every old id, so
      // nothing is dropped there. Also drop any photo this run created via putPhoto that the
      // result roster doesn't reference (e.g. two incoming players linking by name onto one
      // local player: only one of their two new blobs ends up kept) — those ids leak as orphan
      // blobs otherwise.
      const kept = new Set(result.roster.map((p) => p.photo));
      for (const p of roster) if (p.photo && !kept.has(p.photo)) dropPhoto(p.photo);
      for (const id of createdIds) if (!kept.has(id)) dropPhoto(id);

      return result;
    },
  };
}
