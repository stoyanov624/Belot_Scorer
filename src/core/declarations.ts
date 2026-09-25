import { type DeclKey, DeclKeySchema, type Match, type Seat } from './model';
import { CARDS_USED, CONTRACT_KIND, MAX_BELOTS, MAX_KARES } from './rules';

export type DeclBlock = 'no-contract' | 'no-trumps' | 'no-cards';

export interface SeatOptions {
  options: DeclKey[];
  blocked: DeclBlock | null;
}

const CARDS_PER_PLAYER = 8;

export function allowedDeclarations(
  deal: Pick<Match, 'contract' | 'current'>,
  seat: Seat,
): SeatOptions {
  if (deal.contract === null) return { options: [], blocked: 'no-contract' };
  const kind = CONTRACT_KIND[deal.contract];
  if (kind === 'nt') return { options: [], blocked: 'no-trumps' };

  let used = 0;
  let belots = 0;
  let kares = 0;
  for (const d of deal.current) {
    if (d.seat === seat) used += CARDS_USED[d.key];
    if (d.key === 'belot') belots++;
    if (d.key === 'kare') kares++;
  }

  const options = DeclKeySchema.options.filter((key) => {
    if (key === 'belot') return belots < MAX_BELOTS[kind];
    if (key === 'kare' && kares >= MAX_KARES) return false;
    return used + CARDS_USED[key] <= CARDS_PER_PLAYER;
  });

  return { options, blocked: options.length ? null : 'no-cards' };
}
