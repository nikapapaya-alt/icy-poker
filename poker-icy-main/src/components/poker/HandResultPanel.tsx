import { Crown, Trophy } from 'lucide-react';
import { PlayingCard } from '@/components/poker/PlayingCard';
import { formatChips } from '@/lib/format';
import type { HandResult, HandWinner } from '@/poker/types';

interface HandResultPanelProps {
  result: HandResult | null;
}

interface PrizeShare {
  key: string;
  name: string;
  avatarUrl: string | null;
  avatarEmoji: string;
  amount: number;
  hands: string[];
}

function groupPrizes(winners: HandWinner[]): PrizeShare[] {
  const byPlayer = new Map<string, PrizeShare>();
  for (const winner of winners) {
    const key = `${winner.seat}-${winner.name}`;
    const existing = byPlayer.get(key);
    if (existing) {
      existing.amount += winner.amount;
      if (!existing.hands.includes(winner.label)) existing.hands.push(winner.label);
    } else {
      byPlayer.set(key, {
        key,
        name: winner.name,
        avatarUrl: winner.avatarUrl,
        avatarEmoji: winner.avatarEmoji,
        amount: winner.amount,
        hands: [winner.label],
      });
    }
  }
  return [...byPlayer.values()].sort((a, b) => b.amount - a.amount);
}

export function HandResultPanel({ result }: HandResultPanelProps) {
  if (!result) {
    return (
      <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 text-center text-sm text-slate-400">
        Results from each hand appear here once the cards are shown.
      </section>
    );
  }

  const prizes = groupPrizes(result.winners);
  const distributed = prizes.reduce((sum, prize) => sum + prize.amount, 0);
  const topAmount = prizes[0]?.amount ?? 1;

  return (
    <section className="animate-fade-in overflow-hidden rounded-2xl border border-gold-400/25 bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-gold-300" />
          <h2 className="text-base font-semibold text-white">Hand #{result.handNumber} winners</h2>
        </div>
        <div className="flex gap-1">
          {result.board.map((card, index) => (
            <PlayingCard key={`${card.rank}${card.suit}-${index}`} card={card} size="sm" />
          ))}
        </div>
      </header>

      <div className="space-y-3 p-5">
        {prizes.map((prize, index) => {
          const share = Math.round((prize.amount / Math.max(1, distributed)) * 100);
          return (
            <div key={prize.key} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-center gap-3">
                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-800 ring-2 ring-gold-400/40">
                  {prize.avatarUrl ? (
                    <img src={prize.avatarUrl} alt={prize.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xl">{prize.avatarEmoji}</span>
                  )}
                  {index === 0 && <Crown className="absolute -right-1 -top-1 h-4 w-4 text-gold-300" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">{prize.name}</p>
                  <p className="truncate text-xs text-gold-300">{prize.hands.join(' · ')}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold tabular-nums text-emerald-300">+{formatChips(prize.amount)}</p>
                  <p className="text-[11px] tabular-nums text-slate-400">{share}% of prize</p>
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-gold-400 to-gold-300 transition-all duration-700"
                  style={{ width: `${Math.max(6, (prize.amount / topAmount) * 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <footer className="grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 bg-black/20 text-center">
        <Stat label="Pot" value={formatChips(result.pot)} />
        <Stat label="House rake" value={formatChips(result.rake)} />
        <Stat label="Paid out" value={formatChips(distributed)} />
      </footer>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-100">{value}</p>
    </div>
  );
}
