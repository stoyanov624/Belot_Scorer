# Persistence

How app data is saved, loaded, upgraded and protected, and how photos are stored.

## One versioned document

All app data is one IndexedDB value under the key `belot-state` (the `idb-keyval` default database):

```
{ version: 1, state: { roster, stats, match, settings } }
```

- `roster`: `Player[]` (`photo` is a photo id, never a data URL: [ADR 0003](../adr/0003-indexeddb-with-photo-blobs.md))
- `stats`: `MatchRecord[]` (finished matches, the source for the Leaderboard)
- `match`: the current `Match` or `null`
- `settings`: theme, felt, dealer marker, rules

Runtime-only fields (`hydration`, `saveError`) are never saved. One key means an import that "replaces all data" is one atomic write ([ADR 0002](../adr/0002-pure-core-transitions-thin-zustand-store.md)).

## Loading and migrations

`loadPersisted(doc)` in `src/core/persisted.ts` checks the `{ version, state }` envelope, runs `MIGRATIONS[n]` (version n → n+1) up to `PERSIST_VERSION`, then validates with Zod. Failures are codes: `not-a-document`, `future-version`, `missing-migration`, `invalid-state`. Changing the stored shape means bumping `PERSIST_VERSION` and adding a migration, never editing an old step.

## Write gate and recovery

Zustand's `persist` writes on every `setState`, so `src/storage/document.ts` ignores writes until a load has succeeded (or found nothing stored) ([ADR 0006](../adr/0006-gate-persistence-writes-until-load.md)).

- **Unreadable document:** it's copied once to `belot-state.backup` (an existing backup is never overwritten), the store reports `hydration: 'failed'`, and the original stays untouched.
- **Read error** (IndexedDB threw): the same `failed` state; nothing is written.
- **Recovery:** `resetData()` unlocks writes and starts from `EMPTY_STATE`. The backup is kept. Phase 5 adds the screen that offers this.
- **Write errors after loading** set `saveError: true`. It stays true until `resetData`.

## Startup

`src/store/instance.ts` builds the one production store. `main.tsx` calls `hydrateAppStore()` and renders only after it resolves, so no component sees empty defaults and nothing is written before the load. `hydration` is `pending` → `ready` | `failed`.

## Photos

Player photos are JPEG Blobs in a separate IndexedDB database, `belot-photos`, keyed by `Player.photo` (`src/storage/photos.ts`). The UI stores the Blob first, then saves the player with the returned id. The store deletes the old Blob when a photo is replaced or the player is removed. Orphans are possible (a photo stored, then the edit cancelled). Any future cleanup must also keep ids referenced from `belot-state.backup`. Photos travel only inside `.belot` files, never in links or QR codes ([ADR 0005](../adr/0005-share-format-v2-no-prototype-compat.md)).

## Testability

The store is built by `createAppStore(deps)` from injected `AppDeps` (storage, `newId`, `now`, `removePhoto`). Tests use `memoryKv` and never import `instance.ts`, the only module that touches real IndexedDB. On mobile the same `Kv` interface would map to MMKV and files.

## See also

- [DATA_MODEL](../design-handoff/DATA_MODEL.md) §1–2
- [Architecture overview](Overview.md) · [Core domain](Core%20domain.md) · [Testing](Testing.md)
