import type { Player } from '../../core/model';
import { photoStore } from '../../store/instance';
import { Avatar, type AvatarProps } from '../../ui/Avatar';
import { usePhotoUrl } from '../../ui/usePhotoUrl';

/** A roster player's avatar, loading their photo from the photo store. */
export function PlayerAvatar({
  player,
  size,
  ring,
  decorative,
}: {
  player: Pick<Player, 'name' | 'emoji' | 'photo'>;
  size: number;
  ring?: AvatarProps['ring'];
  decorative?: AvatarProps['decorative'];
}) {
  const photoUrl = usePhotoUrl(player.photo, photoStore);
  return (
    <Avatar
      name={player.name}
      emoji={player.emoji}
      photoUrl={photoUrl}
      size={size}
      ring={ring}
      decorative={decorative}
    />
  );
}
