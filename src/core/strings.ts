/**
 * The verb agrees with the team name: «Ние» speaks in first person plural, «Вие» in second,
 * and any other name keeps the handoff's third person. Deviates from the handoff's fixed
 * «печелят»/«черпят»/… (product owner, 2026-09-28). Matching is trimmed and case-insensitive.
 */
type TeamPerson = 'we' | 'you' | 'they';
const teamPerson = (team: string): TeamPerson => {
  const t = team.trim().toLocaleLowerCase('bg');
  return t === 'ние' ? 'we' : t === 'вие' ? 'you' : 'they';
};
type Conjugation = Record<TeamPerson, string>;
const agree = (team: string, forms: Conjugation) => forms[teamPerson(team)];

const WIN: Conjugation = { we: 'печелим', you: 'печелите', they: 'печелят' };
const PAY: Conjugation = { we: 'черпим', you: 'черпите', they: 'черпят' };
const MADE: Conjugation = { we: 'изкарахме', you: 'изкарахте', they: 'изкараха' };
const TAKE: Conjugation = { we: 'взимаме', you: 'взимате', they: 'взимат' };
const NO_SCORE: Conjugation = { we: 'не записваме', you: 'не записвате', they: 'не записват' };
const NO_CARDS: Conjugation = { we: 'не взехме', you: 'не взехте', they: 'не взеха' };

