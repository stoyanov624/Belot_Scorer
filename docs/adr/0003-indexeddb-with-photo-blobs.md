# IndexedDB storage, photos as separate Blobs

The prototype kept everything in `localStorage` and stored player photos as data URLs inside the JSON, which runs into the ~5 MB limit after a few photos. We persist the app state as one versioned JSON document in IndexedDB (`idb-keyval`, via Zustand `persist` with async storage) and store photos as Blobs in a separate store, keyed by `photoId`. **`Player.photo` holds a photo id, not a data URL**, which differs from `docs/design-handoff/DATA_MODEL.md`. Photos are base64-encoded only inside a `.belot` file when the user asks to include them. Links and QR codes never carry photos. On mobile this maps to MMKV for the state and the file system for photos.

## Consequences

The persisted document carries a `version`, and loading goes through Zod-validated migrations. Changing the stored shape means adding a migration, never editing the old schema in place.
