import { useState, type FormEvent } from 'react';
import { Lock } from 'lucide-react';
import { verifyAdminKey } from '@/lib/api';
import { errorMessage } from '@/lib/format';

interface AdminLoginProps {
  onUnlock: (key: string) => void;
}

export function AdminLogin({ onUnlock }: AdminLoginProps) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError(null);
    try {
      const ok = await verifyAdminKey(password);
      if (!ok) {
        setError('That admin password is not correct.');
        return;
      }
      onUnlock(password);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col justify-center">
      <form onSubmit={handleSubmit} className="rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-2xl">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-400/15 text-gold-300">
          <Lock className="h-6 w-6" />
        </span>
        <h1 className="mt-5 text-xl font-semibold text-white">Admin sign-in</h1>
        <p className="mt-2 text-sm text-slate-400">Enter the admin password to manage the room.</p>
        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-label="Admin password"
          className="mt-6 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-gold-400/60"
        />
        {error && (
          <p role="alert" className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={!password || busy}
          className="mt-5 w-full rounded-xl bg-gradient-to-b from-gold-300 to-gold-500 py-3 text-sm font-bold text-slate-900 transition hover:brightness-105 disabled:opacity-40"
        >
          {busy ? 'Checking...' : 'Unlock admin'}
        </button>
      </form>
    </div>
  );
}
