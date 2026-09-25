import { useEffect, useState } from 'react';
import type { PhotoStore } from '../storage/photos';

/**
 * Object URL for a stored player photo; revoked when the id changes or on unmount. A failed
 * read leaves it null (the Avatar falls back to the emoji or initial).
 *
 * Pass a stable `photos` object, i.e. the module singleton `photoStore` from
 * `src/store/instance.ts`: a new object each render re-runs the effect and reloads the photo.
 */
export function usePhotoUrl(
  photoId: string | null,
  photos: Pick<PhotoStore, 'get'>,
): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    setUrl(null);
    if (!photoId) return;
    let cancelled = false;
    let created: string | null = null;
    photos
      .get(photoId)
      .then((blob) => {
        if (cancelled || !blob) return;
        created = URL.createObjectURL(blob);
        setUrl(created);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [photoId, photos]);

  return url;
}
