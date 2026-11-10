import { useEffect, useState } from 'react';
import { Loader as Loader2, Users } from 'lucide-react';
import { fetchPokerTables } from '@/lib/api';
import { errorMessage, formatPeso } from '@/lib/format';
import type { PokerTableRow } from '@/lib/models';
import type { TableConfig } from '@/poker/types';

interface TableLobbyProps {
  balance: number;
  onSelect: (selection: { table: PokerTableRow; config: TableConfig }) => void;
}

export function TableLobby({ balance, onSelect }: TableLobbyProps) {
  const [tables, setTables] = useState<PokerTableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchPokerTables()
      .then((rows) => {
        setTables(rows);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading tables...
      </div>
    );
  }

  if (error) {
    return (
      <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
        {error}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-white">Choose a Table</h1>
        <p className="mt-1 text-sm text-slate-400">
          Pick a table that fits your budget. Your wallet balance is{' '}
          <span className="font-semibold text-gold-300">{formatPeso(balance)}</span>.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tables.map((table) => {
          const canAfford = balance >= table.min_buy_in;
          return (
            <button
              key={table.id}
              type="button"
              disabled={!canAfford}
              onClick={() =>
                onSelect({
                  table,
                  config: {
                    smallBlind: Number(table.small_blind),
                    bigBlind: Number(table.big_blind),
                    minBuyIn: Number(table.min_buy_in),
                    maxBuyIn: Number(table.max_buy_in),
                  },
                })
              }
              className={`group rounded-2xl border p-5 text-left shadow-lg transition ${
                canAfford
                  ? 'border-white/10 bg-slate-900/70 hover:border-gold-400/50 hover:bg-slate-900'
                  : 'border-white/5 bg-slate-900/40 opacity-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-white">{table.name}</span>
                <Users className="h-5 w-5 text-slate-500 transition group-hover:text-gold-300" />
              </div>
              <div className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Min bet</span>
                  <span className="font-semibold tabular-nums text-gold-300">{formatPeso(Number(table.min_bet))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Blinds</span>
                  <span className="font-medium tabular-nums text-slate-200">
                    {formatPeso(Number(table.small_blind))} / {formatPeso(Number(table.big_blind))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Buy-in</span>
                  <span className="font-medium tabular-nums text-slate-200">
                    {formatPeso(Number(table.min_buy_in))} – {formatPeso(Number(table.max_buy_in))}
                  </span>
                </div>
              </div>
              {!canAfford && (
                <p className="mt-3 text-xs text-amber-300">Your balance is too low for this table.</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
