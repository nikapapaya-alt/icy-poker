import { SEAT_COUNT } from '@/poker/engine';
import type { Seat, TableState } from '@/poker/types';

export interface RemotePlayer {
  id: string;
  name: string;
  avatarUrl: string | null;
  avatarEmoji: string;
}

export const BOT_ROSTER = [
  { name: 'Ariana', tone: 0, emoji: '🦊', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&h=128&fit=crop&crop=face' },
  { name: 'Mateo', tone: 1, emoji: '🐺', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=128&h=128&fit=crop&crop=face' },
  { name: 'Kenji', tone: 2, emoji: '🐉', avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=128&h=128&fit=crop&crop=face' },
  { name: 'Sofia', tone: 3, emoji: '🦁', avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=128&h=128&fit=crop&crop=face' },
  { name: 'Dante', tone: 4, emoji: '🦈', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&h=128&fit=crop&crop=face' },
  { name: 'Yuna', tone: 5, emoji: '🦅', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a623d6e?w=128&h=128&fit=crop&crop=face' },
  { name: 'Leo', tone: 6, emoji: '🐅', avatarUrl: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=128&h=128&fit=crop&crop=face' },
  { name: 'Priya', tone: 7, emoji: '🦝', avatarUrl: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=128&h=128&fit=crop&crop=face' },
  { name: 'Viktor', tone: 0, emoji: '🐻', avatarUrl: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=128&h=128&fit=crop&crop=face' },
  { name: 'Mei', tone: 1, emoji: '🦄', avatarUrl: 'https://images.unsplash.com/photo-1438761688033-6461ffad8d80?w=128&h=128&fit=crop&crop=face' },
  { name: 'Diego', tone: 2, emoji: '🐊', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=128&h=128&fit=crop&crop=face' },
  { name: 'Zara', tone: 3, emoji: '🦜', avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=128&h=128&fit=crop&crop=face' },
];

function randomBotStack(minBuyIn: number): number {
  const min = Math.max(minBuyIn, minBuyIn);
  const max = Math.round(minBuyIn * 3);
  const span = Math.max(1, (max - min) / 10);
  return min + Math.floor(Math.random() * span) * 10;
}

export function createHumanSeat(
  id: string,
  name: string,
  stack: number,
  tone: number,
  avatarUrl: string | null,
  avatarEmoji: string
): Seat {
  return {
    id,
    name,
    isBot: false,
    isMe: true,
    tone,
    stack,
    bet: 0,
    invested: 0,
    hole: [],
    folded: false,
    allIn: false,
    acted: false,
    sittingOut: false,
    avatarUrl,
    avatarEmoji,
  };
}

function createBotSeat(bot: { name: string; tone: number; emoji: string; avatarUrl: string }, minBuyIn: number): Seat {
  return {
    id: `bot-${bot.name.toLowerCase()}-${Math.random().toString(36).slice(2, 7)}`,
    name: bot.name,
    isBot: true,
    isMe: false,
    tone: bot.tone,
    stack: randomBotStack(minBuyIn),
    bet: 0,
    invested: 0,
    hole: [],
    folded: false,
    allIn: false,
    acted: false,
    sittingOut: false,
    avatarUrl: bot.avatarUrl,
    avatarEmoji: bot.emoji,
  };
}

function createRemoteSeat(player: RemotePlayer, tone: number): Seat {
  return {
    id: player.id,
    name: player.name,
    isBot: false,
    isMe: false,
    tone,
    stack: 0,
    bet: 0,
    invested: 0,
    hole: [],
    folded: true,
    allIn: false,
    acted: false,
    sittingOut: true,
    avatarUrl: player.avatarUrl,
    avatarEmoji: player.avatarEmoji,
  };
}

function firstEmptySeat(seats: (Seat | null)[]): number {
  return seats.findIndex((seat) => seat === null);
}

function lastBotSeat(seats: (Seat | null)[]): number {
  for (let index = seats.length - 1; index >= 0; index--) {
    if (seats[index]?.isBot) return index;
  }
  return -1;
}

function pickBot(seats: (Seat | null)[]): { name: string; tone: number; emoji: string; avatarUrl: string } {
  const used = new Set(seats.map((seat) => seat?.name));
  const available = BOT_ROSTER.filter((bot) => !used.has(bot.name));
  const pool = available.length > 0 ? available : BOT_ROSTER;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function reconcileSeats(table: TableState, remotes: RemotePlayer[]): TableState {
  const seats: (Seat | null)[] = table.seats.map((seat) => (seat ? { ...seat, hole: [] } : null));
  const remoteIds = new Set(remotes.map((player) => player.id));
  const minBuyIn = table.config.minBuyIn;

  seats.forEach((seat, index) => {
    if (seat && !seat.isBot && !seat.isMe && !remoteIds.has(seat.id)) seats[index] = null;
  });

  const seatedRemoteIds = new Set(
    seats.flatMap((seat) => (seat && !seat.isBot && !seat.isMe ? [seat.id] : []))
  );

  for (const player of remotes) {
    if (seatedRemoteIds.has(player.id)) continue;
    let slot = firstEmptySeat(seats);
    if (slot === -1) {
      const bot = lastBotSeat(seats);
      if (bot === -1) break;
      seats[bot] = null;
      slot = bot;
    }
    seats[slot] = createRemoteSeat(player, slot);
  }

  const humanCount = seats.filter((seat) => seat && !seat.isBot).length;
  const targetBots = Math.max(0, SEAT_COUNT - humanCount);

  let botCount = seats.filter((seat) => seat?.isBot).length;
  while (botCount > targetBots) {
    const bot = lastBotSeat(seats);
    if (bot === -1) break;
    seats[bot] = null;
    botCount--;
  }
  while (botCount < targetBots) {
    const slot = firstEmptySeat(seats);
    if (slot === -1) break;
    const bot = pickBot(seats);
    seats[slot] = createBotSeat(bot, minBuyIn);
    botCount++;
  }

  for (const seat of seats) {
    if (seat?.isBot && seat.stack < table.config.bigBlind * 5) seat.stack = randomBotStack(minBuyIn);
  }

  return { ...table, seats };
}
