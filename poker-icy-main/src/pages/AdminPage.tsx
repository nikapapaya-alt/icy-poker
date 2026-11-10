import { useCallback, useState } from 'react';
import { Coins, LogOut, QrCode, ScrollText, Settings2, ShieldCheck, Users } from 'lucide-react';
import { AdminLogin } from '@/components/admin/AdminLogin';
import { ApprovalsPanel } from '@/components/admin/ApprovalsPanel';
import { PlayersPanel } from '@/components/admin/PlayersPanel';
import { QrCodesPanel } from '@/components/admin/QrCodesPanel';
import { SystemLogsPanel } from '@/components/admin/SystemLogsPanel';
import { TableSettingsPanel } from '@/components/admin/TableSettingsPanel';
import { useLiveData } from '@/hooks/useLiveData';
import { fetchAllTransactions } from '@/lib/api';
import { clearAdminKey, readAdminKey, writeAdminKey } from '@/lib/adminSession';
import type { TransactionRow } from '@/lib/models';

type AdminTab = 'approvals' | 'players' | 'settings' | 'qr' | 'logs';

const TABS: { id: AdminTab; label: string; icon: typeof Coins }[] = [
  { id: 'approvals', label: 'Approvals', icon: Coins },
  { id: 'players', label: 'Players', icon: Users },
  { id: 'settings', label: 'Table settings', icon: Settings2 },
  { id: 'qr', label: 'Payment QR', icon: QrCode },
  { id: 'logs', label: 'System logs', icon: ScrollText },
];

export function AdminPage() {
  const [adminKey, setAdminKey] = useState<string | null>(readAdminKey);

  function unlock(key: string) {
    writeAdminKey(key);
    setAdminKey(key);
  }

  function lock() {
    clearAdminKey();
    setAdminKey(null);
  }

  if (!adminKey) return <AdminLogin onUnlock={unlock} />;
  return <AdminDashboard adminKey={adminKey} onLock={lock} />;
}

function AdminDashboard({ adminKey, onLock }: { adminKey: string; onLock: () => void }) {
  const [tab, setTab] = useState<AdminTab>('approvals');
  const load = useCallback(() => fetchAllTransactions(), []);
  const transactions = useLiveData<TransactionRow[]>(load, ['transactions', 'players'], []);
  const pendingCount = transactions.data.filter((tx) => tx.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-white">
            <ShieldCheck className="h-5 w-5 text-gold-300" /> Admin control panel
          </h1>
          <p className="text-sm text-slate-400">Every change here is logged and visible to players where it applies.</p>
        </div>
        <button
          type="button"
          onClick={onLock}
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-rose-400/60 hover:text-rose-300"
        >
          <LogOut className="h-4 w-4" /> Lock admin
        </button>
      </div>

      <nav role="tablist" aria-label="Admin sections" className="flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/70 p-1">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                active ? 'bg-white text-slate-900 shadow' : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
              {id === 'approvals' && pendingCount > 0 && (
                <span className="rounded-full bg-gold-400 px-2 py-0.5 text-[11px] font-bold text-slate-900">{pendingCount}</span>
              )}
            </button>
          );
        })}
      </nav>

      <section key={tab} className="animate-fade-in">
        {tab === 'approvals' && (
          <ApprovalsPanel
            adminKey={adminKey}
            transactions={transactions.data}
            error={transactions.error}
            onChanged={transactions.refresh}
          />
        )}
        {tab === 'players' && <PlayersPanel adminKey={adminKey} />}
        {tab === 'settings' && <TableSettingsPanel adminKey={adminKey} />}
        {tab === 'qr' && <QrCodesPanel adminKey={adminKey} />}
        {tab === 'logs' && <SystemLogsPanel />}
      </section>
    </div>
  );
}
