import { type ChangeEvent, useEffect, useId, useRef, useState } from 'react';
import { AVATAR_EMOJI, randomEmoji } from '../../core/avatars';
import type { NameError } from '../../core/roster';
import { STRINGS } from '../../core/strings';
import { photoStore, useAppStore } from '../../store/instance';
import { Avatar } from '../../ui/Avatar';
import { Button } from '../../ui/Button';
import { cx } from '../../ui/cx';
import { Sheet } from '../../ui/Sheet';
import { usePhotoUrl } from '../../ui/usePhotoUrl';

const S = STRINGS.register;

export interface RegisterSheetProps {
  open: boolean;
  /** null registers a new player. */
  playerId: string | null;
  onClose: () => void;
  onSaved?: (id: string) => void;
}

export function RegisterSheet({ open, playerId, onClose, onSaved }: RegisterSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title={playerId ? S.titleEdit : S.titleNew}>
      {open && (
        <RegisterForm
          key={playerId ?? 'new'}
          playerId={playerId}
          onDone={onClose}
          onSaved={onSaved}
        />
      )}
    </Sheet>
  );
}

function RegisterForm({
  playerId,
  onDone,
  onSaved,
}: {
  playerId: string | null;
  onDone: () => void;
  onSaved?: (id: string) => void;
}) {
  const roster = useAppStore((s) => s.roster);
  const seats = useAppStore((s) => s.match?.seats ?? null);
  const savePlayer = useAppStore((s) => s.savePlayer);
  const removePlayer = useAppStore((s) => s.removePlayer);
  const existing = playerId ? (roster.find((p) => p.id === playerId) ?? null) : null;

  const [name, setName] = useState(existing?.name ?? '');
  const [emoji, setEmoji] = useState<string | null>(() =>
    existing ? existing.emoji : randomEmoji(Math.random),
  );
  const [photo, setPhoto] = useState<string | null>(existing?.photo ?? null);
  const [error, setError] = useState<NameError | null>(null);
  const photoUrl = usePhotoUrl(photo, photoStore);
  const fileRef = useRef<HTMLInputElement>(null);
  const errorId = useId();
  const seated = existing !== null && (seats?.includes(existing.id) ?? false);
  // The id of a photo this form stored but nobody saved yet; the unmount cleanup deletes it,
  // so Esc, backdrop, «Отказ» and delete never orphan a blob.
  const pendingUpload = useRef<string | null>(null);
  // Bumped whenever the avatar choice changes (and on unmount): an upload that finishes after a
  // newer choice is stale and is thrown away.
  const avatarVersion = useRef(0);
  useEffect(
    () => () => {
      avatarVersion.current += 1;
      const id = pendingUpload.current;
      pendingUpload.current = null;
      if (id) photoStore.remove(id).catch(() => {});
    },
    [],
  );

  const discardPending = () => {
    const id = pendingUpload.current;
    pendingUpload.current = null;
    if (id) photoStore.remove(id).catch(() => {});
  };

  const pickEmoji = (value: string) => {
    discardPending();
    avatarVersion.current += 1;
    setPhoto(null);
    setEmoji(value);
  };

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    avatarVersion.current += 1;
    const version = avatarVersion.current;
    let id: string;
    try {
      const { cropToJpeg } = await import('./crop-photo');
      id = await photoStore.put(await cropToJpeg(file));
    } catch {
      return; // A failed crop or write leaves the avatar as it was.
    }
    if (avatarVersion.current !== version) {
      photoStore.remove(id).catch(() => {});
      return;
    }
    discardPending();
    pendingUpload.current = id;
    setPhoto(id);
    setEmoji(null);
  };

  const save = () => {
    const result = savePlayer({
      id: existing?.id ?? null,
      name,
      emoji: photo ? null : emoji,
      photo,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    pendingUpload.current = null; // The store owns the saved photo now.
    onSaved?.(result.id);
    onDone();
  };

  const remove = () => {
    if (!existing) return;
    if (removePlayer(existing.id).ok) onDone();
  };

  return (
    <>
      <div className="flex items-center gap-3.5">
        <Avatar name={name.trim() || '?'} emoji={emoji} photoUrl={photoUrl} size={76} ring="a" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <input
            aria-label={S.name}
            placeholder={S.name}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
            aria-invalid={error !== null}
            aria-describedby={error ? errorId : undefined}
            className="h-14 w-full rounded-2xl border border-line bg-bg px-4 text-lg font-extrabold text-text placeholder:text-muted"
          />
          {error && (
            <p id={errorId} role="alert" className="text-sm font-bold text-team-b">
              {S.errors[error]}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[13px] font-extrabold uppercase tracking-[0.06em] text-muted">
          {S.icon}
        </span>
        <button
          type="button"
          onClick={() => pickEmoji(randomEmoji(Math.random))}
          className="h-11 rounded-xl border border-line bg-s2 px-3 text-sm font-extrabold transition-transform active:scale-95"
        >
          {S.random}
        </button>
      </div>

      <div className="grid grid-cols-6 gap-2">
        {AVATAR_EMOJI.map((value) => (
          <button
            key={value}
            type="button"
            aria-label={value}
            aria-pressed={!photo && emoji === value}
            onClick={() => pickEmoji(value)}
            className={cx(
              'aspect-square rounded-2xl border-2 bg-s2 text-2xl transition-transform active:scale-95',
              !photo && emoji === value ? 'border-team-a' : 'border-transparent',
            )}
          >
            {value}
          </button>
        ))}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => void onFile(event)}
      />
      <Button onClick={() => fileRef.current?.click()}>{S.photo}</Button>

      <div className="grid grid-cols-2 gap-2.5">
        <Button onClick={onDone}>{S.cancel}</Button>
        <Button variant="primary" onClick={save}>
          {S.save}
        </Button>
      </div>

      {existing &&
        (seated ? (
          <p className="text-center text-sm font-bold text-muted">{S.inMatch}</p>
        ) : (
          <Button variant="dangerText" onClick={remove}>
            {S.delete}
          </Button>
        ))}
    </>
  );
}
