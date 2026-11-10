import { useState } from 'react';
import { formatChips } from '@/lib/format';
import { TURN_SECONDS } from '@/hooks/usePokerTable';
import { potTotal } from '@/poker/engine';
import type { Action, LegalInfo, TableState } from '@/poker/types';

interface ActionBarProps {
  table: TableState;
  legal: LegalInfo | null;
  turnKey: string;
  onAct: (action: Action) => void;
  waitingFor: string | null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function ActionBar({ table, legal, turnKey, onAct, waitingFor }: ActionBarProps) {
  if (!legal || !table.hand) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-slate-300">
        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
        {waitingFor ? `Waiting for ${waitingFor}...` : 'Waiting for the next hand...'}
      </div>
    );
  }

  return <ActionControls key={turnKey} table={table} legal={legal} turnKey={turnKey} onAct={onAct} />;
}

function ActionControls({ table, legal, turnKey, onAct }: Omit<ActionBarProps, 'waitingFor' | 'legal'> & { legal: LegalInfo }) {
  const hand = table.hand;
  const pot = potTotal(table);
  const [raiseTo, setRaiseTo] = useState(legal.minTo);

  if (!hand) return null;

  const presets = [
    { label: 'Min', value: legal.minTo },
    { label: '1/2 Pot', value: hand.currentBet + Math.round(pot / 2) },
    { label: 'Pot', value: hand.currentBet + pot },
    { label: 'All-in', value: legal.maxTo },
  ];

  const callLabel = legal.canCheck ? 'Check' : `Call ${formatChips(Math.min(legal.toCall, legal.maxTo))}`;
  const raiseValue = clamp(raiseTo, legal.minTo, legal.maxTo);

  return (
    <div className="space-y-2.5 rounded-2xl border border-white/10 bg-slate-900/90 p-3 shadow-2xl backdrop-blur sm:space-y-3 sm:p-4">
      {/* Turn timer */}
      <div className="h-1 overflow-hidden rounded-full bg-white/10">
        <div
          key={turnKey}
          className="h-full origin-left bg-gold-400"
          style={{ animation: `turn-shrink ${TURN_SECONDS}s linear forwards` }}
        />
      </div>

      {/* Raise slider — collapsible on mobile */}
      {legal.canRaise && (
        <div className="space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Raise to</span>
            <span className="text-sm font-semibold tabular-nums text-gold-300 sm:text-base">{formatChips(raiseValue)}</span>
          </div>
          <input
            type="range"
            aria-label="Raise amount"
            min={legal.minTo}
            max={legal.maxTo}
            step={1}
            value={raiseValue}
            onChange={(event) => setRaiseTo(Number(event.target.value))}
            className="h-6 w-full accent-amber-400 sm:h-auto"
          />
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setRaiseTo(clamp(preset.value, legal.minTo, legal.maxTo))}
                className="rounded-lg border border-white/10 bg-white/5 px-1 py-1.5 text-[11px] font-medium text-slate-200 transition active:scale-95 hover:border-gold-400/60 hover:text-gold-300 sm:px-2 sm:text-xs"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons — large touch targets */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={() => onAct({ type: 'fold' })}
          className="rounded-xl border border-rose-500/50 bg-rose-500/10 py-2.5 text-sm font-semibold text-rose-300 transition active:scale-95 hover:bg-rose-500/20 sm:py-3"
        >
          Fold
        </button>
        <button
          type="button"
          onClick={() => onAct({ type: legal.canCheck ? 'check' : 'call' })}
          className="rounded-xl border border-emerald-500/50 bg-emerald-500/15 py-2.5 text-sm font-semibold text-emerald-200 transition active:scale-95 hover:bg-emerald-500/25 sm:py-3"
        >
          {callLabel}
        </button>
        <button
          type="button"
          disabled={!legal.canRaise}
          onClick={() => onAct({ type: 'raise', to: raiseValue })}
          className="rounded-xl bg-gradient-to-b from-gold-300 to-gold-500 py-2.5 text-sm font-bold text-slate-900 shadow-lg transition active:scale-95 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 sm:py-3"
        >
          {legal.canRaise ? (raiseValue >= legal.maxTo ? 'All-in' : 'Raise') : 'No raise'}
        </button>
      </div>
    </div>
  );
}
