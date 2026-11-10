import { createDeck, type Card } from '@/poker/cards';
import { describeScore, evaluateBest } from '@/poker/evaluate';
import type { Action, Award, HandState, LegalInfo, Seat, TableConfig, TableState } from '@/poker/types';

export const SEAT_COUNT = 9;

export function emptyTable(config?: TableConfig): TableState {
  return {
    seats: Array<Seat | null>(SEAT_COUNT).fill(null),
    dealer: 0,
    hand: null,
    handCount: 0,
    config: config ?? { smallBlind: 10, bigBlind: 20, minBuyIn: 500, maxBuyIn: 20000 },
  };
}

function cloneTable(table: TableState): TableState {
  return {
    ...table,
    seats: table.seats.map((seat) => (seat ? { ...seat, hole: [...seat.hole] } : null)),
    hand: table.hand
      ? {
          ...table.hand,
          board: [...table.hand.board],
          deck: [...table.hand.deck],
          winners: [...table.hand.winners],
        }
      : null,
  };
}

export function canPlay(seat: Seat): boolean {
  return !seat.sittingOut && seat.stack > 0;
}

export function nextSeat(seats: (Seat | null)[], from: number, match: (seat: Seat) => boolean): number | null {
  for (let step = 1; step <= SEAT_COUNT; step++) {
    const index = (from + step) % SEAT_COUNT;
    const seat = seats[index];
    if (seat && match(seat)) return index;
  }
  return null;
}

export function potTotal(table: TableState): number {
  if (!table.hand) return 0;
  return table.hand.pot + table.seats.reduce((sum, seat) => sum + (seat?.bet ?? 0), 0);
}

function commit(seat: Seat, amount: number): void {
  const paid = Math.min(Math.max(amount, 0), seat.stack);
  seat.stack -= paid;
  seat.bet += paid;
  seat.invested += paid;
  if (seat.stack === 0) seat.allIn = true;
}

function draw(deck: Card[]): Card {
  return deck.pop() as Card;
}

function dealStreet(hand: HandState): void {
  const count = hand.street === 'preflop' ? 3 : 1;
  for (let i = 0; i < count; i++) hand.board.push(draw(hand.deck));
  if (hand.street === 'preflop') hand.street = 'flop';
  else if (hand.street === 'flop') hand.street = 'turn';
  else if (hand.street === 'turn') hand.street = 'river';
}

function collectBets(table: TableState): void {
  if (!table.hand) return;
  for (const seat of table.seats) {
    if (!seat) continue;
    table.hand.pot += seat.bet;
    seat.bet = 0;
  }
}

function awardStack(table: TableState, awards: Award[]): void {
  for (const award of awards) {
    const seat = table.seats[award.seat];
    if (seat) seat.stack += award.amount;
  }
}

function finishUncontested(table: TableState, winnerIndex: number): TableState {
  if (!table.hand) return table;
  const amount = potTotal(table);
  collectBets(table);
  const awards: Award[] = [{ seat: winnerIndex, amount, label: 'Everyone else folded' }];
  awardStack(table, awards);
  table.hand.winners = awards;
  table.hand.street = 'complete';
  table.hand.toAct = null;
  table.hand.showdown = false;
  return table;
}

function runOutBoard(hand: HandState): void {
  while (hand.board.length < 5) hand.board.push(draw(hand.deck));
}

function showdown(table: TableState): TableState {
  if (!table.hand) return table;
  const hand = table.hand;
  const live = table.seats.flatMap((seat, index) => (seat && !seat.folded ? [index] : []));
  const levels = [...new Set(table.seats.map((seat) => seat?.invested ?? 0).filter((v) => v > 0))].sort(
    (a, b) => a - b
  );

  const awards: Award[] = [];
  let previous = 0;
  let rakeTotal = 0;

  for (const level of levels) {
    const amount = table.seats.reduce((sum, seat) => {
      if (!seat) return sum;
      return sum + Math.max(0, Math.min(seat.invested, level) - previous);
    }, 0);
    previous = level;
    if (amount <= 0) continue;

    const contenders = live.filter((index) => (table.seats[index]?.invested ?? 0) >= level);
    const eligible = contenders.length > 0 ? contenders : live;

    const take = Math.floor((amount * hand.rakePercent) / 100);
    rakeTotal += take;
    const distributable = amount - take;

    const scored = eligible.map((index) => {
      const seat = table.seats[index];
      const score = seat ? evaluateBest([...seat.hole, ...hand.board]) : -1;
      return { index, score };
    });
    const best = Math.max(...scored.map((entry) => entry.score));
    const winners = scored.filter((entry) => entry.score === best).map((entry) => entry.index);

    const share = Math.floor(distributable / winners.length);
    const remainder = distributable - share * winners.length;
    winners.forEach((index, position) => {
      awards.push({
        seat: index,
        amount: share + (position === 0 ? remainder : 0),
        label: describeScore(best),
      });
    });
  }

  collectBets(table);
  awardStack(table, awards);
  hand.rake = rakeTotal;
  hand.winners = awards;
  hand.showdown = true;
  hand.street = 'complete';
  hand.toAct = null;
  return table;
}

