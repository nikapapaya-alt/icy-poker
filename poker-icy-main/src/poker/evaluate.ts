import type { Card } from '@/poker/cards';

const CATEGORY_NAMES = [
  'High Card',
  'One Pair',
  'Two Pair',
  'Three of a Kind',
  'Straight',
  'Flush',
  'Full House',
  'Four of a Kind',
  'Straight Flush',
];

const BASE = 15;
const CATEGORY_WEIGHT = BASE ** 5;

function scoreFive(cards: Card[]): number {
  const counts = new Map<number, number>();
  for (const card of cards) {
    counts.set(card.rank, (counts.get(card.rank) ?? 0) + 1);
  }

  const ranksDesc = cards.map((card) => card.rank).sort((a, b) => b - a);
  const flush = cards.every((card) => card.suit === cards[0].suit);
  const distinct = new Set(ranksDesc).size;

  let straightHigh = 0;
  if (distinct === 5) {
    if (ranksDesc[0] - ranksDesc[4] === 4) straightHigh = ranksDesc[0];
    else if (ranksDesc.join(',') === '14,5,4,3,2') straightHigh = 5;
  }

  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const top = groups[0][1];
  const second = groups[1]?.[1] ?? 0;

  let category = 0;
  if (straightHigh && flush) category = 8;
  else if (top === 4) category = 7;
  else if (top === 3 && second === 2) category = 6;
  else if (flush) category = 5;
  else if (straightHigh) category = 4;
  else if (top === 3) category = 3;
  else if (top === 2 && second === 2) category = 2;
  else if (top === 2) category = 1;

  const kickers = straightHigh ? [straightHigh] : groups.map((group) => group[0]);
  while (kickers.length < 5) kickers.push(0);

  return kickers.reduce((value, kicker) => value * BASE + kicker, category * CATEGORY_WEIGHT);
}

function combinations<T>(items: T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (items.length < size) return [];
  const [first, ...rest] = items;
  return [
    ...combinations(rest, size - 1).map((combo) => [first, ...combo]),
    ...combinations(rest, size),
  ];
}

export function evaluateBest(cards: Card[]): number {
  let best = -1;
  for (const combo of combinations(cards, 5)) {
    best = Math.max(best, scoreFive(combo));
  }
  return best;
}

export function describeScore(score: number): string {
  return CATEGORY_NAMES[Math.floor(score / CATEGORY_WEIGHT)] ?? 'High Card';
}
