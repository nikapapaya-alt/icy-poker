import { ArrowLeft, LogOut, Users } from 'lucide-react';
import { ActionBar } from '@/components/poker/ActionBar';
import { HandResultPanel } from '@/components/poker/HandResultPanel';
import { PokerTable } from '@/components/poker/PokerTable';
import { RecentWinners } from '@/components/poker/RecentWinners';
import { SitDownPanel } from '@/components/poker/SitDownPanel';
import { WalletCard } from '@/components/wallet/WalletCard';
import { useTableSettings } from '@/hooks/useTableSettings';
import { usePokerTable } from '@/hooks/usePokerTable';
import { useWallet } from '@/hooks/useWallet';
import { formatChips, formatPeso } from '@/lib/format';
import { dealerFor } from '@/poker/dealers';
import type { Street, TableConfig } from '@/poker/types';

interface TablePagePlayer {
  id: string;
  name: string;
  avatarUrl: string | null;
  avatarEmoji: string;
}

interface TablePageProps {
  player: TablePagePlayer;
  tableConfig: TableConfig;
  tableName: string;
  tableId: string;
  onLeaveTable: () => void;
}

const STREET_LABELS: Record<Street, string> = {
  preflop: 'Pre-flop',
  flop: 'Flop',
  turn: 'Turn',
  river: 'River',
  complete: 'Showdown',
};

export function TablePage({ player, tableConfig, tableName, tableId, onLeaveTable }: TablePageProps) {
  const wallet = useWallet(player.id);
  const { settings } = useTableSettings();
  const poker = usePokerTable(player, settings, tableConfig);
  const { table, legal, meIndex, history } = poker;

  const turnKey = table.hand ? `${table.hand.number}-${table.hand.street}-${table.hand.toAct}-${table.hand.currentBet}` : 'idle';
  const turnSeat = table.hand?.toAct != null ? table.seats[table.hand.toAct] : null;
  const isMyTurn = meIndex !== -1 && table.hand?.toAct === meIndex;
  const waitingFor = turnSeat && !isMyTurn ? turnSeat.name : null;
  const balance = wallet.player?.balance ?? 0;
  const seatCount = table.seats.filter(Boolean).length;
  const dealer = dealerFor(tableId);
  const streetLabel = table.hand ? STREET_LABELS[table.hand.street] : STREET_LABELS.preflop;

  function handleStandUp() {
    poker.standUp();
    setTimeout(() => onLeaveTable(), 500);
  }

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[1fr_340px] lg:gap-6">
      <section className="min-w-0 space-y-3 sm:space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={onLeaveTable}
              className="mb-0.5 inline-flex items-center gap-1 text-xs text-slate-400 transition hover:text-white sm:mb-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Tables
            </button>
            <h1 className="truncate text-lg font-semibold text-white sm:text-xl">{tableName}</h1>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400 sm:text-sm">
              <Users className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {poker.seated ? `${seatCount}/8 seated` : 'Open'} · {formatPeso(tableConfig.smallBlind)}/{formatPeso(tableConfig.bigBlind)} · Rake {settings.rakePercent}%
              </span>
            </p>
          </div>
          {poker.seated && (
            <button
              type="button"
              onClick={handleStandUp}
              disabled={poker.leaving}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-rose-400/60 hover:text-rose-300 disabled:opacity-50 sm:px-4 sm:text-sm"
            >
              <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {poker.leaving ? 'Leaving...' : 'Leave'}
            </button>
          )}
        </div>

        {/* Table container */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-2 shadow-2xl sm:rounded-3xl sm:p-6">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400/60 to-transparent" />
          {poker.seated ? (
            <PokerTable table={table} meIndex={meIndex} dealer={dealer} streetLabel={streetLabel} />
          ) : (
            <SitDownPanel
              balance={balance}
              minBuyIn={tableConfig.minBuyIn}
              maxBuyIn={tableConfig.maxBuyIn}
              busy={poker.busy}
              error={poker.error}
              onSit={(amount) => void poker.sitDown(amount, tableId)}
            />
          )}
        </div>

        {/* Action bar */}
        {poker.seated && (
          <>
            {poker.cashOutBlocked ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                <span>{poker.error ?? 'Could not cash out. Please try again.'}</span>
                <button type="button" onClick={poker.retryCashOut} className="rounded-lg bg-rose-500/20 px-3 py-1.5 font-semibold text-rose-100 hover:bg-rose-500/30">
                  Try again
                </button>
              </div>
            ) : (
              <ActionBar
                table={table}
                legal={isMyTurn ? legal : null}
                turnKey={turnKey}
                onAct={poker.act}
                waitingFor={waitingFor}
              />
            )}
          </>
        )}

        {/* Hand result */}
        <HandResultPanel result={history[0] ?? null} />

        {/* Mobile sidebar items inline */}
        {poker.seated && (
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-xs text-slate-400 lg:hidden">
            <span>Chips on table</span>
            <span className="font-semibold text-emerald-300">{formatChips(table.seats.find((seat) => seat?.isMe)?.stack ?? 0)}</span>
          </div>
        )}
      </section>

      {/* Sidebar — desktop */}
      <aside className="hidden space-y-4 lg:block">
        <WalletCard playerId={player.id} wallet={wallet} />
        {poker.seated && (
          <p className="px-1 text-xs text-slate-500">
            Chips on the table: {formatChips(table.seats.find((seat) => seat?.isMe)?.stack ?? 0)}
          </p>
        )}
        <RecentWinners history={history} />
      </aside>

      {/* Recent winners — mobile */}
      <div className="lg:hidden">
        <RecentWinners history={history} />
      </div>
    </div>
  );
}
