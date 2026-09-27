import qrcode from 'qrcode-generator';

/** A QR code image for `text` (error correction L), or null when it can't hold that much. */
export function qrDataUrl(text: string): string | null {
  try {
    const q = qrcode(0, 'L');
    q.addData(text);
    q.make();
    return q.createDataURL(6, 0);
  } catch {
    return null;
  }
}
