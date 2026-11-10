import { History } from 'lucide-react';
import { formatChips } from '@/lib/format';
import type { HandResult } from '@/poker/types';

const RECENT_LIMIT = 10;

export function RecentWinners({ history }: { history: HandResult[] }) {
  const rows = history.slice(0, RECENT_LIMIT);

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
        <History className="h-4 w-4 text-gold-300" /> Recent winners
      </h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-xs text-slate-500">No hands finished yet at this table.</p>
      ) : (
        <ul className="mt-3 divide-y divide-white/5">
          {rows.map((entry) => (
            <li key={entry.handNumber} className="flex items-center justify-between gap-3 py-2 text-xs">
              <div className="min-w-0">
                <p className="text-slate-400">Hand #{entry.handNumber}</p>
                <p className="truncate font-semibold text-slate-100">
                  {entry.winners.map((winner) => winner.name).join(', ') || 'No winner'}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-semibold tabular-nums text-emerald-300">
                  +{formatChips(entry.winners.reduce((sum, winner) => sum + winner.amount, 0))}
                </p>
                <p className="truncate text-[10px] text-slate-500">{entry.winners[0]?.label ?? ''}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
