import { useCallback, useEffect, useRef, useState } from 'react';
import { chooseBotAction } from '@/poker/bots';
import { applyAction, legalActions, startHand } from '@/poker/engine';
import { BOT_ROSTER, createHumanSeat } from '@/poker/seating';
import type { Action, TableConfig, TableState } from '@/poker/types';
import {
  blindLevelFor,
  buildLeaderboard,
  nextBlindLevel,
  timeRemainingInLevel,
  TOURNAMENT_BOT_COUNT,
  TOURNAMENT_STARTING_STACK,
  tournamentConfig,
  type BlindLevel,
  type TournamentPlayer,
} from '@/poker/tournament';
import { makeMessage, type ChatMessage } from '@/poker/chat';
import { botTrashTalk } from '@/poker/chat';
import { playSound } from '@/lib/sounds';

const NEXT_HAND_DELAY_MS = 2000;
const RESULT_DISPLAY_MS = 6000;
const BOT_MIN_THINK_MS = 1800;
const BOT_MAX_THINK_MS = 4000;
const TURN_SECONDS = 20;

interface Player {
  id: string;
  name: string;
  avatarUrl: string | null;
  avatarEmoji: string;
}

function makeBotSeats(count: number) {
  const shuffled = [...BOT_ROSTER].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((bot, index) => ({
    id: `tbot-${bot.name.toLowerCase()}-${index}`,
    name: bot.name,
    isBot: true,
    isMe: false,
    tone: bot.tone,
    stack: TOURNAMENT_STARTING_STACK,
    bet: 0,
    invested: 0,
    hole: [],
    folded: false,
    allIn: false,
    acted: false,
    sittingOut: false,
    avatarUrl: bot.avatarUrl,
    avatarEmoji: bot.emoji,
  }));
}

