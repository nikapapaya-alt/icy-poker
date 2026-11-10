import { Image } from 'lucide-react';
import { formatDateTime, formatPeso } from '@/lib/format';
import type { TransactionRow, TransactionStatus } from '@/lib/models';

const STATUS_STYLES: Record<TransactionStatus, string> = {
  pending: 'bg-amber-400/15 text-amber-300',
  approved: 'bg-emerald-400/15 text-emerald-300',
  rejected: 'bg-rose-400/15 text-rose-300',
};

interface TransactionListProps {
  transactions: TransactionRow[];
}

export function TransactionList({ transactions }: TransactionListProps) {
  if (transactions.length === 0) {
    return <p className="text-sm text-slate-500">No requests yet.</p>;
  }

  return (
    <ul className="divide-y divide-white/5">
      {transactions.map((row) => (
        <li key={row.id} className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white">
              {row.type === 'cash_in' ? 'Cash in' : 'Withdrawal'} · {formatPeso(row.amount)}
            </p>
            <p className="truncate text-xs text-slate-500">
              {row.method.toUpperCase()} · {formatDateTime(row.created_at)}
            </p>
            {row.admin_note && <p className="truncate text-xs text-slate-400">Note: {row.admin_note}</p>}
            {row.proof_url && (
              <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-emerald-300">
                <Image className="h-3 w-3" /> Proof uploaded
              </p>
            )}
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[row.status]}`}>
            {row.status}
          </span>
        </li>
      ))}
    </ul>
  );
}
