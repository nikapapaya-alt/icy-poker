import type { TableConfig, TableState } from '@/poker/types';

export interface TournamentPlayer {
  id: string;
  name: string;
  isBot: boolean;
  isMe: boolean;
  avatarUrl: string | null;
  avatarEmoji: string;
  stack: number;
  eliminated: boolean;
  finishPosition: number | null;
}

export interface BlindLevel {
  level: number;
  smallBlind: number;
  bigBlind: number;
  durationSec: number;
}

const BLIND_LEVELS: BlindLevel[] = [
  { level: 1, smallBlind: 10, bigBlind: 20, durationSec: 60 },
  { level: 2, smallBlind: 15, bigBlind: 30, durationSec: 60 },
  { level: 3, smallBlind: 25, bigBlind: 50, durationSec: 60 },
  { level: 4, smallBlind: 50, bigBlind: 100, durationSec: 60 },
  { level: 5, smallBlind: 75, bigBlind: 150, durationSec: 60 },
  { level: 6, smallBlind: 100, bigBlind: 200, durationSec: 60 },
  { level: 7, smallBlind: 150, bigBlind: 300, durationSec: 60 },
  { level: 8, smallBlind: 250, bigBlind: 500, durationSec: 60 },
  { level: 9, smallBlind: 400, bigBlind: 800, durationSec: 60 },
  { level: 10, smallBlind: 600, bigBlind: 1200, durationSec: 60 },
];

export function getBlindLevels(): BlindLevel[] {
  return BLIND_LEVELS;
}

export function blindLevelFor(elapsedSec: number): BlindLevel {
  let remaining = elapsedSec;
  for (const level of BLIND_LEVELS) {
    if (remaining < level.durationSec) return level;
    remaining -= level.durationSec;
  }
  return BLIND_LEVELS[BLIND_LEVELS.length - 1];
}

export function nextBlindLevel(elapsedSec: number): BlindLevel | null {
  const current = blindLevelFor(elapsedSec);
  const idx = BLIND_LEVELS.findIndex((l) => l.level === current.level);
  return idx < BLIND_LEVELS.length - 1 ? BLIND_LEVELS[idx + 1] : null;
}

export function timeRemainingInLevel(elapsedSec: number): number {
  const current = blindLevelFor(elapsedSec);
  let consumed = 0;
  for (const level of BLIND_LEVELS) {
    if (level.level === current.level) break;
    consumed += level.durationSec;
  }
  return Math.max(0, current.durationSec - (elapsedSec - consumed));
}

export const TOURNAMENT_STARTING_STACK = 3000;
export const TOURNAMENT_BOT_COUNT = 7;

export function tournamentConfig(level: BlindLevel): TableConfig {
  return {
    smallBlind: level.smallBlind,
    bigBlind: level.bigBlind,
    minBuyIn: TOURNAMENT_STARTING_STACK,
    maxBuyIn: TOURNAMENT_STARTING_STACK,
  };
}

export function buildLeaderboard(table: TableState): TournamentPlayer[] {
  return table.seats
    .filter((seat): seat is NonNullable<typeof seat> => !!seat)
    .map((seat) => ({
      id: seat.id,
      name: seat.name,
      isBot: seat.isBot,
      isMe: seat.isMe,
      avatarUrl: seat.avatarUrl,
      avatarEmoji: seat.avatarEmoji,
      stack: seat.stack,
      eliminated: seat.sittingOut && seat.stack === 0,
      finishPosition: null,
    }))
    .sort((a, b) => b.stack - a.stack);
}
