import { useState, type FormEvent } from 'react';
import { Loader as Loader2, LogIn, Spade, UserPlus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { errorMessage } from '@/lib/format';

const NAME_MIN = 2;
const NAME_MAX = 24;

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignup = mode === 'signup';
  const trimmedName = displayName.trim();
  const nameValid = !isSignup || (trimmedName.length >= NAME_MIN && trimmedName.length <= NAME_MAX);
  const valid = email.trim().length > 0 && password.length >= 6 && nameValid;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (isSignup) {
        await signUp(email.trim(), password, trimmedName);
      } else {
        await signIn(email.trim(), password);
      }
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center">
      <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-2xl">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-400/15 text-gold-300">
          <Spade className="h-6 w-6" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold text-white">
          {isSignup ? 'Create your account' : 'Welcome back'}
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          {isSignup
            ? 'Sign up to join the tables, manage your wallet, and play poker.'
            : 'Sign in to get back to the tables.'}
        </p>

        <div className="mt-6 flex rounded-xl border border-white/10 bg-slate-950 p-1">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition ${
              !isSignup ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="h-4 w-4" /> Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(null); }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition ${
              isSignup ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="h-4 w-4" /> Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {isSignup && (
            <label className="block">
              <span className="text-xs font-medium text-slate-400">Display name</span>
              <input
                type="text"
                maxLength={NAME_MAX}
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="e.g. Juan D."
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-gold-400/60"
              />
              <span className="mt-1 block text-xs text-slate-500">{NAME_MIN} to {NAME_MAX} characters</span>
            </label>
          )}

          <label className="block">
            <span className="text-xs font-medium text-slate-400">Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-gold-400/60"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-slate-400">Password</span>
            <input
              type="password"
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-gold-400/60"
            />
          </label>

          {error && (
            <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!valid || busy}
            className="w-full rounded-xl bg-gradient-to-b from-gold-300 to-gold-500 py-3 text-sm font-bold text-slate-900 transition hover:brightness-105 disabled:opacity-40"
          >
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Please wait...
              </span>
            ) : isSignup ? 'Create account' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
