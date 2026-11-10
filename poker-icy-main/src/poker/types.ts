import type { Card } from '@/poker/cards';

export type Street = 'preflop' | 'flop' | 'turn' | 'river' | 'complete';

export type Aggression = 'passive' | 'balanced' | 'aggressive';

export interface Seat {
  id: string;
  name: string;
  isBot: boolean;
  isMe: boolean;
  tone: number;
  stack: number;
  bet: number;
  invested: number;
  hole: Card[];
  folded: boolean;
  allIn: boolean;
  acted: boolean;
  sittingOut: boolean;
  avatarUrl: string | null;
  avatarEmoji: string;
}

export type Action =
  | { type: 'fold' }
  | { type: 'check' }
  | { type: 'call' }
  | { type: 'raise'; to: number };

export interface Award {
  seat: number;
  amount: number;
  label: string;
}

export interface HandState {
  number: number;
  street: Street;
  board: Card[];
  deck: Card[];
  pot: number;
  currentBet: number;
  minRaise: number;
  toAct: number | null;
  winners: Award[];
  rake: number;
  rakePercent: number;
  showdown: boolean;
}

export interface TableConfig {
  smallBlind: number;
  bigBlind: number;
  minBuyIn: number;
  maxBuyIn: number;
}

export interface TableState {
  seats: (Seat | null)[];
  dealer: number;
  hand: HandState | null;
  handCount: number;
  config: TableConfig;
}

export interface HandWinner {
  seat: number;
  name: string;
  avatarUrl: string | null;
  avatarEmoji: string;
  amount: number;
  label: string;
}

export interface HandResult {
  handNumber: number;
  board: Card[];
  rake: number;
  pot: number;
  showdown: boolean;
  winners: HandWinner[];
}

export interface LegalInfo {
  toCall: number;
  canCheck: boolean;
  canRaise: boolean;
  minTo: number;
  maxTo: number;
}