const needsAction = (seat: Seat, currentBet: number): boolean =>
  !seat.folded && !seat.allIn && (!seat.acted || seat.bet < currentBet);

function advance(table: TableState, from: number): TableState {
  const hand = table.hand;
  if (!hand) return table;
  const bigBlind = table.config.bigBlind;

  for (;;) {
    const live = table.seats.flatMap((seat, index) => (seat && !seat.folded ? [index] : []));
    if (live.length === 1) return finishUncontested(table, live[0]);

    const pending = table.seats.some((seat) => seat && needsAction(seat, hand.currentBet));
    if (pending) {
      hand.toAct = nextSeat(table.seats, from, (seat) => needsAction(seat, hand.currentBet));
      return table;
    }

    if (hand.street === 'river') return showdown(table);

    collectBets(table);
    dealStreet(hand);
    hand.currentBet = 0;
    hand.minRaise = bigBlind;
    for (const seat of table.seats) if (seat) seat.acted = false;
    from = table.dealer;

    const canBet = table.seats.filter((seat) => seat && !seat.folded && !seat.allIn).length;
    if (canBet < 2) {
      collectBets(table);
      runOutBoard(hand);
      return showdown(table);
    }
  }
}

export function startHand(table: TableState, rakePercent: number): TableState {
  const next = cloneTable(table);
  const sb = table.config.smallBlind;
  const bb = table.config.bigBlind;
  next.seats = next.seats.map((seat) =>
    seat
      ? { ...seat, bet: 0, invested: 0, hole: [], folded: !canPlay(seat), allIn: false, acted: false }
      : null
  );

  const playable = next.seats.filter((seat): seat is Seat => !!seat && canPlay(seat)).length;
  if (playable < 2) return table;

  const dealer = nextSeat(next.seats, table.dealer, canPlay) ?? table.dealer;
  const headsUp = playable === 2;
  const smallBlindSeat = headsUp ? dealer : (nextSeat(next.seats, dealer, canPlay) ?? dealer);
  const bigBlindSeat = nextSeat(next.seats, smallBlindSeat, canPlay) ?? smallBlindSeat;

  const deck = createDeck();
  for (let round = 0; round < 2; round++) {
    let index = dealer;
    for (let step = 0; step < playable; step++) {
      const seatIndex = nextSeat(next.seats, index, canPlay);
      if (seatIndex === null) break;
      const seat = next.seats[seatIndex];
      if (seat) seat.hole.push(draw(deck));
      index = seatIndex;
    }
  }

  const sbSeat = next.seats[smallBlindSeat];
  const bbSeat = next.seats[bigBlindSeat];
  if (sbSeat) commit(sbSeat, sb);
  if (bbSeat) commit(bbSeat, bb);

  const currentBet = Math.max(...next.seats.map((seat) => seat?.bet ?? 0));
  const firstActor = nextSeat(next.seats, bigBlindSeat, (seat) => !seat.folded && !seat.allIn);

  next.dealer = dealer;
  next.handCount = table.handCount + 1;
  next.hand = {
    number: next.handCount,
    street: 'preflop',
    board: [],
    deck,
    pot: 0,
    currentBet,
    minRaise: bb,
    toAct: firstActor,
    winners: [],
    rake: 0,
    rakePercent,
    showdown: false,
  };

  return advance(next, bigBlindSeat);
}

export function legalActions(table: TableState, index: number): LegalInfo | null {
  const hand = table.hand;
  const seat = table.seats[index];
  if (!hand || !seat || hand.toAct !== index) return null;
  const maxTo = seat.bet + seat.stack;
  const minTo = Math.min(hand.currentBet + hand.minRaise, maxTo);
  return {
    toCall: hand.currentBet - seat.bet,
    canCheck: hand.currentBet - seat.bet === 0,
    canRaise: maxTo > hand.currentBet,
    minTo,
    maxTo,
  };
}

export function applyAction(table: TableState, index: number, action: Action): TableState {
  const legal = legalActions(table, index);
  if (!legal) return table;

  const next = cloneTable(table);
  const hand = next.hand;
  const seat = next.seats[index];
  if (!hand || !seat) return table;

  if (action.type === 'fold') {
    seat.folded = true;
    seat.acted = true;
  } else if (action.type === 'check') {
    if (!legal.canCheck) return table;
    seat.acted = true;
  } else if (action.type === 'call') {
    commit(seat, hand.currentBet - seat.bet);
    seat.acted = true;
  } else {
    const target = action.to;
    if (!legal.canRaise || target > legal.maxTo) return table;
    if (target < legal.minTo && target !== legal.maxTo) return table;
    if (target <= hand.currentBet && target !== legal.maxTo) return table;

    const increment = target - hand.currentBet;
    commit(seat, target - seat.bet);
    seat.acted = true;

    if (increment >= hand.minRaise) {
      hand.minRaise = increment;
      for (const other of next.seats) if (other && other !== seat) other.acted = false;
    }
    hand.currentBet = Math.max(hand.currentBet, seat.bet);
  }

  return advance(next, index);
}
