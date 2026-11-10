import { useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Wallet } from 'lucide-react';
import { RequestModal } from '@/components/wallet/RequestModal';
import { TransactionList } from '@/components/wallet/TransactionList';
import type { useWallet } from '@/hooks/useWallet';
import { formatPeso } from '@/lib/format';
import type { TransactionType } from '@/lib/models';

interface WalletCardProps {
  playerId: string;
  wallet: ReturnType<typeof useWallet>;
}

export function WalletCard({ playerId, wallet }: WalletCardProps) {
  const [request, setRequest] = useState<TransactionType | null>(null);
  const { player, transactions } = wallet;
  const frozen = player?.status === 'frozen';

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl border border-gold-500/30 bg-gradient-to-br from-felt-700 via-felt-800 to-slate-950 p-6 shadow-2xl">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold-400/10 blur-2xl" />
        <div className="flex items-center justify-between text-emerald-100/80">
          <span className="text-xs font-semibold uppercase tracking-widest">Wallet balance</span>
          <Wallet className="h-5 w-5" />
        </div>
        <p
          key={player?.balance ?? 'loading'}
          className="mt-3 animate-balance-flash text-3xl font-bold tabular-nums text-white"
        >
          {player ? formatPeso(player.balance) : 'Loading...'}
        </p>
        <p className="mt-1 text-xs text-emerald-100/60">
          {frozen ? 'This account is frozen. Contact support.' : 'Updates live when the admin approves a request.'}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={frozen}
            onClick={() => setRequest('cash_in')}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-gold-300 to-gold-500 py-2.5 text-sm font-bold text-slate-900 shadow transition hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
          >
            <ArrowDownToLine className="h-4 w-4" />
            Cash In
          </button>
          <button
            type="button"
            disabled={frozen}
            onClick={() => setRequest('cash_out')}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 active:scale-[0.98] disabled:opacity-40"
          >
            <ArrowUpFromLine className="h-4 w-4" />
            Withdraw
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
        <h3 className="mb-3 text-sm font-semibold text-white">Recent requests</h3>
        {wallet.error ? (
          <p className="text-sm text-rose-300">{wallet.error}</p>
        ) : (
          <TransactionList transactions={transactions} />
        )}
      </div>

      {request && (
        <RequestModal
          mode={request}
          playerId={playerId}
          balance={player?.balance ?? 0}
          onClose={() => setRequest(null)}
        />
      )}
    </div>
  );
}
