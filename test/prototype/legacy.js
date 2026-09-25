// Verbatim port of the HTML prototype's scoring logic, used only for parity tests.
// Source: docs/design-handoff/prototype/Belot v3.dc.html. Do not "fix" anything here.
const CARDS = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const SEQ = { terca: 3, kvarta: 4, kvinta: 5 };
const KARE_RANKS = ['Q', 'K', '10', 'A', '9', 'J'];
const KARE_PTS = { Q: 10, K: 10, '10': 10, A: 10, '9': 15, J: 20 };
const DECL = [
  { key: 'belot', pts: 2 }, { key: 'terca', pts: 2 }, { key: 'kvarta', pts: 5 },
  { key: 'kvinta', pts: 10 }, { key: 'kare', pts: '10+' },
];
const DMAP = Object.fromEntries(DECL.map((d) => [d.key, d]));
const KIND = { clubs: 'color', diamonds: 'color', hearts: 'color', spades: 'color', nt: 'nt', at: 'at' };
const MAXIN = { color: 16, at: 26, nt: 13 };
const teamOf = (seat) => (seat % 2 === 0 ? 'A' : 'B');
const declPts = (d) => (d.key === 'kare' ? (d.rank ? KARE_PTS[d.rank] : 10) : DMAP[d.key].pts);

export function seatOptions(st, i) {
  const kind = st.contract ? KIND[st.contract] : null, cur = st.current;
  if (!kind) return { msg: 'no-contract', opts: [] };
  if (kind === 'nt') return { msg: 'no-trumps', opts: [] };
  const mine = cur.filter((d) => d.seat === i);
  const used = mine.reduce((a, d) => a + (SEQ[d.key] || (d.key === 'kare' ? 4 : 0)), 0);
  const belots = cur.filter((d) => d.key === 'belot').length;
  const kares = cur.filter((d) => d.key === 'kare').length;
  const opts = DECL.filter((o) => {
    if (o.key === 'belot') return belots < (kind === 'color' ? 1 : 4);
    if (SEQ[o.key]) return used + SEQ[o.key] <= 8;
    if (o.key === 'kare') return used + 4 <= 8 && kares < 6;
    return true;
  });
  return { msg: opts.length ? '' : 'no-cards', opts: opts.map((o) => o.key) };
}

export function resolve(list) {
  const errors = [];
  const seqs = list.filter((d) => SEQ[d.key]);
  const sA = seqs.filter((d) => teamOf(d.seat) === 'A'), sB = seqs.filter((d) => teamOf(d.seat) === 'B');
  const maxLen = (arr) => Math.max(0, ...arr.map((d) => SEQ[d.key]));
  const required = new Set();
  let seqWin = null;
  if (sA.length && sB.length) {
    const lA = maxLen(sA), lB = maxLen(sB);
    if (lA !== lB) seqWin = lA > lB ? 'A' : 'B';
    else {
      seqs.filter((d) => SEQ[d.key] === lA).forEach((d) => required.add(d.id));
      const missing = seqs.filter((d) => required.has(d.id) && !d.top);
      if (missing.length) errors.push('seq-top-missing');
      else {
        const top = (arr) => Math.max(...arr.filter((d) => SEQ[d.key] === lA).map((d) => CARDS.indexOf(d.top)));
        const tA = top(sA), tB = top(sB);
        seqWin = tA === tB ? 'none' : tA > tB ? 'A' : 'B';
      }
    }
  } else if (seqs.length) seqWin = sA.length ? 'A' : 'B';
  const kares = list.filter((d) => d.key === 'kare');
  let kareWin = null;
  if (kares.some((d) => !d.rank)) errors.push('kare-rank-missing');
  const ranks = kares.filter((d) => d.rank).map((d) => d.rank);
  if (new Set(ranks).size !== ranks.length) errors.push('kare-duplicate');
  const kA = kares.filter((d) => teamOf(d.seat) === 'A'), kB = kares.filter((d) => teamOf(d.seat) === 'B');
  if (kA.length && kB.length) {
    if (!kares.some((d) => !d.rank)) {
      const best = (arr) => Math.max(...arr.map((d) => KARE_RANKS.indexOf(d.rank)));
      kareWin = best(kA) > best(kB) ? 'A' : 'B';
    }
  } else if (kares.length) kareWin = kA.length ? 'A' : 'B';
  const valid = (d) => d.key === 'belot' || (SEQ[d.key] ? teamOf(d.seat) === seqWin : teamOf(d.seat) === kareWin);
  const sum = (team) => list.filter((d) => teamOf(d.seat) === team && valid(d)).reduce((a, d) => a + declPts(d), 0);
  return { errors, valid, seqWin, kareWin, dA: sum('A'), dB: sum('B') };
}

export function calc(st) {
  const kind = KIND[st.contract];
  const max = MAXIN[kind], mult = kind === 'nt' ? 2 : 1;
  const res = resolve(st.current);
  let cA, cB, err = '';
  if (st.capo) { cA = st.capo === 'A' ? max + 9 : 0; cB = st.capo === 'B' ? max + 9 : 0; }
  else {
    const a = parseInt(st.inA, 10);
    if (st.inA === '' || isNaN(a)) { err = 'points-missing'; cA = 0; cB = 0; }
    else if (a < 0 || a > max) { err = 'points-range'; cA = a; cB = max - a; }
    else { cA = a; cB = max - a; }
  }
  const rawA = (cA + res.dA) * mult, rawB = (cB + res.dB) * mult;
  const T = teamOf(st.caller ?? 0), O = T === 'A' ? 'B' : 'A';
  const raw = { A: rawA, B: rawB };
  let m = { A: 0, B: 0 }, verdict = 'ok', hangPts = 0;
  if (raw[T] < raw[O]) { verdict = 'inside'; m[O] = rawA + rawB; }
  else if (raw[T] === raw[O]) { verdict = 'hang'; m[O] = raw[O]; hangPts = raw[T]; }
  else { m.A = rawA; m.B = rawB; }
  let hangTo = null;
  if (st.hang > 0 && verdict !== 'hang') {
    hangTo = m.A > m.B ? 'A' : m.B > m.A ? 'B' : null;
    if (hangTo) m[hangTo] += st.hang;
  }
  const nextHang = verdict === 'hang' ? st.hang + hangPts : (hangTo ? 0 : st.hang);
  return { err, mA: m.A, mB: m.B, verdict, hangTo, nextHang, res };
}
