/** Bulgarian UI copy. Core returns codes; the UI looks the words up here. */
export const STRINGS = {
  appName: 'Белот',
  screens: {
    home: 'Белот',
    setup: 'Нова игра',
    table: 'Маса',
    history: 'История на мача',
    end: 'Край на мача',
    stats: 'Класация',
  },
  themes: {
    pub: { name: 'Кръчма', sub: 'бира и дим' },
    home: { name: 'Вкъщи', sub: 'ракия и салата' },
    casino: { name: 'Сукно', sub: 'класическа маса' },
    night: { name: 'Късна нощ', sub: 'последна поръчка' },
  },
  felts: { wood: 'Дърво', cloth: 'Сукно', check: 'Покривка', stone: 'Камък' },
  routeError: {
    // Not in the handoff: placeholder until the product owner supplies copy (see docs/Status.md).
    title: 'Нещо се обърка.',
    home: 'Към началния екран',
  },
} as const;
