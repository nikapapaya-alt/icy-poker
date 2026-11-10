import { useState } from 'react';
import { Crown, LogOut, Timer, TrendingUp, Trophy, Users } from 'lucide-react';
import { ActionBar } from '@/components/poker/ActionBar';
import { ChatBox } from '@/components/poker/ChatBox';
import { HandResultPanel } from '@/components/poker/HandResultPanel';
import { PokerTable } from '@/components/poker/PokerTable';
import { useTournament } from '@/hooks/useTournament';
import { dealerFor } from '@/poker/dealers';
import { formatChips } from '@/lib/format';
import type { Street, TableState } from '@/poker/types';

interface TournamentPagePlayer {
  id: string;
  name: string;
  avatarUrl: string | null;
  avatarEmoji: string;
}

const STREET_LABELS: Record<Street, string> = {
  preflop: 'Pre-flop',
  flop: 'Flop',
  turn: 'Turn',
  river: 'River',
  complete: 'Showdown',
};

export function TournamentPage({ player, onLeave }: { player: TournamentPagePlayer; onLeave: () => void }) {
  const tournament = useTournament(player);
  const [chatCollapsed, setChatCollapsed] = useState(false);

  if (!tournament.active && !tournament.table) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-slate-900/80 p-6 text-center shadow-2xl sm:p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-400/15 text-gold-300">
          <Trophy className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-white">Sit &amp; Go Tournament</h1>
        <p className="mt-2 text-sm text-slate-400">
          8 players. Starting stack of {formatChips(3000)}. Blinds rise every 60 seconds.
          Last player standing wins. No rake — winner takes all.
        </p>
        <div className="mt-4 space-y-1.5 rounded-xl bg-black/20 p-3 text-left text-xs text-slate-400">
          <p className="flex justify-between"><span>Structure:</span><span className="text-slate-200">8 players, 3000 chips</span></p>
          <p className="flex justify-between"><span>Blinds:</span><span className="text-slate-200">10/20, rising every 60s</span></p>
          <p className="flex justify-between"><span>Entry fee:</span><span className="text-emerald-300">Free (play chips)</span></p>
        </div>
        <button
          type="button"
          onClick={() => tournament.join()}
          className="mt-6 w-full rounded-xl bg-gradient-to-b from-gold-300 to-gold-500 py-3 text-sm font-bold text-slate-900 shadow-lg transition hover:brightness-110 active:scale-95"
        >
          Join Tournament
        </button>
        <button
          type="button"
          onClick={onLeave}
          className="mt-2 w-full rounded-xl border border-white/10 py-2.5 text-sm text-slate-400 transition hover:text-white"
        >
          Back to Lobby
        </button>
      </div>
    );
  }

  const { table, level, nextLevel, timeInLevel, chat, leaderboard, finished, finalPosition, meIndex, legal, act, sendChat, leave } = tournament;
  if (!table) return null;

  const hand = table.hand;
  const streetLabel = hand ? STREET_LABELS[hand.street] : STREET_LABELS.preflop;
  const isMyTurn = meIndex !== -1 && hand?.toAct === meIndex;
  const turnSeat = hand?.toAct != null ? table.seats[hand.toAct] : null;
  const waitingFor = turnSeat && !isMyTurn ? turnSeat.name : null;
  const turnKey = hand ? `${hand.number}-${hand.street}-${hand.toAct}-${hand.currentBet}` : 'idle';
  const aliveCount = leaderboard.filter((p) => p.stack > 0).length;
  const dealer = dealerFor('tournament');

  function handleLeave() {
    leave();
    onLeave();
  }

  if (finished) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gold-400/15 text-gold-300">
          <Trophy className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-white">
          {finalPosition === 1 ? 'Tournament Winner!' : `Finished #${finalPosition}`}
        </h1>
        <p className="text-sm text-slate-400">
          {finalPosition === 1
            ? 'You outlasted everyone. Incredible run!'
            : `You placed ${finalPosition} out of ${leaderboard.length}. Better luck next time.`}
        </p>
        <div className="w-full max-w-md space-y-1.5 rounded-2xl border border-white/10 bg-slate-900/80 p-4">
          {leaderboard.map((p, i) => (
            <div key={p.id} className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-sm ${
              p.isMe ? 'bg-gold-400/10 text-gold-100' : 'text-slate-300'
            }`}>
              <span className="flex items-center gap-2">
                <span className="w-5 text-right text-xs tabular-nums text-slate-500">{i + 1}.</span>
                {p.avatarUrl ? (
                  <img src={p.avatarUrl} alt="" className="h-5 w-5 rounded-full object-cover" />
                ) : (
                  <span className="text-sm">{p.avatarEmoji}</span>
                )}
                <span className="font-medium">{p.isMe ? 'You' : p.name}</span>
                {i === 0 && <Crown className="h-3.5 w-3.5 text-gold-300" />}
              </span>
              <span className="tabular-nums text-emerald-300">{formatChips(p.stack)}</span>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={handleLeave}
          className="mt-2 rounded-xl bg-gradient-to-b from-gold-300 to-gold-500 px-6 py-2.5 text-sm font-bold text-slate-900"
        >
          Back to Lobby
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      {/* Tournament status bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-2 sm:px-4">
        <div className="flex items-center gap-3">
          <Trophy className="h-4 w-4 text-gold-300" />
          <span className="text-sm font-semibold text-white">Tournament</span>
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Users className="h-3 w-3" /> {aliveCount} left
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-slate-300">
            <Timer className="h-3 w-3 text-gold-300" />
            <span className="tabular-nums">{Math.floor(timeInLevel / 60)}:{String(timeInLevel % 60).padStart(2, '0')}</span>
          </span>
          <span className="flex items-center gap-1 text-slate-300">
            <TrendingUp className="h-3 w-3 text-emerald-300" />
            <span className="font-semibold tabular-nums">{level.smallBlind}/{level.bigBlind}</span>
          </span>
          {nextLevel && (
            <span className="hidden text-slate-500 sm:inline">next: {nextLevel.smallBlind}/{nextLevel.bigBlind}</span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[1fr_300px] lg:gap-4">
        <section className="min-w-0 space-y-3">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-2 shadow-2xl sm:rounded-3xl sm:p-4">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400/60 to-transparent" />
            <PokerTable table={table} meIndex={meIndex} dealer={dealer} streetLabel={streetLabel} />
          </div>

          <ActionBar
            table={table as TableState}
            legal={isMyTurn ? legal : null}
            turnKey={turnKey}
            onAct={act}
            waitingFor={waitingFor}
          />

          {hand?.street === 'complete' && (
            <HandResultPanel result={{
              handNumber: hand.number,
              board: hand.board,
              rake: hand.rake,
              pot: hand.winners.reduce((s, w) => s + w.amount, 0) + hand.rake,
              showdown: hand.showdown,
              winners: hand.winners.flatMap((w) => {
                const seat = table.seats[w.seat];
                if (!seat) return [];
                return [{ seat: w.seat, name: seat.name, avatarUrl: seat.avatarUrl, avatarEmoji: seat.avatarEmoji, amount: w.amount, label: w.label }];
              }),
            }} />
          )}
        </section>

        <aside className="flex flex-col gap-3">
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-3">
            <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-white">
              <Crown className="h-3.5 w-3.5 text-gold-300" /> Chip Counts
            </h2>
            <div className="space-y-1">
              {leaderboard.map((p, i) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between rounded-lg px-2 py-1 text-xs ${
                    p.stack === 0 ? 'opacity-40' : ''
                  } ${p.isMe ? 'bg-gold-400/10' : ''}`}
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="w-3.5 text-right text-[10px] tabular-nums text-slate-500">{i + 1}</span>
                    {p.avatarUrl ? (
                      <img src={p.avatarUrl} alt="" className="h-4 w-4 shrink-0 rounded-full object-cover" />
                    ) : (
                      <span className="text-xs">{p.avatarEmoji}</span>
                    )}
                    <span className={`truncate font-medium ${p.isMe ? 'text-gold-200' : 'text-slate-200'}`}>
                      {p.isMe ? 'You' : p.name}
                    </span>
                  </span>
                  <span className={`shrink-0 tabular-nums ${p.stack === 0 ? 'text-rose-400' : 'text-emerald-300'}`}>
                    {p.stack === 0 ? 'OUT' : formatChips(p.stack)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <ChatBox
            messages={chat}
            onSend={sendChat}
            collapsed={chatCollapsed}
            onToggle={() => setChatCollapsed(!chatCollapsed)}
          />

          <button
            type="button"
            onClick={handleLeave}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 py-2 text-xs font-medium text-rose-300 transition hover:bg-rose-500/20"
          >
            <LogOut className="h-3.5 w-3.5" /> Leave Tournament
          </button>
        </aside>
      </div>
    </div>
  );
}
