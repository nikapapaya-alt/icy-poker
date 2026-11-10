import { estimateEquity } from '@/poker/equity';
import { legalActions, potTotal } from '@/poker/engine';
import type { Action, Aggression, LegalInfo, Seat, TableState } from '@/poker/types';

interface Profile {
  valueBetChance: number;
  bluffChance: number;
  callMargin: number;
  betFraction: number;
}

const PROFILES: Record<Aggression, Profile> = {
  passive: { valueBetChance: 0.45, bluffChance: 0.03, callMargin: 0.08, betFraction: 0.5 },
  balanced: { valueBetChance: 0.7, bluffChance: 0.08, callMargin: 0.03, betFraction: 0.66 },
  aggressive: { valueBetChance: 0.9, bluffChance: 0.2, callMargin: -0.02, betFraction: 0.85 },
};

function temperament(seat: Seat): number {
  return 0.85 + ((seat.tone * 37) % 10) / 25;
}

function sizedTarget(table: TableState, legal: LegalInfo, fraction: number): number {
  const hand = table.hand;
  if (!hand) return legal.minTo;
  const pot = potTotal(table);
  const base = hand.currentBet > 0 ? hand.currentBet * 2.5 : 0;
  const size = base + pot * fraction;
  return Math.round(Math.min(legal.maxTo, Math.max(legal.minTo, size)));
}

function liveOpponents(table: TableState, index: number): number {
  return table.seats.filter((seat, position) => position !== index && seat && !seat.folded && !seat.sittingOut)
    .length;
}

export function chooseBotAction(table: TableState, index: number, aggression: Aggression): Action {
  const legal = legalActions(table, index);
  const seat = table.seats[index];
  const hand = table.hand;
  if (!legal || !seat || !hand) return { type: 'fold' };

  const opponents = liveOpponents(table, index);
  if (opponents === 0) return legal.canCheck ? { type: 'check' } : { type: 'call' };

  const profile = PROFILES[aggression];
  const style = temperament(seat);
  const equity = estimateEquity(seat.hole, hand.board, opponents) + (Math.random() - 0.5) * 0.06;
  const pot = potTotal(table);

  if (legal.toCall > 0) {
    const potOdds = legal.toCall / (pot + legal.toCall);
    const committed = legal.toCall / Math.max(1, seat.stack + seat.bet);
    const strong = equity > 0.72 - (style - 1) * 0.1;

    if (legal.canRaise && strong && Math.random() < profile.valueBetChance * style) {
      return { type: 'raise', to: sizedTarget(table, legal, profile.betFraction) };
    }
    if (legal.canRaise && equity < 0.3 && Math.random() < profile.bluffChance * style) {
      return { type: 'raise', to: sizedTarget(table, legal, profile.betFraction) };
    }

    const requiredEquity = potOdds + profile.callMargin * style;
    if (equity >= requiredEquity) {
      if (committed > 0.5 && equity < 0.7) return { type: 'fold' };
      return { type: 'call' };
    }
    if (Math.random() < profile.bluffChance && committed < 0.1) return { type: 'call' };
    return { type: 'fold' };
  }

  const value = equity * style;
  if (legal.canRaise && value > 0.6 && Math.random() < profile.valueBetChance) {
    return { type: 'raise', to: sizedTarget(table, legal, profile.betFraction * (0.8 + Math.random() * 0.4)) };
  }
  if (legal.canRaise && value < 0.35 && Math.random() < profile.bluffChance) {
    return { type: 'raise', to: sizedTarget(table, legal, profile.betFraction) };
  }
  return { type: 'check' };
}
