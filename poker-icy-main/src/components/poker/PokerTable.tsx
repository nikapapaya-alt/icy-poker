import { Eye } from 'lucide-react';
import { ChipStack } from '@/components/poker/ChipStack';
import { PlayingCard } from '@/components/poker/PlayingCard';
import { SeatView } from '@/components/poker/SeatView';
import { formatChips } from '@/lib/format';
import { potTotal } from '@/poker/engine';
import type { DealerPersona } from '@/poker/dealers';
import type { HandState, Seat, TableState } from '@/poker/types';

// 9-seat layout positioned around an oval — seat 0 is bottom-center (you)
const SEAT_POSITIONS = [
  { x: 50, y: 90 },   // 0 — bottom center (you)
  { x: 85, y: 78 },   // 1 — bottom right
  { x: 95, y: 50 },   // 2 — right
  { x: 85, y: 22 },   // 3 — top right
  { x: 50, y: 12 },   // 4 — top center
  { x: 15, y: 22 },   // 5 — top left
  { x: 5, y: 50 },    // 6 — left
  { x: 15, y: 78 },   // 7 — bottom left
  { x: 50, y: 70 },   // 8 — center bottom (reserved, unused for seating)
];

const SEAT_LAYOUT = SEAT_POSITIONS.slice(0, 8);
const BET_RATIO = 0.38;

function statusFor(seat: Seat, hand: HandState | null): string | null {
  if (seat.sittingOut) return null;
  if (!hand || hand.street === 'complete') return null;
  if (seat.folded) return 'Folded';
  if (seat.allIn) return 'All-in';
  return null;
}

interface PokerTableProps {
  table: TableState;
  meIndex: number;
  dealer: DealerPersona;
  streetLabel: string;
}

