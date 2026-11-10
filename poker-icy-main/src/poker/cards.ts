export type Suit = 'S' | 'H' | 'D' | 'C';

export interface Card {
  rank: number;
  suit: Suit;
}

const SUITS: Suit[] = ['S', 'H', 'D', 'C'];

const RANK_LABELS: Record<number, string> = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };

export function rankLabel(rank: number): string {
  return RANK_LABELS[rank] ?? String(rank);
}

export function suitSymbol(suit: Suit): string {
  return { S: '\u2660', H: '\u2665', D: '\u2666', C: '\u2663' }[suit];
}

export function isRedSuit(suit: Suit): boolean {
  return suit === 'H' || suit === 'D';
}

export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  const random = new Uint32Array(result.length);
  crypto.getRandomValues(random);
  for (let i = result.length - 1; i > 0; i--) {
    const j = random[i] % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = 2; rank <= 14; rank++) {
      deck.push({ rank, suit });
    }
  }
  return shuffle(deck);
}
