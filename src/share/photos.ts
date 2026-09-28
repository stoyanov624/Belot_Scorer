import type { SharePayload } from '../core/share';

/** `String.fromCharCode(...chunk)` blows the argument limit on a large photo, so slice it. */
const CHUNK = 0x8000;

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return `data:${blob.type};base64,${toBase64(bytes)}`;
}

const DATA_URL = /^data:([^;,]*);base64,(.*)$/s;

/** Decodes an `attachPhotos` data URL back to a Blob. Null for anything malformed. */
export function dataUrlToBlob(url: string): Blob | null {
  const match = url.match(DATA_URL);
  if (!match) return null;
  const [, type, data] = match as unknown as [string, string, string];
  try {
    const binary = atob(data);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    // TS's DOM lib types BlobPart as (BufferSource | Blob | string); a plain Uint8Array satisfies
    // that at runtime but not the declared overload without a cast (see share/codec.ts).
    return new Blob([bytes as BlobPart], { type });
  } catch {
    return null;
  }
}

/**
 * DATA_MODEL §4 / ADR 0013: embeds every distinct photo blob the roster references as a
 * `data:` URL, keyed by photo id, so a `.belot` file can travel without the photo store. A
 * player whose blob can't be found (deleted, or the caller has no photo store) is nulled
 * instead of carrying a dangling id; `photos` is left off the payload entirely when nothing
 * embedded.
 */
export async function attachPhotos(
  payload: SharePayload,
  get: (id: string) => Promise<Blob | undefined>,
): Promise<SharePayload> {
  const ids = new Set<string>();
  for (const p of payload.roster) if (p.photo) ids.add(p.photo);

  const photos: Record<string, string> = {};
  const missing = new Set<string>();
  await Promise.all(
    [...ids].map(async (id) => {
      const blob = await get(id);
      if (blob) photos[id] = await blobToDataUrl(blob);
      else missing.add(id);
    }),
  );

  const roster = payload.roster.map((p) =>
    p.photo && missing.has(p.photo) ? { ...p, photo: null } : p,
  );
  const result: SharePayload = { ...payload, roster };
  return Object.keys(photos).length > 0 ? { ...result, photos } : result;
}