export function PokerTable({ table, meIndex, dealer, streetLabel }: PokerTableProps) {
  const hand = table.hand;
  const pot = potTotal(table);
  const finished = hand?.street === 'complete';
  const revealCards = !!hand?.showdown && finished;
  const isDealing = hand?.street === 'preflop' && hand.board.length === 0 && !!hand.toAct;
  const winnerSeats = new Set(hand?.winners.map((award) => award.seat) ?? []);
  const seatCount = table.seats.filter(Boolean).length;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-2xl sm:aspect-[16/11] sm:max-w-5xl">
      {/* Outer wooden rail */}
      <div className="absolute inset-0 rounded-[50%] bg-gradient-to-br from-amber-950 via-amber-900 to-amber-950 shadow-[0_30px_80px_rgba(0,0,0,0.8),inset_0_3px_2px_rgba(255,220,150,0.3),inset_0_-3px_6px_rgba(0,0,0,0.5)]" />
      <div className="absolute inset-0 rounded-[50%] ring-1 ring-inset ring-amber-700/60" />
      {/* Rail accent ring */}
      <div className="absolute inset-[2%] rounded-[50%] border-2 border-amber-700/40" />
      {/* Inner felt */}
      <div className="absolute inset-[7%] rounded-[50%] bg-[radial-gradient(ellipse_at_50%_30%,#1a8060_0%,#0f5c44_45%,#073024_100%)] shadow-[inset_0_0_80px_rgba(0,0,0,0.6),inset_0_2px_0_rgba(255,255,255,0.08)]" />
      <div className="absolute inset-[7%] rounded-[50%] ring-2 ring-emerald-900/50" />
      {/* Felt center logo/text */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="mt-[18%] text-[clamp(10px,2.5vw,22px)] font-black uppercase tracking-[0.3em] text-emerald-100/[0.06] sm:mt-[12%]">
          Icy Poker
        </span>
      </div>
      {/* Light sheen */}
      <div className="pointer-events-none absolute inset-[7%] rounded-[50%] bg-[radial-gradient(ellipse_at_50%_15%,rgba(255,255,255,0.10),transparent_50%)]" />

      {/* Dealer persona — positioned above the board area, overseeing the table */}
      <div className="absolute left-1/2 top-[6%] z-20 flex -translate-x-1/2 flex-col items-center sm:top-[5%]">
        <div
          className={`relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 border-gold-400/70 bg-slate-900 shadow-[0_4px_20px_rgba(0,0,0,0.6)] transition-transform duration-500 sm:h-16 sm:w-16 ${isDealing ? 'scale-110' : ''}`}
        >
          <img src={dealer.avatarUrl} alt={`Dealer ${dealer.name}`} className="h-full w-full object-cover" />
          {isDealing && (
            <div className="absolute inset-0 animate-pulse rounded-full ring-2 ring-gold-300/60" />
          )}
        </div>
        <div className="mt-1 flex flex-col items-center">
          <span className="whitespace-nowrap rounded-full bg-black/70 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-gold-300 sm:text-[10px]">
            {dealer.name}
          </span>
          <span className="mt-0.5 hidden max-w-[140px] text-center text-[8px] leading-tight text-emerald-100/40 sm:block">
            {dealer.tagline}
          </span>
        </div>
      </div>

      {/* Board cards + pot in center */}
      <div className="absolute left-1/2 top-[42%] z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2">
        <span className="rounded-full bg-black/50 px-3 py-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-emerald-100/80 sm:text-[10px]">
          {hand && !finished ? streetLabel : hand ? 'Showdown' : `${seatCount} seated`}
        </span>
        <div className="flex gap-1 sm:gap-1.5">
          {Array.from({ length: 5 }).map((_, index) => {
            const card = hand?.board[index];
            return card ? (
              <PlayingCard key={`${hand?.number}-${index}-${card.rank}${card.suit}`} card={card} size="sm" delayMs={index * 140} />
            ) : (
              <div key={`slot-${index}`} className="h-[44px] w-[32px] rounded-md border border-dashed border-white/15 bg-black/10 sm:h-[60px] sm:w-[42px]" />
            );
          })}
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="rounded-full border border-gold-400/30 bg-black/70 px-3.5 py-1 text-[11px] font-bold uppercase tracking-widest text-gold-300 shadow-lg sm:text-xs">
            Pot {formatChips(pot)}
          </span>
          {finished && hand && hand.rake > 0 && (
            <span className="text-[9px] uppercase tracking-wider text-emerald-100/60 sm:text-[10px]">
              Rake {formatChips(hand.rake)}
            </span>
          )}
        </div>
      </div>

      {/* Bet chips between each seat and center */}
      {table.seats.slice(0, SEAT_LAYOUT.length).map((seat, index) => {
        if (!seat || !hand || finished || seat.bet <= 0) return null;
        const position = SEAT_LAYOUT[index];
        const x = position.x + (50 - position.x) * BET_RATIO;
        const y = position.y + (50 - position.y) * BET_RATIO;
        return (
          <div
            key={`bet-${hand.number}-${hand.street}-${index}-${seat.bet}`}
            className="absolute z-15 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <ChipStack amount={seat.bet} />
          </div>
        );
      })}

      {/* Seats around the table */}
      {table.seats.slice(0, SEAT_LAYOUT.length).map((seat, index) => {
        if (!seat) return null;
        const position = SEAT_LAYOUT[index];
        return (
          <div
            key={`${seat.id}-${index}`}
            className="absolute z-20 -translate-x-1/2 -translate-y-1/2 animate-seat-in"
            style={{ left: `${position.x}%`, top: `${position.y}%` }}
          >
            <SeatView
              seat={seat}
              isDealer={table.dealer === index}
              isTurn={hand?.toAct === index}
              isWinner={winnerSeats.has(index)}
              revealCards={revealCards && !seat.folded}
              statusLabel={statusFor(seat, hand)}
              isYou={index === meIndex}
            />
          </div>
        );
      })}

      {/* Empty seat indicator when fewer than 8 players */}
      {table.seats.slice(0, SEAT_LAYOUT.length).map((seat, index) => {
        if (seat) return null;
        const position = SEAT_LAYOUT[index];
        return (
          <div
            key={`empty-${index}`}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${position.x}%`, top: `${position.y}%` }}
          >
            <div className="flex w-16 flex-col items-center gap-1 opacity-30 sm:w-20">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-white/20 bg-black/20 sm:h-10 sm:w-10">
                <Eye className="h-3 w-3 text-white/30 sm:h-4 sm:w-4" />
              </div>
              <span className="text-[8px] text-white/30 sm:text-[9px]">Open</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
