import { Bot, Eye, UserRound } from 'lucide-react';
import { PlayingCard } from '@/components/poker/PlayingCard';
import { formatChips } from '@/lib/format';
import type { Seat } from '@/poker/types';

const TONES = [
  'from-sky-500 to-sky-800',
  'from-emerald-500 to-emerald-800',
  'from-amber-400 to-amber-700',
  'from-rose-500 to-rose-800',
  'from-cyan-500 to-cyan-800',
  'from-orange-400 to-orange-700',
  'from-teal-400 to-teal-700',
  'from-slate-400 to-slate-700',
];

interface SeatViewProps {
  seat: Seat;
  isDealer: boolean;
  isTurn: boolean;
  isWinner: boolean;
  isYou: boolean;
  revealCards: boolean;
  statusLabel: string | null;
}

export function SeatView({ seat, isDealer, isTurn, isWinner, isYou, revealCards, statusLabel }: SeatViewProps) {
  const showFace = seat.isMe || revealCards;
  const ring = isWinner ? 'animate-winner-glow' : isTurn ? 'animate-turn-pulse' : '';
  const visibleCards = seat.hole.length > 0 && !seat.folded;

  return (
    <div className={`flex flex-col items-center gap-1 ${seat.folded ? 'opacity-50' : ''}`}>
      {/* Hole cards above the plate */}
      <div className="relative flex h-9 items-end justify-center gap-0.5 sm:h-11">
        {visibleCards &&
          seat.hole.map((card, index) => (
            <div key={index} className={index === 0 ? '-rotate-6' : 'rotate-6'}>
              <PlayingCard size="sm" card={showFace ? card : undefined} faceDown={!showFace} delayMs={index * 80} />
            </div>
          ))}
      </div>

      {/* Player plate */}
      <div
        className={`relative flex w-[68px] flex-col items-center rounded-xl border px-1.5 pb-1.5 pt-2.5 shadow-lg transition-all duration-300 sm:w-[88px] sm:rounded-2xl sm:px-2 sm:pb-2 sm:pt-3 ${ring} ${
          isYou
            ? 'border-gold-400/60 bg-gradient-to-b from-slate-800/95 to-slate-950/95 ring-1 ring-gold-400/40'
            : 'border-white/10 bg-gradient-to-b from-slate-900/95 to-slate-950/95'
        } ${seat.sittingOut ? 'border-dashed border-white/15' : ''}`}
      >
        {/* Dealer button */}
        {isDealer && (
          <span
            title="Dealer button"
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-gold-200 bg-gradient-to-b from-gold-300 to-gold-500 text-[9px] font-black text-slate-900 shadow-lg sm:h-6 sm:w-6 sm:text-[10px]"
          >
            D
          </span>
        )}

        {/* Avatar */}
        <div
          className={`-mt-5 flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br ${TONES[seat.tone % TONES.length]} text-xs font-bold text-white ring-2 ring-white/20 shadow-md sm:h-11 sm:w-11 sm:text-sm`}
        >
          {seat.avatarUrl ? (
            <img src={seat.avatarUrl} alt={seat.name} className="h-full w-full rounded-full object-cover" />
          ) : (
            <span className="text-base sm:text-lg">{seat.avatarEmoji}</span>
          )}
        </div>

        {/* Name */}
        <div className="mt-0.5 flex max-w-full items-center gap-0.5 sm:gap-1">
          {seat.isBot ? (
            <Bot className="h-2.5 w-2.5 shrink-0 text-slate-400 sm:h-3 sm:w-3" />
          ) : seat.sittingOut ? (
            <Eye className="h-2.5 w-2.5 shrink-0 text-slate-400 sm:h-3 sm:w-3" />
          ) : (
            <UserRound className="h-2.5 w-2.5 shrink-0 text-gold-300 sm:h-3 sm:w-3" />
          )}
          <span className="truncate text-[9px] font-semibold text-white sm:text-xs">
            {isYou ? 'You' : seat.name}
          </span>
        </div>

        {/* Stack */}
        <span className="text-[10px] font-bold tabular-nums text-emerald-300 sm:text-[11px]">
          {seat.sittingOut ? 'Sitting out' : formatChips(seat.stack)}
        </span>

        {/* Status badge */}
        {statusLabel && (
          <span className="mt-0.5 rounded-full bg-white/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-slate-200 sm:px-2 sm:text-[9px]">
            {statusLabel}
          </span>
        )}
      </div>
    </div>
  );
}
