import { describe, expect, it } from 'vitest';
import { qrDataUrl } from './qr';

describe('qrDataUrl', () => {
  it('returns a GIF data URL for a short link', () => {
    const url = qrDataUrl('http://localhost/#belot=zAbc123');
    expect(url).toMatch(/^data:image\/gif;base64,/);
  });

  it('returns null when the text is too big to fit a QR code', () => {
    expect(qrDataUrl('x'.repeat(5000))).toBeNull();
  });
});
