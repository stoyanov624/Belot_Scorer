/** The handoff's "funny icons" for players (README §2), in grid order. */
export const AVATAR_EMOJI: readonly string[] = [
  '🍺',
  '🍷',
  '🥃',
  '🍻',
  '🍸',
  '🧉',
  '🤠',
  '🥸',
  '😎',
  '🤓',
  '🧐',
  '😈',
  '🤡',
  '👴',
  '👵',
  '🧔',
  '🐻',
  '🦊',
  '🐷',
  '🐸',
  '🐔',
  '🦉',
  '🐗',
  '🐙',
  '🥒',
  '🌶️',
  '🧀',
  '🎩',
  '🃏',
  '👑',
];

/** `random` returns [0, 1) like Math.random; core stays deterministic by taking it as input. */
export function randomEmoji(random: () => number): string {
  const index = Math.min(Math.floor(random() * AVATAR_EMOJI.length), AVATAR_EMOJI.length - 1);
  return AVATAR_EMOJI[index] ?? '🃏';
}
