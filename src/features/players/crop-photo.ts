/** Output size of a player photo (README §2). */
export const PHOTO_PX = 192;

/** The centred square of a width × height image. */
export function squareSource(
  width: number,
  height: number,
): { sx: number; sy: number; size: number } {
  const size = Math.min(width, height);
  return { sx: (width - size) / 2, sy: (height - size) / 2, size };
}

/** Crops an uploaded image to a centred 192×192 JPEG (quality 0.8). Load with import(). */
export async function cropToJpeg(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const { sx, sy, size } = squareSource(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = PHOTO_PX;
  canvas.height = PHOTO_PX;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('2D canvas unavailable');
  context.drawImage(bitmap, sx, sy, size, size, 0, 0, PHOTO_PX, PHOTO_PX);
  bitmap.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('JPEG encoding failed'))),
      'image/jpeg',
      0.8,
    );
  });
}
