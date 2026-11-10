import { useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Check, Image, X } from 'lucide-react';
import { resolveTransaction } from '@/lib/api';
import { errorMessage, formatDateTime, formatPeso } from '@/lib/format';
import type { TransactionRow } from '@/lib/models';

interface ApprovalsPanelProps {
  adminKey: string;
  transactions: TransactionRow[];
  error: string | null;
  onChanged: () => Promise<void>;
}

export function ApprovalsPanel({ adminKey, transactions, error, onChanged }: ApprovalsPanelProps) {
  const pending = transactions.filter((tx) => tx.status === 'pending');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  async function decide(tx: TransactionRow, decision: 'approve' | 'reject') {
    setBusyId(tx.id);
    setActionError(null);
    try {
      const note = notes[tx.id]?.trim() || null;
      await resolveTransaction(adminKey, tx.id, decision, note);
      await onChanged();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Pending requests</h2>
        <span className="rounded-full bg-gold-400/15 px-3 py-1 text-xs font-semibold text-gold-300">{pending.length} waiting</span>
      </div>

      {(error || actionError) && (
        <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {actionError ?? error}
        </p>
      )}

      {pending.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-slate-500">
          No pending requests. New cash-in and withdrawal requests appear here instantly.
        </div>
      )}

      <ul className="space-y-3">
        {pending.map((tx) => {
          const isCashIn = tx.type === 'cash_in';
          const Icon = isCashIn ? ArrowDownToLine : ArrowUpFromLine;
          const busy = busyId === tx.id;
          return (
            <li key={tx.id} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 transition hover:border-white/20">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl ${isCashIn ? 'bg-emerald-400/15 text-emerald-300' : 'bg-amber-400/15 text-amber-300'}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold text-white">
                      {tx.players?.display_name ?? 'Unknown player'}
                      <span className="ml-2 text-xs font-medium uppercase tracking-wider text-slate-400">
                        {isCashIn ? 'Cash in' : 'Withdraw'} · {tx.method}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-slate-400">Ref / account: <span className="text-slate-200">{tx.account_details}</span></p>
                    <p className="mt-1 text-xs text-slate-500">
                      Requested {formatDateTime(tx.created_at)} · Current balance {formatPeso(tx.players?.balance ?? 0)}
                    </p>
                    {tx.proof_url && (
                      <div className="mt-2">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-300">
                          <Image className="h-3.5 w-3.5" /> Proof of payment:
                        </span>
                        <a href={tx.proof_url} target="_blank" rel="noopener noreferrer" className="mt-1 block">
                          <img src={tx.proof_url} alt="Payment proof" className="max-h-32 rounded-lg border border-white/10" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xl font-bold tabular-nums text-white">{formatPeso(tx.amount)}</p>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  type="text"
                  maxLength={200}
                  placeholder="Admin note (optional)"
                  value={notes[tx.id] ?? ''}
                  onChange={(event) => setNotes((prev) => ({ ...prev, [tx.id]: event.target.value }))}
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-gold-400/60"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => decide(tx, 'reject')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-400/40 px-4 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/10 disabled:opacity-40"
                  >
                    <X className="h-4 w-4" /> Reject
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => decide(tx, 'approve')}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-40"
                  >
                    <Check className="h-4 w-4" /> {busy ? 'Saving...' : 'Approve'}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
