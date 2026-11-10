import { useCallback, useState } from 'react';
import { Lock, LockOpen, Pencil } from 'lucide-react';
import { useLiveData } from '@/hooks/useLiveData';
import { Modal } from '@/components/common/Modal';
import { adminSetBalance, adminSetPlayerStatus, fetchAllPlayers } from '@/lib/api';
import { errorMessage, formatDateTime, formatPeso } from '@/lib/format';
import type { PlayerRow } from '@/lib/models';

export function PlayersPanel({ adminKey }: { adminKey: string }) {
  const load = useCallback(() => fetchAllPlayers(), []);
  const { data: players, error, refresh } = useLiveData<PlayerRow[]>(load, ['players'], []);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<PlayerRow | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const visible = players.filter((player) => player.display_name.toLowerCase().includes(query.trim().toLowerCase()));

  async function toggleStatus(player: PlayerRow) {
    setActionError(null);
    try {
      await adminSetPlayerStatus(adminKey, player.id, player.status === 'active' ? 'frozen' : 'active');
      await refresh();
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          type="search"
          placeholder="Search player name"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="w-full max-w-xs rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-gold-400/60"
        />
        <span className="text-xs text-slate-500">{players.length} players</span>
      </div>

      {(error || actionError) && (
        <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {actionError ?? error}
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Player</th>
              <th className="px-4 py-3 font-medium">Balance</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {visible.map((player) => (
              <tr key={player.id} className="transition hover:bg-white/[0.03]">
                <td className="px-4 py-3 font-medium text-white">{player.display_name}</td>
                <td className="px-4 py-3 tabular-nums text-emerald-300">{formatPeso(player.balance)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${player.status === 'active' ? 'bg-emerald-400/15 text-emerald-300' : 'bg-rose-400/15 text-rose-300'}`}>
                    {player.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400">{formatDateTime(player.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setEditing(player)} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-200 hover:border-gold-400/60 hover:text-gold-300">
                      <Pencil className="h-3.5 w-3.5" /> Balance
                    </button>
                    <button type="button" onClick={() => toggleStatus(player)} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-200 hover:border-rose-400/60 hover:text-rose-300">
                      {player.status === 'active' ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
                      {player.status === 'active' ? 'Freeze' : 'Unfreeze'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">No players found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <BalanceEditor
          adminKey={adminKey}
          player={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void refresh();
          }}
        />
      )}
    </div>
  );
}

function BalanceEditor({
  adminKey,
  player,
  onClose,
  onSaved,
}: {
  adminKey: string;
  player: PlayerRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(String(player.balance));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const parsed = Number(value);
  const valid = value !== '' && Number.isFinite(parsed) && parsed >= 0;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await adminSetBalance(adminKey, player.id, parsed);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Edit balance: ${player.display_name}`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-slate-400">Current balance {formatPeso(player.balance)}. The player sees the change instantly.</p>
        <input
          type="number"
          min={0}
          step="0.01"
          aria-label="New balance"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-lg font-semibold tabular-nums text-white outline-none focus:border-gold-400/60"
        />
        {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
        <button type="button" disabled={!valid || saving} onClick={save} className="w-full rounded-xl bg-gradient-to-b from-gold-300 to-gold-500 py-2.5 text-sm font-bold text-slate-900 disabled:opacity-40">
          {saving ? 'Saving...' : 'Save balance'}
        </button>
      </div>
    </Modal>
  );
}
