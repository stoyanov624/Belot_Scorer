import type { DeclInput, Team } from './model';
import {
  CARDS,
  DEFAULT_RULES,
  declPoints,
  isSequence,
  KARE_RANKS,
  type RulesConfig,
  seqLength,
  teamOf,
} from './rules';

export type ResolveError = 'seq-top-missing' | 'kare-rank-missing' | 'kare-duplicate';

export interface Resolution {
  errors: ResolveError[];
  /** null = no sequences declared, 'none' = full tie (all cancelled). */
  seqWinner: Team | 'none' | null;
  kareWinner: Team | null;
  contested: { seq: boolean; kare: boolean };
  topRequired: boolean[];
  valid: boolean[];
  points: Record<Team, number>;
}

type Indexed = { d: DeclInput; i: number };

const byTeam = (list: Indexed[], team: Team) => list.filter((x) => teamOf(x.d.seat) === team);

/**
 * When `errors` is non-empty, `valid` and `points` are provisional (computed as if the
 * missing/duplicate rank didn't block resolution) and must not be recorded.
 */
export function resolve(
  decls: readonly DeclInput[],
  rules: RulesConfig = DEFAULT_RULES,
): Resolution {
  const errors: ResolveError[] = [];
  const all: Indexed[] = decls.map((d, i) => ({ d, i }));
  const topRequired = decls.map(() => false);

  // Sequences
  const seqs = all.filter((x) => isSequence(x.d.key));
  const sA = byTeam(seqs, 'A');
  const sB = byTeam(seqs, 'B');
  const len = (x: Indexed) => seqLength(x.d.key);
  let seqWinner: Resolution['seqWinner'] = null;
  if (sA.length && sB.length) {
    const lA = Math.max(...sA.map(len));
    const lB = Math.max(...sB.map(len));
    if (lA !== lB) {
      seqWinner = lA > lB ? 'A' : 'B';
    } else {
      const tied = seqs.filter((x) => len(x) === lA);
      for (const x of tied) topRequired[x.i] = true;
      if (tied.some((x) => x.d.top === null)) {
        errors.push('seq-top-missing');
      } else {
        const best = (list: Indexed[]) =>
          Math.max(
            ...list
              .filter((x) => len(x) === lA)
              .map((x) => (x.d.top === null ? -1 : CARDS.indexOf(x.d.top))),
          );
        const tA = best(sA);
        const tB = best(sB);
        seqWinner = tA === tB ? 'none' : tA > tB ? 'A' : 'B';
      }
    }
  } else if (seqs.length) {
    seqWinner = sA.length ? 'A' : 'B';
  }

  // Fours of a kind
  const kares = all.filter((x) => x.d.key === 'kare');
  const missingRank = kares.some((x) => x.d.rank === null);
  if (missingRank) errors.push('kare-rank-missing');
  const ranks = kares.flatMap((x) => (x.d.rank === null ? [] : [x.d.rank]));
  if (new Set(ranks).size !== ranks.length) errors.push('kare-duplicate');
  const kA = byTeam(kares, 'A');
  const kB = byTeam(kares, 'B');
  let kareWinner: Team | null = null;
  if (kA.length && kB.length) {
    if (!missingRank) {
      const best = (list: Indexed[]) =>
        Math.max(...list.map((x) => (x.d.rank === null ? -1 : KARE_RANKS.indexOf(x.d.rank))));
      kareWinner = best(kA) > best(kB) ? 'A' : 'B';
    }
  } else if (kares.length) {
    kareWinner = kA.length ? 'A' : 'B';
  }

  const valid = decls.map((d) => {
    if (d.key === 'belot') return true;
    const team = teamOf(d.seat);
    return isSequence(d.key) ? team === seqWinner : team === kareWinner;
  });

  const points: Record<Team, number> = { A: 0, B: 0 };
  decls.forEach((d, i) => {
    if (valid[i]) points[teamOf(d.seat)] += declPoints(d, rules);
  });

  return {
    errors,
    seqWinner,
    kareWinner,
    contested: { seq: sA.length > 0 && sB.length > 0, kare: kA.length > 0 && kB.length > 0 },
    topRequired,
    valid,
    points,
  };
}
