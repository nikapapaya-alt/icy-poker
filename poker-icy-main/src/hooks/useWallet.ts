import { useCallback, useEffect, useState } from 'react';
import { fetchPlayer, fetchPlayerTransactions } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/format';
import type { PlayerRow, TransactionRow } from '@/lib/models';

export function useWallet(playerId: string) {
  const [player, setPlayer] = useState<PlayerRow | null>(null);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [nextPlayer, nextTransactions] = await Promise.all([
        fetchPlayer(playerId),
        fetchPlayerTransactions(playerId),
      ]);
      setPlayer(nextPlayer);
      setTransactions(nextTransactions);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [playerId]);

  useEffect(() => {
    void reload();
    const channel = supabase
      .channel(`wallet-${playerId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'players', filter: `id=eq.${playerId}` },
        (payload) => {
          setPlayer((previous) => (previous ? { ...previous, ...(payload.new as Partial<PlayerRow>) } : previous));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `player_id=eq.${playerId}` },
        () => {
          void reload();
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [playerId, reload]);

  return { player, transactions, error, reload };
}
