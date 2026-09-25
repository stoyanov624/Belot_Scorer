# Модел на данните, запазване и споделяне

## 1. Типове (TypeScript)

```ts
type Seat = 0 | 1 | 2 | 3;              // 0 Север, 1 Изток, 2 Юг, 3 Запад
type Team = 'A' | 'B';                  // A = 0,2 · B = 1,3
type ContractKey = 'clubs' | 'diamonds' | 'hearts' | 'spades' | 'nt' | 'at';
type DeclKey = 'belot' | 'terca' | 'kvarta' | 'kvinta' | 'kare';
type Card = '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

interface Player {            // регистър
  id: string;                 // 'p' + base36 timestamp
  name: string;               // уникално (case-insensitive)
  emoji: string | null;       // взаимно изключващо се със photo
  photo: string | null;       // 192×192 JPEG (в прототипа data URL)
}

interface Declaration {       // в текущото раздаване
  id: string;
  seat: Seat;
  key: DeclKey;
  top?: Card | null;          // горна карта на поредица
  rank?: 'Q'|'K'|'10'|'A'|'9'|'J' | null; // ранг на каре
}

interface Deal {              // записано раздаване
  a: number; b: number;       // точки за мача (закръглени)
  contract: ContractKey;
  caller: Seat;
  verdict: 'ok' | 'inside' | 'hang';
  capo: Team | null;
  raw: [number, number];      // rawA, rawB
  hangTo: Team | null;        // към кого отидоха висящите
  prevHang: number;           // hang преди това раздаване (за отмяна)
  decls: Array<Omit<Declaration,'id'> & { valid: boolean }>;
}

interface Match {             // текущ мач
  seats: [string, string, string, string];   // Player.id по място
  teamA: string; teamB: string;              // имена на отборите
  games: Deal[];
  current: Declaration[];
  contract: ContractKey | null;
  caller: Seat | null;
  hang: number;
  bestOf: 1 | 3 | 5 | 7;
  series: { A: number; B: number };
  screen: 'game' | 'end';
}

interface MatchRecord {       // в класацията
  id: string;                 // 'm' + base36 timestamp
  date: number;
  seats: [string, string, string, string];
  names: [string, string, string, string];   // имена към момента
  teamA: string; teamB: string;
  totalA: number; totalB: number;
  games: Array<{ decls: Deal['decls'] }>;
}

interface Settings { theme: 'pub'|'home'|'casino'|'night'; felt: 'wood'|'cloth'|'check'|'stone'; targetScore: number; showDealer: boolean; }
```

## 2. Запазване (локално)

Прототипът ползва `localStorage`:
- `belot-roster` → `Player[]`
- `belot-stats` → `MatchRecord[]`
- `belot-match-v4` → текущ `Match` + `screen`, `theme`, `felt`

Записва се при всяка промяна; при старт се възстановява (затворените sheets/popover-и не се пазят). В нативната версия: MMKV/AsyncStorage (RN) или IndexedDB (уеб); снимките като отделни файлове.

## 3. Потоци на състоянието

```
home ─ Нова игра ─▶ setup ─ Раздавай! ─▶ game ⇄ history
                                         │
          ┌── Край на раздаване ─────────┤ (contract? → decls? → points → save)
          │                              │
          │   auto (≥151, ≠, не капо) ───▶ end ─ Мач N → ─▶ game (серия)
          └── Край на мач (потвърждение) ▶ end ─ Реванш ───▶ game (нова серия)
                                             └ Към началния ─▶ home
home ─ Класация ─▶ stats
```

## 4. Споделяне без сървър

### Payload
```ts
interface SharePayload {
  app: 'belot'; v: 1; at: number;
  roster: Player[];            // при scope 'match' — само 4-мата от мача
  stats: MatchRecord[];        // празно при scope 'match'
  match: Match | null;         // само при scope 'match'
}
```
Scope: `all` (играчи + класация) или `match` (текущ мач, достъпно само по време на мач).

### Кодиране (линк и QR)
1. `JSON.stringify(payload)` (без снимки — `photo: null`).
2. Компресия `deflate-raw` (CompressionStream); префикс **`z`**. Ако няма поддръжка — без компресия, префикс **`j`**.
3. Base64url (без `=`).
4. Линк: `<app-url>#belot=<code>`.

### QR
- Ако линкът ≤ 1400 символа → един QR с целия линк (отваря се от камерата на телефона).
- Иначе: `code` се разделя на части по 1100 символа, всяка като `BELOT|<sid>|<i>|<n>|<chunk>` (`sid` — 4 символа сесия). QR кодовете се сменят циклично на **900 ms**; приемащият събира частите по `sid` и ги съединява по ред.
- Error correction: L.

### Файл
- `belot-YYYY-MM-DD.belot` (JSON на payload-а, по избор **със** снимките). Изпраща се чрез Web Share (files) или download.

### Внос
- Източници: сканиране с камера (задна, `facingMode: environment`), поставен линк/код, файл, или отваряне на приложението с `#belot=` (автоматично; hash-ът се изчиства).
- Преглед преди прилагане: брой и имена на играчите, брой мачове, резултат на текущия мач.
- **Добави към моите** (merge):
  - играч със същия `id` → обновява се (снимката се пази, ако новата липсва);
  - играч със същото име (case-insensitive) → свързва се към съществуващия (id remap), снимка се взима, ако има;
  - иначе → добавя се.
  - Мачове в класацията се добавят, ако `id` не съществува (без дубликати); `seats` се преназначават по id remap.
- **Добави и продължи мача тук**: като горното + текущият мач се заменя с получения (seats remap) и се отваря масата.
- **Замени всичките ми данни**: изчиства регистъра и класацията и ги заменя (изисква второ натискане).

### Ограничения
- Еднократно прехвърляне, без живо синхронизиране (за това е нужен бекенд — напр. стая с код + WebSocket/Firestore).
- Камерата изисква HTTPS и разрешение от потребителя.
