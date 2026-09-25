# Block persistence writes until the stored document has loaded

Zustand's `persist` middleware writes the whole state on every `setState`, including the one that marks hydration as failed. Without a guard, a document that fails to load (invalid, from a newer app version, or unreadable because IndexedDB threw) is overwritten with empty defaults straight away, and when the read itself threw there is no backup. The document storage (`src/storage/document.ts`) therefore drops writes until a load has succeeded or found nothing stored. An unreadable document is copied once to `belot-state.backup`, and an existing backup is never overwritten. The store sets `hydration: 'failed'`, and the only way forward is the explicit `resetData()` action, which unlocks writes and starts from empty data. Write failures after loading set a runtime `saveError` flag instead of becoming unhandled rejections.

## Consequences

- The UI must handle `hydration === 'failed'` (Phase 5): explain, and offer "start fresh" (`resetData`). Exporting the backup can come with Phase 6 sharing.
- `saveError` stays set until `resetData`. Whether a later successful write should clear it is decided with the error banner in Phase 5.
- A future photo cleanup must treat photo ids in the backup as live.
