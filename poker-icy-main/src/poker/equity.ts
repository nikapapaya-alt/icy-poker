import type { Card, Suit } from '@/poker/cards';
import { evaluateBest } from '@/poker/evaluate';

const SUITS: Suit[] = ['S', 'H', 'D', 'C'];
const EQUITY_SAMPLES = 120;

function unseenCards(known: Card[]): Card[] {
  const taken = new Set(known.map((card) => `${card.rank}${card.suit}`));
  const cards: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = 2; rank <= 14; rank++) {
      if (!taken.has(`${rank}${suit}`)) cards.push({ rank, suit });
    }
  }
  return cards;
}

export function estimateEquity(hole: Card[], board: Card[], opponents: number): number {
  if (hole.length < 2) return 0;
  if (opponents <= 0) return 1;

  const pool = unseenCards([...hole, ...board]);
  const boardNeeded = 5 - board.length;
  let points = 0;

  for (let sample = 0; sample < EQUITY_SAMPLES; sample++) {
    const deck = [...pool];
    const needed = boardNeeded + opponents * 2;
    for (let index = 0; index < needed; index++) {
      const swap = index + Math.floor(Math.random() * (deck.length - index));
      [deck[index], deck[swap]] = [deck[swap], deck[index]];
    }

    let cursor = 0;
    const fullBoard = [...board];
    while (fullBoard.length < 5) fullBoard.push(deck[cursor++]);

    const mine = evaluateBest([...hole, ...fullBoard]);
    let rival = -1;
    for (let opponent = 0; opponent < opponents; opponent++) {
      const score = evaluateBest([deck[cursor], deck[cursor + 1], ...fullBoard]);
      cursor += 2;
      rival = Math.max(rival, score);
    }

    if (mine > rival) points += 1;
    else if (mine === rival) points += 0.5;
  }

  return points / EQUITY_SAMPLES;
}
