import { useEffect, useState } from 'react';
import type { PhotoStore } from '../storage/photos';

/** Object URL for a stored player photo; revoked when the id changes or on unmount. */
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
    void photos.get(photoId).then((blob) => {
      if (cancelled || !blob) return;
      created = URL.createObjectURL(blob);
      setUrl(created);
    });
    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [photoId, photos]);

  return url;
}