/** Bulgarian UI copy. Core returns codes; the UI looks the words up here. */
export const STRINGS = {
  // The product's name (product owner, 2026-10-01); «Белот» stays the game's name in the header.
  appName: 'Белотомания',
  screens: {
    home: 'Белотомания',
    setup: 'Нова игра',
  },
  themes: {
    pub: { name: 'Кръчма', sub: 'бира и дим' },
    home: { name: 'Вкъщи', sub: 'ракия и салата' },
    casino: { name: 'Сукно', sub: 'класическа маса' },
    night: { name: 'Късна нощ', sub: 'последна поръчка' },
  },
  felts: { wood: 'Дърво', cloth: 'Сукно', check: 'Покривка', stone: 'Камък' },
  routeError: {
    title: 'Нещо се обърка.',
    home: 'Към началния екран',
  },
  /** Indexed by Seat: 0 North, 1 East, 2 South, 3 West. */
  seats: ['Север', 'Изток', 'Юг', 'Запад'],
  home: {
    subtitle: 'Записва обявите и точките, докато вие играете.',
    newGame: 'Нова игра',
    stats: 'Класация',
    theme: 'Тема',
    newPlayer: 'Нов играч',
    share: 'Сподели / Внос',
    players: 'Играчи',
    empty: 'Още няма регистрирани играчи.',
    // Not in the handoff (ADR 0011). See docs/Status.md.
    continueMatch: 'Продължи мача',
  },
  register: {
    titleNew: 'Нов играч',
    titleEdit: 'Редакция на играч',
    name: 'Име или прякор',
    icon: 'Смешна иконка',
    random: '🎲 Случайна',
    photo: 'Или качи снимка',
    cancel: 'Отказ',
    save: 'Запази',
    delete: 'Изтрий играча',
    // Not in the handoff (ADR 0010): shown instead of the delete button. See docs/Status.md.
    inMatch: 'Играчът е в текущия мач и не може да бъде изтрит.',
    errors: { empty: 'Въведете име.', duplicate: 'Вече има играч с това име.' },
  },
  setup: {
    back: '← Начало',
    title: 'Нова игра',
    hint: 'Изберете кой къде седи. Партньорите седят един срещу друг.',
    teamA: 'Ние',
    teamB: 'Вие',
    teamASeats: 'Север · Юг',
    teamBSeats: 'Изток · Запад',
    // Not in the handoff: accessible names for the team-name inputs. See docs/Status.md.
    teamAName: 'Име на отбора Север · Юг',
    teamBName: 'Име на отбора Изток · Запад',
    pickPlayer: 'Избери играч',
    series: 'Брой мачове',
    seriesOptions: [
      { value: 1, label: '1 мач' },
      { value: 3, label: '2 от 3' },
      { value: 5, label: '3 от 5' },
      { value: 7, label: '4 от 7' },
    ],
    hintTarget: (target: number) => `Всеки мач се играе до ${target} точки`,
    hintSeats: 'Изберете играч за всяко от 4-те места.',
    deal: 'Раздавай!',
    seatTitle: (seat: string) => `Място: ${seat}`,
    newPlayer: '+ Нов играч',
    // Not in the handoff (ADR 0011). See docs/Status.md.
    replaceTitle: 'Нов мач?',
    replaceBody: (a: number, b: number) => `Текущият мач (${a} : ${b}) ще бъде изтрит.`,
    replaceConfirm: 'Започни нов мач',
    replaceCancel: 'Отказ',
  },
  theme: { title: 'Атмосфера', themes: 'Тема', felts: 'Маса', done: 'Готово' },
  contracts: {
    clubs: { sym: '♣', label: 'Спатия' },
    diamonds: { sym: '♦', label: 'Каро' },
    hearts: { sym: '♥', label: 'Купа' },
    spades: { sym: '♠', label: 'Пика' },
    nt: { sym: 'БК', label: 'Без коз' },
    at: { sym: 'ВК', label: 'Всичко коз' },
  },
  decls: { belot: 'Белот', terca: 'Терца', kvarta: 'Кварта', kvinta: 'Квинта', kare: 'Каре' },
  table: {
    share: 'Сподели',
    clear: 'Изчисти',
    theme: 'Тема',
    history: 'История',
    // Mobile: the header's actions sit behind one menu button; its accessible name.
    menu: 'Меню',
    deal: (n: number) => `Раздаване ${n}`,
    headerSingle: (target: number) => `Белот · до ${target}`,
    headerSeries: (matchNo: number, a: number, b: number, format: string) =>
      `Мач ${matchNo} · серия ${a}:${b} · ${format}`,
    pickContract: 'Избери игра',
    dealer: 'раздава',
    declared: (a: number, b: number) => `обяви ${a} · ${b}`,
    hanging: (n: number) => `висят ${n}`,
    declares: (name: string) => `${name} обявява`,
    blocked: {
      'no-contract': 'Първо изберете играта в средата на масата.',
      'no-trumps': 'Без коз — не се обявява.',
      'no-cards': 'Няма повече възможни обяви с 8 карти.',
    },
    endDeal: 'Край на раздаване',
    endMatch: 'Край на мач',
    // Not in the handoff: accessible name of a declaration chip's remove action.
    removeDecl: (label: string) => `Премахни ${label}`,
  },
  contract: {
    title: 'Каква е играта?',
    caller: 'Кой обяви играта?',
    ntWarning: 'При без коз няма обяви — записаните в това раздаване ще се изтрият.',
    pick: 'Изберете игра и кой я обяви',
    done: 'Готово',
    toPoints: 'Напред към точките',
  },
  deal: {
    resolveTitle: 'Уточнете обявите',
    resolveHint: 'До коя карта е всяка поредица и от какво е карето. По-слабите отпадат.',
    to: 'до',
    from: 'от',
    counts: 'зачита се',
    drops: 'отпада',
    seqWin: (team: string) => `Поредици: зачитат се на ${team}, другите отпадат.`,
    seqTie: 'Поредици: равни — всички отпадат.',
    kareWin: (team: string) => `Карета: зачитат се на ${team}, другите отпадат.`,
    errors: {
      'seq-top-missing': 'Посочете до коя карта са поредиците с еднаква дължина.',
      'kare-rank-missing': 'Посочете от какви карти е всяко каре.',
      'kare-duplicate': 'Две карета от едни и същи карти не са възможни.',
    },
    cancel: 'Отказ',
    next: 'Напред',
    pointsTitle: (n: number) => `Край на раздаване ${n}`,
    // ADR 0020: exact points are entered; the score is written rounded.
    hintColor: (total: number) =>
      `Точки от картите с последните 10 (общо ${total}). Записват се закръглени.`,
    hintNt: (total: number) =>
      `Точки от картите с последните 10 (общо ${total}). Записват се закръглени и удвоени.`,
    capo: 'Капо',
    rows: {
      cards: 'Карти',
      cardsCapo: 'Карти + капо',
      decls: 'Обяви',
      total: 'Общо',
      totalNt: 'Общо ×2',
      match: 'В мача',
    },
    made: (team: string) => `${team} ${agree(team, MADE)} играта.`,
    inside: (team: string, n: number) => `Вътре! ${team} ${agree(team, TAKE)} всички ${n} точки.`,
    hang: (team: string, n: number) =>
      `Висяща: ${team} ${agree(team, NO_SCORE)}, ${n} т. висят за следващото раздаване.`,
    hangTo: (n: number, team: string) => ` +${n} висящи за ${team}.`,
    capoNote: (team: string, bonus: number, text: string) => `Капо за ${team} (+${bonus}). ${text}`,
    // ADR 0018: the match can't end on a deal in which its losers took no card points.
    endBlocked: (team: string) =>
      `Мачът не приключва: ${team} ${agree(team, NO_CARDS)} точки от картите — играе се още едно раздаване.`,
    errMissing: 'Въведете точките от картите.',
    errRange: (max: number) => `Точките от картите трябва да са между 0 и ${max}.`,
    back: 'Назад',
    save: 'Запиши раздаването',
  },
  clear: {
    title: 'Изчистване',
    body: 'Текущото раздаване започва наново: обявите и избраната игра се изтриват.',
    current: (n: number) => `Изчисти раздаване ${n}`,
    undo: (n: number) => `Изтрий последното записано раздаване (${n})`,
    // From the prototype's clear sheet; README §7 omits it (product owner confirmed 2026-09-26).
    cancel: 'Отказ',
  },
  endMatch: {
    title: 'Приключване на мача?',
    body: (a: number, b: number) =>
      `Резултат ${a} : ${b}. Обявите от текущото раздаване няма да се запишат, ако не е приключено.`,
    keep: 'Продължи',
    end: 'Приключи мача',
  },
  history: {
    back: '← Назад',
    // Mobile: history opened from the table is a dialog closed with this.
    close: 'Затвори',
    title: 'История на мача',
    to: (target: number) => `до ${target}`,
    inProgress: (n: number) => `Раздаване ${n} · в ход`,
    deal: (n: number) => `Раздаване ${n}`,
    noDecls: 'Без обяви',
    runningTotal: (a: number, b: number) => `Общо след раздаването: ${a} : ${b}`,
    empty: 'Още няма приключени раздавания.',
    capo: (team: string) => `Капо за ${team}`,
    inside: (team: string) => `Вътре — ${team} ${agree(team, NO_SCORE)}`,
    hang: 'Висяща',
    hangTo: (team: string) => `Висящите отиват при ${team}`,
  },
  end: {
    line: (deals: number) => `Край на мача · ${deals} раздавания`,
    lineSeries: (matchNo: number, deals: number) => `Край на мач ${matchNo} · ${deals} раздавания`,
    wins: (team: string) => `${team} ${agree(team, WIN)}`,
    winsMatch: (team: string) => `${team} ${agree(team, WIN)} мача`,
    winsSeries: (team: string) => `${team} ${agree(team, WIN)} серията`,
    pays: (team: string) => `🍻 ${team} ${agree(team, PAY)} следващия рунд`,
    tie: 'Равенство',
    series: (format: string) => `Серия · ${format}`,
    decls: (team: string) => `Обяви ${team}`,
    next: (n: number) => `Мач ${n} →`,
    history: 'История',
    stop: 'Прекрати',
    home: 'Към началния екран',
    rematch: 'Реванш',
    // From the prototype: "Иван и Мария".
    names: (a: string, b: string) => `${a} и ${b}`,
  },
  stats: {
    back: '← Начало',
    title: 'Класация',
    hint: (n: number) => `Зачетени обяви в точки от ${n} завършени мача.`,
    players: 'По играчи',
    pairs: 'По отбори',
    // Not in the handoff: the accessible name of the players/pairs Segmented.
    tabs: 'Класация по',
    // Both sentences are from the prototype; the handoff README has no empty-state copy here.
    empty: 'Още няма завършени мачове. Класацията се попълва след всеки приключен мач.',
    sub: (count: number, belots: number, wins: number, matches: number) =>
      `${matches} ${matches === 1 ? 'мач' : 'мача'} · ${wins} ${wins === 1 ? 'победа' : 'победи'} · ${count} обяви · ${belots} белота`,
    // The period filter (product owner, 2026-10-01). Not persisted: «Всички» on every visit.
    period: 'Период',
    presets: {
      all: 'Всички',
      thisYear: 'Тази година',
      lastYear: 'Миналата година',
      thisMonth: 'Този месец',
    },
    months: [
      'януари',
      'февруари',
      'март',
      'април',
      'май',
      'юни',
      'юли',
      'август',
      'септември',
      'октомври',
      'ноември',
      'декември',
    ],
    monthsShort: [
      'яну',
      'фев',
      'мар',
      'апр',
      'май',
      'юни',
      'юли',
      'авг',
      'сеп',
      'окт',
      'ное',
      'дек',
    ],
    weekdays: ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'нд'],
    range: (from: string, to: string) => `${from} – ${to}`,
    pickHint: 'Изберете първия и последния ден.',
    prevMonth: 'Предишен месец',
    nextMonth: 'Следващ месец',
    prevYear: 'Предишна година',
    nextYear: 'Следваща година',
    apply: 'Покажи',
    emptyPeriod: 'Няма завършени мачове в този период.',
    points: 'точки',
    reset: 'Нулирай класацията',
    resetArmed: 'Натиснете пак, за да изтриете цялата класация',
  },
  share: {
    title: 'Сподели',
    scopes: [
      { value: 'all', label: 'Играчи + класация' },
      { value: 'match', label: 'Текущия мач' },
    ],
    // Not in the handoff: the accessible name of the scope switch.
    scopeLabel: 'Какво да се сподели',
    summaryMatch: 'Другият телефон продължава мача от същото място.',
    summaryAll: (players: number, matches: number) =>
      `${players} играчи и ${matches} мача от класацията.`,
    part: (i: number, n: number) => `Част ${i} от ${n}`,
    hintSingle: 'Сканирайте с камерата на другия телефон или от „Внос“ в уеб страницата.',
    hintMulti: 'Дръжте екрана пред камерата — частите се сменят сами, докато се прочетат всички.',
    tooBig: 'Данните са твърде много за QR код — използвайте линк или файл.',
    preparing: 'Подготвям…',
    copyLink: 'Копирай линк',
    sendFile: 'Изпрати файл',
    photos: 'Включи снимките във файла (линкът и QR са без снимки)',
    copied: 'Линкът е копиран.',
    downloaded: 'Файлът е изтеглен.',
    close: 'Затвори',
    toImport: 'Внос от друг телефон',
    // Not in the handoff: the QR image's alt text.
    qrAlt: 'QR код',
  },
  import: {
    title: 'Внос',
    intro:
      'Сканирайте QR кода от другия телефон, поставете линк или изберете файл. Работи и в браузър на компютър с камера.',
    scan: '📷 Сканирай QR код',
    stop: 'Спри камерата',
    scanned: (k: number, n: number) => `Прочетени ${k} от ${n} части`,
    cameraError: 'Няма достъп до камерата. Разрешете го или поставете линка ръчно.',
    or: 'или',
    placeholder: 'https://…#belot=…',
    // Not in the handoff: the accessible name of the paste field.
    pasteLabel: 'Линк или код',
    read: 'Прочети линка',
    file: 'Избери файл',
    found: 'Намерено',
    players: (n: number, names: string) => `${n} играчи: ${names}`,
    matches: (n: number) => `${n} завършени мача за класацията`,
    currentMatch: (teamA: string, a: number, b: number, teamB: string) =>
      `Текущ мач: ${teamA} ${a} : ${b} ${teamB}`,
    merge: 'Добави към моите',
    take: 'Добави и продължи мача тук',
    replace: 'Замени всичките ми данни',
    replaceArmed: 'Натиснете пак — моите данни ще се изтрият',
    noCode: 'Не открих код в текста.',
    badCode: 'Линкът не може да се прочете.',
    badFile: 'Файлът не е от Белот.',
    done: (players: number, matches: number, tookMatch: boolean) =>
      `Готово: ${players} играчи${matches ? `, ${matches} мача в класацията` : ''}${tookMatch ? ', мачът продължава тук' : ''}.`,
    close: 'Затвори',
  },
  recovery: {
    // Not in the handoff (ADR 0006): see docs/Status.md.
    title: 'Данните не могат да бъдат заредени',
    body: 'Запазените данни на това устройство са повредени или са от по-нова версия на приложението. Копие е запазено; можете да започнете наново с празни данни.',
    reset: 'Започни наново',
    saveError: 'Промените не се записват на това устройство.',
  },
} as const;
