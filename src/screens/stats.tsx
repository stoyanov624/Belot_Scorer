import { useState } from 'react';
import { PreloadLink } from '../app/PreloadLink';
import { type LeaderRow, leaderboard } from '../core/leaderboard';
import type { Player } from '../core/model';
import { STRINGS } from '../core/strings';
import { PlayerAvatar } from '../features/players/PlayerAvatar';
import { statsName, statsSub } from '../features/stats/copy';
import { useAppStore } from '../store/instance';
import { Button, buttonClass } from '../ui/Button';
import { cx } from '../ui/cx';
import { Segmented } from '../ui/Segmented';

const S = STRINGS.stats;

type Tab = 'players' | 'pairs';

/** The rank text/background: 1st in team-a on `bg-s2`, 2nd/3rd plain text, the rest muted. */
function rankClasses(rank: number) {
  if (rank === 1) return { row: 'bg-s2', text: 'text-team-a' };
  if (rank <= 3) return { row: 'bg-s1', text: 'text-text' };
  return { row: 'bg-s1', text: 'text-muted' };
}

/** The leaderboard screen (§11): players/pairs ranked by valid declaration points. */
export function Component() {
  const stats = useAppStore((s) => s.stats);
  const roster = useAppStore((s) => s.roster);
  const rules = useAppStore((s) => s.settings.rules);
  const clearStats = useAppStore((s) => s.clearStats);
  const [tab, setTab] = useState<Tab>('players');
  const [armed, setArmed] = useState(false);

  const { players, pairs } = leaderboard(stats, roster, rules);
  const rows = tab === 'players' ? players : pairs;

  // A player no longer in the roster falls back to the row's name with no photo/emoji.
  const avatarFor = (id: string, name: string): Pick<Player, 'name' | 'emoji' | 'photo'> =>
    roster.find((p) => p.id === id) ?? { name, emoji: null, photo: null };

  const onReset = () => {
    if (armed) {
      clearStats();
      setArmed(false);
    } else {
      setArmed(true);
    }
  };

  return (
    <div className="flex flex-col gap-4 py-6">
      <div className="flex items-center gap-3">
        <PreloadLink to="/" className={cx(buttonClass('secondary', 'sm'), 'shrink-0')}>
          {S.back}
        </PreloadLink>
        <h1 className="text-2xl font-black">{S.title}</h1>
      </div>

      <p className="text-wrap-pretty text-sm font-semibold text-muted">{S.hint(stats.length)}</p>

      <Segmented
        label={S.tabs}
        value={tab}
        onChange={setTab}
        options={[
          { value: 'players', label: S.players },
          { value: 'pairs', label: S.pairs },
        ]}
      />

      {rows.length === 0 ? (
        <p className="rounded-[20px] border-2 border-dashed border-line p-10 text-center text-[15px] font-semibold text-muted">
          {S.empty}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row, i) => (
            <LeaderRowView key={row.key} row={row} rank={i + 1} kind={tab} avatarFor={avatarFor} />
          ))}
        </div>
      )}

      {stats.length > 0 && (
        <Button variant="dangerText" size="sm" className="self-center" onClick={onReset}>
          {armed ? S.resetArmed : S.reset}
        </Button>
      )}
    </div>
  );
}

function LeaderRowView({
  row,
  rank,
  kind,
  avatarFor,
}: {
  row: LeaderRow;
  rank: number;
  kind: Tab;
  avatarFor: (id: string, name: string) => Pick<Player, 'name' | 'emoji' | 'photo'>;
}) {
  const rankStyle = rankClasses(rank);
  const name = statsName(row, kind);

  return (
    <div
      data-rank={rank}
      className={cx(
        'flex items-center gap-3 rounded-[20px] border border-line p-2.5',
        rankStyle.row,
      )}
    >
      <p className={cx('w-7 flex-none text-center text-lg font-black', rankStyle.text)}>{rank}</p>
      <div className="flex flex-none pr-2.5">
        {row.playerIds.map((id, i) => (
          <PlayerAvatar
            key={id}
            player={avatarFor(id, row.names[i] ?? '?')}
            size={48}
            decorative
            style={i > 0 ? { marginLeft: '-10px' } : undefined}
          />
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-base font-black">{name}</h2>
        <p className="truncate text-xs font-bold text-muted">{statsSub(row, kind)}</p>
      </div>
      <div className="flex flex-none flex-col items-end">
        <p
          className={cx(
            'text-2xl font-black leading-none tabular-nums',
            rank === 1 && 'text-team-a',
          )}
        >
          {row.pts}
        </p>
        <p className="text-[11px] font-extrabold text-muted">{S.points}</p>
      </div>
    </div>
  );
}
