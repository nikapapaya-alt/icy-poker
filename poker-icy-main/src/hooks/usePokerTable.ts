import { useCallback, useEffect, useRef, useState } from 'react';
import { pokerBuyIn, pokerCashOut } from '@/lib/api';
import { errorMessage } from '@/lib/format';
import type { TableSettings } from '@/lib/models';
import { supabase } from '@/lib/supabase';
import { chooseBotAction } from '@/poker/bots';
import { applyAction, emptyTable, legalActions, startHand } from '@/poker/engine';
import { createHumanSeat, reconcileSeats, type RemotePlayer } from '@/poker/seating';
import { botTrashTalk, makeMessage, type ChatMessage } from '@/poker/chat';
import { playSound, primeAudio } from '@/lib/sounds';
import type { Action, HandResult, TableConfig, TableState } from '@/poker/types';

export const TURN_SECONDS = 30;

const PRESENCE_CHANNEL = 'poker-table-main';
const NEXT_HAND_DELAY_MS = 2000;
const RESULT_DISPLAY_MS = 9000;
const BOT_MIN_THINK_MS = 2500;
const BOT_MAX_THINK_MS = 5500;

interface Player {
  id: string;
  name: string;
  avatarUrl: string | null;
  avatarEmoji: string;
}

export function usePokerTable(me: Player, settings: TableSettings, tableConfig: TableConfig) {
  const [table, setTable] = useState<TableState>(emptyTable(tableConfig));
  const [seated, setSeated] = useState(false);
  const [remotes, setRemotes] = useState<RemotePlayer[]>([]);
  const [leaving, setLeaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cashOutBlocked, setCashOutBlocked] = useState(false);
  const [history, setHistory] = useState<HandResult[]>([]);

  const sessionRef = useRef<string | null>(null);
  const cashingOutRef = useRef(false);
  const remotesRef = useRef<RemotePlayer[]>([]);
  const settingsRef = useRef(settings);
  const tableRef = useRef(table);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    remotesRef.current = remotes;
  }, [remotes]);

  useEffect(() => {
    tableRef.current = table;
  }, [table]);

  useEffect(
    () => () => {
      const sessionId = sessionRef.current;
      if (!sessionId) return;
      const current = tableRef.current;
      const mine = current.seats.find((seat) => seat?.isMe);
      const inHand = current.hand !== null && current.hand.street !== 'complete';
      const refund = (mine?.stack ?? 0) + (inHand ? (mine?.invested ?? 0) : 0);
      void pokerCashOut(sessionId, refund);
    },
    []
  );

  useEffect(() => {
    if (!seated) return;
    const channel = supabase.channel(PRESENCE_CHANNEL, { config: { presence: { key: me.id } } });
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ id: string; name: string }>();
        const people = new Map<string, RemotePlayer>();
        for (const entries of Object.values(state)) {
          for (const entry of entries) {
            if (entry.id !== me.id) people.set(entry.id, { id: entry.id, name: entry.name, avatarUrl: null, avatarEmoji: '🙂' });
          }
        }
        setRemotes([...people.values()]);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await channel.track({ id: me.id, name: me.name });
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [seated, me.id, me.name]);

  const finishSession = useCallback(async (stack: number) => {
    const sessionId = sessionRef.current;
    if (!sessionId || cashingOutRef.current) return;
    cashingOutRef.current = true;
    try {
      await pokerCashOut(sessionId, stack);
      sessionRef.current = null;
      setSeated(false);
      setLeaving(false);
      setRemotes([]);
      setTable(emptyTable(tableRef.current.config));
    } catch (err) {
      setError(errorMessage(err));
      setCashOutBlocked(true);
    } finally {
      cashingOutRef.current = false;
    }
  }, []);

  const remotesKey = remotes.map((player) => player.id).join(',');

  useEffect(() => {
    if (!seated || cashOutBlocked) return;
    const hand = table.hand;
    let timer: number | undefined;

    if (!hand) {
      const mine = table.seats.find((seat) => seat?.isMe);
      if (leaving || (mine && mine.stack === 0)) {
        void finishSession(mine?.stack ?? 0);
        return;
      }
      timer = window.setTimeout(() => {
        setTable((previous) =>
          startHand(reconcileSeats(previous, remotesRef.current), settingsRef.current.rakePercent)
        );
      }, NEXT_HAND_DELAY_MS);
    } else if (hand.street === 'complete') {
      timer = window.setTimeout(() => {
        setTable((previous) => ({ ...previous, hand: null }));
      }, RESULT_DISPLAY_MS);
    } else if (hand.toAct !== null) {
      const index = hand.toAct;
      const actor = table.seats[index];
      if (actor?.isBot) {
        const thinkMs = BOT_MIN_THINK_MS + Math.random() * (BOT_MAX_THINK_MS - BOT_MIN_THINK_MS);
        timer = window.setTimeout(() => {
          setTable((previous) => {
            if (previous.hand?.toAct !== index) return previous;
            return applyAction(
              previous,
              index,
              chooseBotAction(previous, index, settingsRef.current.botAggression)
            );
          });
        }, thinkMs);
      } else {
        timer = window.setTimeout(() => {
          setTable((previous) => {
            if (previous.hand?.toAct !== index) return previous;
            const legal = legalActions(previous, index);
            const fallback: Action = legal?.canCheck ? { type: 'check' } : { type: 'fold' };
            return applyAction(previous, index, fallback);
          });
        }, TURN_SECONDS * 1000);
      }
    }

    return () => window.clearTimeout(timer);
  }, [table, seated, leaving, cashOutBlocked, remotesKey, finishSession]);

  useEffect(() => {
    const hand = table.hand;
    if (!hand || hand.street !== 'complete') return;
    setHistory((previous) => {
      if (previous[0]?.handNumber === hand.number) return previous;
      const entry: HandResult = {
        handNumber: hand.number,
        board: hand.board,
        rake: hand.rake,
        pot: hand.winners.reduce((sum, award) => sum + award.amount, 0) + hand.rake,
        showdown: hand.showdown,
        winners: hand.winners.flatMap((award) => {
          const seat = table.seats[award.seat];
          if (!seat) return [];
          return [{
            seat: award.seat,
            name: seat.name,
            avatarUrl: seat.avatarUrl,
            avatarEmoji: seat.avatarEmoji,
            amount: award.amount,
            label: award.label,
          }];
        }),
      };
      return [entry, ...previous].slice(0, 25);
    });
  }, [table]);

  const sitDown = useCallback(
    async (buyIn: number, tableId?: string) => {
      setBusy(true);
      setError(null);
      try {
        sessionRef.current = await pokerBuyIn(me.id, buyIn, tableId);
        const base: TableState = {
          seats: [createHumanSeat(me.id, me.name, buyIn, 0, me.avatarUrl, me.avatarEmoji), null, null, null, null, null, null, null, null],
          dealer: 0,
          hand: null,
          handCount: 0,
          config: tableConfig,
        };
        setTable(reconcileSeats(base, []));
        setLeaving(false);
        setCashOutBlocked(false);
        setSeated(true);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setBusy(false);
      }
    },
    [me.id, me.name, me.avatarUrl, me.avatarEmoji, tableConfig]
  );

  const act = useCallback((action: Action) => {
    setTable((previous) => {
      const index = previous.seats.findIndex((seat) => seat?.isMe);
      return index === -1 ? previous : applyAction(previous, index, action);
    });
  }, []);

  const standUp = useCallback(() => setLeaving(true), []);

  const retryCashOut = useCallback(() => {
    setError(null);
    setCashOutBlocked(false);
  }, []);

  const meIndex = table.seats.findIndex((seat) => seat?.isMe);
  const legal = meIndex === -1 ? null : legalActions(table, meIndex);

  return {
    table,
    seated,
    busy,
    error,
    leaving,
    cashOutBlocked,
    meIndex,
    legal,
    sitDown,
    standUp,
    act,
    retryCashOut,
    history,
  };
}