export function useTournament(me: Player) {
  const [active, setActive] = useState(false);
  const [table, setTable] = useState<TableState | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [level, setLevel] = useState<BlindLevel>(blindLevelFor(0));
  const [finished, setFinished] = useState(false);
  const [finalPosition, setFinalPosition] = useState<number | null>(null);

  const tableRef = useRef<TableState | null>(null);
  const prevStreetRef = useRef<string>('');
  const prevBoardLenRef = useRef(0);
  const prevWinnersRef = useRef<string>('');
  const prevToActRef = useRef<number | null>(null);

  useEffect(() => {
    tableRef.current = table;
  }, [table]);

  // Timer
  useEffect(() => {
    if (!active || finished) return;
    const interval = window.setInterval(() => {
      setElapsedSec((prev) => {
        const next = prev + 1;
        const newLevel = blindLevelFor(next);
        setLevel((current) => {
          if (current.level !== newLevel.level) {
            setChat((c) => [...c, makeMessage('Tournament', `Blinds rising to ${newLevel.smallBlind}/${newLevel.bigBlind}`, false, false, true)]);
          }
          return newLevel;
        });
        return next;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [active, finished]);

  // Sound + chat effects based on table state changes
  useEffect(() => {
    if (!table || !active) return;
    const hand = table.hand;

    // Dealing sounds — board cards appearing
    if (hand) {
      if (hand.board.length > prevBoardLenRef.current) {
        for (let i = prevBoardLenRef.current; i < hand.board.length; i++) playSound('deal');
      }
      prevBoardLenRef.current = hand.board.length;

      // Street change announcement
      const streetKey = `${hand.number}-${hand.street}`;
      if (streetKey !== prevStreetRef.current) {
        if (hand.street === 'preflop') playSound('deal');
        prevStreetRef.current = streetKey;
      }

      // Turn notification
      if (hand.toAct !== prevToActRef.current && hand.toAct !== null) {
        const seat = table.seats[hand.toAct];
        if (seat?.isMe) playSound('turn');
        prevToActRef.current = hand.toAct;
      }
    }

    // Win detection
    if (hand && hand.street === 'complete') {
      const winnerKey = hand.winners.map((w) => w.seat).join(',');
      if (winnerKey !== prevWinnersRef.current) {
        const meSeat = table.seats.findIndex((s) => s?.isMe);
        const iWon = hand.winners.some((w) => w.seat === meSeat);
        playSound(iWon ? 'win' : 'lose');

        // Bot trash talk on win
        for (const award of hand.winners) {
          const seat = table.seats[award.seat];
          if (!seat) continue;
          const talk = botTrashTalk({ type: 'call' }, seat, hand.street, 0, award.amount);
          if (talk) {
            setChat((c) => [...c, makeMessage(seat.name, talk, false, seat.isBot)]);
          }
        }
        prevWinnersRef.current = winnerKey;
      }
    } else {
      prevWinnersRef.current = '';
    }
  }, [table, active]);

  // Game loop
  useEffect(() => {
    if (!active || !table || finished) return;
    const hand = table.hand;
    let timer: number | undefined;

    if (!hand) {
      // Check for eliminations and tournament end
      const leaderboard = buildLeaderboard(table);
      const alive = leaderboard.filter((p) => p.stack > 0);
      const meAlive = alive.some((p) => p.isMe);

      if (!meAlive) {
        const myFinish = alive.length + 1;
        setFinalPosition(myFinish);
        setFinished(true);
        setChat((c) => [...c, makeMessage('Tournament', `You finished in position ${myFinish}.`, false, false, true)]);
        return;
      }

      if (alive.length <= 1) {
        setFinished(true);
        setFinalPosition(1);
        setChat((c) => [...c, makeMessage('Tournament', 'Tournament over! You won!', false, false, true)]);
        return;
      }

      timer = window.setTimeout(() => {
        setTable((prev) => {
          if (!prev) return prev;
          // Mark eliminated players sitting out
          const updatedSeats = prev.seats.map((seat) =>
            seat && seat.stack === 0 ? { ...seat, sittingOut: true } : seat
          );
          const updated = { ...prev, seats: updatedSeats, config: tournamentConfig(level) };
          return startHand(updated, 0);
        });
      }, NEXT_HAND_DELAY_MS);
    } else if (hand.street === 'complete') {
      timer = window.setTimeout(() => {
        setTable((prev) => (prev ? { ...prev, hand: null } : prev));
      }, RESULT_DISPLAY_MS);
    } else if (hand.toAct !== null) {
      const index = hand.toAct;
      const actor = table.seats[index];
      if (actor?.isBot) {
        const thinkMs = BOT_MIN_THINK_MS + Math.random() * (BOT_MAX_THINK_MS - BOT_MIN_THINK_MS);
        timer = window.setTimeout(() => {
          setTable((prev) => {
            if (!prev || prev.hand?.toAct !== index) return prev;
            const action = chooseBotAction(prev, index, 'balanced');
            // Play sound based on action
            if (action.type === 'fold') playSound('fold');
            else if (action.type === 'check') playSound('check');
            else if (action.type === 'call') playSound('call');
            else if (action.type === 'raise') playSound('raise');
            // Bot trash talk
            const seat = prev.seats[index];
            if (seat && Math.random() < 0.25) {
              const talk = botTrashTalk(action, seat, prev.hand?.street ?? 'preflop', 0, null);
              if (talk) setChat((c) => [...c, makeMessage(seat.name, talk, false, true)]);
            }
            return applyAction(prev, index, action);
          });
        }, thinkMs);
      } else {
        timer = window.setTimeout(() => {
          setTable((prev) => {
            if (!prev || prev.hand?.toAct !== index) return prev;
            const legal = legalActions(prev, index);
            const fallback: Action = legal?.canCheck ? { type: 'check' } : { type: 'fold' };
            return applyAction(prev, index, fallback);
          });
        }, TURN_SECONDS * 1000);
      }
    }

    return () => window.clearTimeout(timer);
  }, [table, active, finished, level]);

  const join = useCallback(() => {
    const bots = makeBotSeats(TOURNAMENT_BOT_COUNT);
    const human = createHumanSeat(me.id, me.name, TOURNAMENT_STARTING_STACK, 0, me.avatarUrl, me.avatarEmoji);
    const config = tournamentConfig(blindLevelFor(0));
    const initial: TableState = {
      seats: [human, ...bots, null],
      dealer: 0,
      hand: null,
      handCount: 0,
      config,
    };
    setTable(initial);
    setElapsedSec(0);
    setLevel(blindLevelFor(0));
    setFinished(false);
    setFinalPosition(null);
    setActive(true);
    setChat([makeMessage('Tournament', `Tournament started! ${1 + TOURNAMENT_BOT_COUNT} players, starting stack ${TOURNAMENT_STARTING_STACK.toLocaleString()}.`, false, false, true)]);
  }, [me.id, me.name, me.avatarUrl, me.avatarEmoji]);

  const leave = useCallback(() => {
    setActive(false);
    setTable(null);
    setFinished(false);
    setFinalPosition(null);
    setChat([]);
  }, []);

  const act = useCallback((action: Action) => {
    if (action.type === 'fold') playSound('fold');
    else if (action.type === 'check') playSound('check');
    else if (action.type === 'call') playSound('call');
    else if (action.type === 'raise') playSound('raise');
    setTable((prev) => {
      if (!prev) return prev;
      const index = prev.seats.findIndex((s) => s?.isMe);
      return index === -1 ? prev : applyAction(prev, index, action);
    });
  }, []);

  const sendChat = useCallback((text: string) => {
    setChat((c) => [...c, makeMessage(me.name, text, true, false)]);
  }, [me.name]);

  const meIndex = table?.seats.findIndex((s) => s?.isMe) ?? -1;
  const legal = table && meIndex !== -1 ? legalActions(table, meIndex) : null;
  const leaderboard: TournamentPlayer[] = table ? buildLeaderboard(table) : [];

  return {
    active,
    table,
    level,
    elapsedSec,
    nextLevel: nextBlindLevel(elapsedSec),
    timeInLevel: timeRemainingInLevel(elapsedSec),
    chat,
    leaderboard,
    finished,
    finalPosition,
    meIndex,
    legal,
    join,
    leave,
    act,
    sendChat,
  };
}
