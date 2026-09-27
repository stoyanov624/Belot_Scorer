import { type SharePayload, SharePayloadSchema } from '../core/share';

const hasCompression = () => typeof CompressionStream !== 'undefined';

async function pipe(
  bytes: Uint8Array,
  stream: CompressionStream | DecompressionStream,
): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

function toBase64Url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '==='.slice((b64.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/** DATA_MODEL §4: JSON → deflate-raw (prefix `z`, or none with prefix `j`) → base64url. */
export async function encodeShare(payload: SharePayload): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  if (!hasCompression()) return `j${toBase64Url(bytes)}`;
  return `z${toBase64Url(await pipe(bytes, new CompressionStream('deflate-raw')))}`;
}

export async function decodeShare(code: string): Promise<unknown> {
  const kind = code[0];
  if (kind !== 'z' && kind !== 'j') throw new Error('unknown prefix');
  const bytes = fromBase64Url(code.slice(1));
  const raw = kind === 'z' ? await pipe(bytes, new DecompressionStream('deflate-raw')) : bytes;
  return JSON.parse(new TextDecoder().decode(raw));
}

export async function readShared(
  code: string,
): Promise<{ ok: true; data: SharePayload } | { ok: false }> {
  try {
    const parsed = SharePayloadSchema.safeParse(await decodeShare(code));
    return parsed.success ? { ok: true, data: parsed.data } : { ok: false };
  } catch {
    return { ok: false };
  }
}

export function parseSharedFile(text: string): { ok: true; data: SharePayload } | { ok: false } {
  try {
    const parsed = SharePayloadSchema.safeParse(JSON.parse(text));
    return parsed.success ? { ok: true, data: parsed.data } : { ok: false };
  } catch {
    return { ok: false };
  }
}

export function shareFileName(at: number): string {
  const d = new Date(at);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `belot-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.belot`;
}
