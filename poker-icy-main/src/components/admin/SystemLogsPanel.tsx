import { useCallback, useMemo, useState } from 'react';
import { useLiveData } from '@/hooks/useLiveData';
import { fetchGameLogs } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import type { GameLogRow, LogLevel } from '@/lib/models';

const LEVEL_STYLES: Record<LogLevel, string> = {
  info: 'bg-sky-400/15 text-sky-300',
  warn: 'bg-amber-400/15 text-amber-300',
  error: 'bg-rose-400/15 text-rose-300',
  admin: 'bg-gold-400/15 text-gold-300',
};

const FILTERS: ('all' | LogLevel)[] = ['all', 'admin', 'info', 'warn', 'error'];

export function SystemLogsPanel() {
  const load = useCallback(() => fetchGameLogs(), []);
  const { data: logs, error } = useLiveData<GameLogRow[]>(load, ['game_logs'], []);
  const [filter, setFilter] = useState<'all' | LogLevel>('all');

  const visible = useMemo(
    () => (filter === 'all' ? logs : logs.filter((log) => log.level === filter)),
    [logs, filter]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Log level" className="flex flex-wrap gap-2">
          {FILTERS.map((level) => (
            <button
              key={level}
              type="button"
              role="tab"
              aria-selected={filter === level}
              onClick={() => setFilter(level)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition ${
                filter === level ? 'bg-white text-slate-900' : 'border border-white/10 text-slate-300 hover:border-white/25'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
        <span className="flex items-center gap-2 text-xs text-slate-500">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> Live
        </span>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </p>
      )}

      <div className="max-h-[560px] overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/80">
        {visible.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">No log entries yet.</p>
        ) : (
          <ul className="divide-y divide-white/5 font-mono text-xs">
            {visible.map((log) => (
              <li key={log.id} className="flex items-start gap-3 px-4 py-2.5">
                <span className={`mt-px shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${LEVEL_STYLES[log.level]}`}>
                  {log.level}
                </span>
                <span className="min-w-0 flex-1 break-words text-slate-200">{log.message}</span>
                <span className="shrink-0 text-slate-500">{formatDateTime(log.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
