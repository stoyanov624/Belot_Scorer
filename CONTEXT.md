# Belot Scorer

A scorekeeping notebook for the Bulgarian card game Belot. It is not the game itself: it records what is declared during a deal, resolves which declarations count, computes points, and keeps history and a leaderboard across devices without a server.

## Language

### Table

**Player** (Играч):
A person registered on the device, identified by a name that is unique case-insensitively and by an avatar (emoji or photo).
_Avoid_: user, member

**Roster** (Регистър):
The set of all players known on this device.
_Avoid_: player list, contacts

**Seat** (Място):
One of four fixed positions: North (0), East (1), South (2), West (3). Partners sit opposite each other.
_Avoid_: position, slot

**Team** (Отбор):
Two partners. Team A holds North and South, team B holds East and West. A team has a display name ("Ние"/"Вие") that does not affect its identity.
_Avoid_: side, pair

**Pair** (Двойка):
Two specific players who were partners, regardless of seats or team name. This is the unit of the team leaderboard.

**Dealer** (Раздаващ):
The seat dealing the current deal. It rotates counter-clockwise N → W → S → E.

### Play

**Deal** (Раздаване):
One hand of eight cards per player, from contract to scoring. A deal is either **current** (in progress) or **recorded** (saved into the match).
_Avoid_: hand, round, game

**Contract** (Игра):
What a deal is played in: one of the four suits, No Trumps (Без коз) or All Trumps (Всичко коз).
_Avoid_: bid, trump (for the whole concept)

**Caller** (Обявил играта):
The seat that announced the contract. Their team is the **playing team**, and the other team is the **defending team**.

**Declaration** (Обява):
A combination announced during a deal: Belot, Tierce (Терца), Quarte (Кварта), Quinte (Квинта) or Four-of-a-kind (Каре).
_Avoid_: call, bonus, meld

**Sequence** (Поредица):
A Tierce, Quarte or Quinte. Sequences are compared by length, then by their **top card**.

**Resolution** (Уточняване):
The end-of-deal step that decides which sequences and fours of a kind count (**valid**) and which drop out.

**Card points** (Точки от картите):
Rounded points a team took in tricks, including the last-ten bonus. The two teams' card points always sum to the contract's maximum (16, 26 or 13).

**Capot** (Капо):
One team took every trick. It gets the maximum plus 9. A match cannot end on a capot deal.

**Made** (Изкарана):
The playing team scored more than the defenders. Both teams record their points.

**Inside** (Вътре):
The playing team scored less than the defenders. The defenders record everything and the playing team records nothing.

**Hanging** (Висяща):
The playing team tied the defenders. The defenders record their points, and the playing team's points **hang** until the next deal with a winner.
_Avoid_: pending, carried

**Hanging points** (Висящи точки):
The accumulated points waiting to go to whichever team wins the next deal that is not hanging.

### Competition

**Match** (Мач):
Deals played until one team reaches the target score (default 151) with no tie and no capot on the last deal.
_Avoid_: game, set

**Series** (Серия):
A best-of-N sequence of matches (1, 3, 5 or 7) between the same four seats.
_Avoid_: tournament

**Match record** (Запис на мач):
A finished match as stored for the leaderboard: seats, names at the time, totals and valid declarations per deal.

**Leaderboard** (Класация):
Rankings of players and of pairs by the points of their valid declarations across all match records.
_Avoid_: stats, scoreboard

### Transfer

**Share** (Споделяне):
A one-off, serverless export of either the roster and leaderboard, or the current match, as a link, a QR code (possibly multi-part) or a `.belot` file.
_Avoid_: sync, backup

**Import** (Внос):
Receiving a share. It **merges** into local data (players matched by id, then by name), **continues** the received match here, or **replaces** all local data.

**Theme** (Тема) / **Felt** (Маса):
The app's colour atmosphere (Кръчма, Вкъщи, Сукно, Късна нощ) and the table surface (Дърво, Сукно, Покривка, Камък).
