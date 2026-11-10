import type { Aggression } from '@/poker/types';

export type TransactionType = 'cash_in' | 'cash_out';
export type TransactionStatus = 'pending' | 'approved' | 'rejected';
export type PaymentMethod = 'gcash' | 'maya' | 'bank';
export type AccountStatus = 'active' | 'frozen';
export type LogLevel = 'info' | 'warn' | 'error' | 'admin';

export interface PlayerRow {
  id: string;
  display_name: string;
  balance: number;
  status: AccountStatus;
  created_at: string;
  auth_id: string | null;
  avatar_url: string | null;
  avatar_emoji: string;
}

export interface TransactionRow {
  id: string;
  player_id: string;
  type: TransactionType;
  amount: number;
  method: PaymentMethod;
  account_details: string;
  status: TransactionStatus;
  admin_note: string | null;
  created_at: string;
  resolved_at: string | null;
  proof_url: string | null;
  qr_code_id: string | null;
  players?: { display_name: string; balance: number } | null;
}

export interface GameLogRow {
  id: number;
  level: LogLevel;
  message: string;
  player_id: string | null;
  created_at: string;
}

export interface PokerTableRow {
  id: string;
  name: string;
  min_bet: number;
  small_blind: number;
  big_blind: number;
  min_buy_in: number;
  max_buy_in: number;
  display_order: number;
  is_active: boolean;
}

export interface QRCodeRow {
  id: string;
  label: string;
  method: PaymentMethod;
  account_name: string;
  account_number: string;
  qr_payload: string;
  image_data: string | null;
  is_active: boolean;
  display_order: number;
}

export interface TableSettings {
  rakePercent: number;
  botAggression: Aggression;
  minBuyIn: number;
  maxBuyIn: number;
}

export const DEFAULT_TABLE_SETTINGS: TableSettings = {
  rakePercent: 5,
  botAggression: 'balanced',
  minBuyIn: 500,
  maxBuyIn: 20000,
};

export const AVATAR_EMOJIS = [
  '🙂', '😎', '🤓', '😤', '🥳', '🦊', '🐉', '🦁',
  '🐺', '🦅', '🐅', '🦈', '🐍', '🦝', '🐗', '🦏',
];
