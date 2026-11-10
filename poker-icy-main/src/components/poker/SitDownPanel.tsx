import { useState } from 'react';
import { Armchair } from 'lucide-react';
import { formatChips, formatPeso } from '@/lib/format';

interface SitDownPanelProps {
  balance: number;
  minBuyIn: number;
  maxBuyIn: number;
  busy: boolean;
  error: string | null;
  onSit: (amount: number) => void;
}

export function SitDownPanel({ balance, minBuyIn, maxBuyIn, busy, error, onSit }: SitDownPanelProps) {
  const [amount, setAmount] = useState(minBuyIn);
  const valid = amount >= minBuyIn && amount <= maxBuyIn && amount <= balance;

  const presets = [minBuyIn, Math.round((minBuyIn + maxBuyIn) / 2), maxBuyIn];

  return (
    <div className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl sm:p-8">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
          <Armchair className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Take a seat</h2>
          <p className="text-sm text-slate-400">Choose how many chips to bring to the table.</p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <label htmlFor="buy-in" className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Buy-in amount
        </label>
        <div className="flex items-center rounded-xl border border-white/10 bg-slate-950 px-4 focus-within:border-gold-400/60">
          <span className="text-slate-400">PHP</span>
          <input
            id="buy-in"
            type="number"
            inputMode="numeric"
            min={minBuyIn}
            max={maxBuyIn}
            value={amount}
            onChange={(event) => setAmount(Number(event.target.value))}
            className="w-full bg-transparent px-3 py-3 text-lg font-semibold tabular-nums text-white outline-none"
          />
        </div>
        <input
          type="range"
          aria-label="Buy-in slider"
          min={minBuyIn}
          max={maxBuyIn}
          step={1}
          value={amount}
          onChange={(event) => setAmount(Number(event.target.value))}
          className="w-full accent-amber-400"
        />
        <div className="grid grid-cols-3 gap-2">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAmount(preset)}
              className="rounded-lg border border-white/10 bg-white/5 py-1.5 text-xs font-medium text-slate-200 transition hover:border-gold-400/60 hover:text-gold-300"
            >
              {formatChips(preset)}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400">
          Limits: {formatPeso(minBuyIn)} to {formatPeso(maxBuyIn)}. Your wallet balance is{' '}
          <span className="font-semibold text-slate-200">{formatPeso(balance)}</span>.
        </p>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </p>
      )}

      {!valid && amount > balance && (
        <p className="mt-4 text-sm text-amber-300">Your balance is not enough for this buy-in. Cash in first.</p>
      )}

      <button
        type="button"
        disabled={!valid || busy}
        onClick={() => onSit(amount)}
        className="mt-6 w-full rounded-xl bg-gradient-to-b from-gold-300 to-gold-500 py-3 text-sm font-bold text-slate-900 shadow-lg transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? 'Sitting down...' : 'Sit down at the table'}
      </button>
    </div>
  );
}
