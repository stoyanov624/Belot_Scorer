import { describe, expect, it } from 'vitest';
import { allowedDeclarations } from './declarations';
import type { ContractKey, Declaration, DeclKey, Seat } from './model';

let n = 0;
const decl = (seat: Seat, key: DeclKey): Declaration => ({
  id: `d${n++}`,
  seat,
  key,
  top: null,
  rank: null,
});
const deal = (contract: ContractKey | null, current: Declaration[] = []) => ({ contract, current });

describe('allowedDeclarations', () => {
  it('blocks everything until a contract is chosen', () => {
    expect(allowedDeclarations(deal(null), 0)).toEqual({ options: [], blocked: 'no-contract' });
  });

  it('blocks everything in no trumps', () => {
    expect(allowedDeclarations(deal('nt'), 0)).toEqual({ options: [], blocked: 'no-trumps' });
  });

  it('offers every declaration at the start of a colour deal', () => {
    expect(allowedDeclarations(deal('hearts'), 0).options).toEqual([
      'belot',
      'terca',
      'kvarta',
      'kvinta',
      'kare',
    ]);
  });

  it('allows one belot per colour deal across all seats', () => {
    expect(allowedDeclarations(deal('hearts', [decl(1, 'belot')]), 0).options).not.toContain(
      'belot',
    );
  });

  it('allows up to four belots in all trumps', () => {
    const three = [decl(0, 'belot'), decl(1, 'belot'), decl(2, 'belot')];
    expect(allowedDeclarations(deal('at', three), 3).options).toContain('belot');
    expect(allowedDeclarations(deal('at', [...three, decl(3, 'belot')]), 0).options).not.toContain(
      'belot',
    );
  });

  it('respects the eight cards of a player', () => {
    const afterQuinte = allowedDeclarations(deal('spades', [decl(0, 'kvinta')]), 0).options;
    expect(afterQuinte).toContain('terca');
    expect(afterQuinte).not.toContain('kvarta');
    expect(afterQuinte).not.toContain('kare');
    // another seat is unaffected
    expect(allowedDeclarations(deal('spades', [decl(0, 'kvinta')]), 1).options).toContain('kvinta');
  });

  it('reports no-cards when nothing is left', () => {
    const full = [decl(0, 'belot'), decl(0, 'kare'), decl(0, 'kare')];
    expect(allowedDeclarations(deal('clubs', full), 0)).toEqual({
      options: [],
      blocked: 'no-cards',
    });
  });

  it('caps fours of a kind at six per deal', () => {
    const six = [0, 0, 1, 1, 2, 2].map((s) => decl(s as Seat, 'kare'));
    expect(allowedDeclarations(deal('at', six), 3).options).not.toContain('kare');
  });
});
