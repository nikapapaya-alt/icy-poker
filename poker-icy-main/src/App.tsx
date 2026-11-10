import { useState } from 'react';
import { Loader as Loader2, LogOut, Settings, ShieldCheck, Spade, Trophy } from 'lucide-react';
import { useHashPath } from '@/hooks/useHashPath';
import { useAuth } from '@/hooks/useAuth';
import { AdminPage } from '@/pages/AdminPage';
import { AuthPage } from '@/pages/AuthPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { TableLobby } from '@/pages/TableLobby';
import { TablePage } from '@/pages/TablePage';
import { TournamentPage } from '@/pages/TournamentPage';
import type { PokerTableRow } from '@/lib/models';
import type { TableConfig } from '@/poker/types';

function App() {
  const path = useHashPath();
  const { user, player, loading, signOut } = useAuth();
  const [selectedTable, setSelectedTable] = useState<{ table: PokerTableRow; config: TableConfig } | null>(null);
  const [showTournament, setShowTournament] = useState(false);

  const isAdmin = path.startsWith('/admin');
  const isSettings = path.startsWith('/settings');

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <Loader2 className="h-6 w-6 animate-spin text-gold-300" />
      </div>
    );
  }

  if (!user || !player) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <AuthPage />
      </div>
    );
  }

  const playerInfo = {
    id: player.id,
    name: player.display_name,
    avatarUrl: player.avatar_url,
    avatarEmoji: player.avatar_emoji,
  };

  const avatarDisplay = player.avatar_url ? (
    <img src={player.avatar_url} alt={player.display_name} className="h-full w-full rounded-full object-cover" />
  ) : (
    <span>{player.avatar_emoji}</span>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-20 border-b border-white/5 bg-slate-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <a href="#/" className="flex items-center gap-2 font-semibold text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-400/15 text-gold-300">
              <Spade className="h-4 w-4" />
            </span>
            Poker Room
          </a>
          <nav className="flex items-center gap-1.5 text-sm sm:gap-2">
            <a
              href="#/"
              className={`rounded-lg px-2.5 py-1.5 transition sm:px-3 ${!isAdmin && !isSettings && !showTournament && !selectedTable ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Play
            </a>
            <button
              type="button"
              onClick={() => { setShowTournament(true); setSelectedTable(null); }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition sm:px-3 ${showTournament ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <Trophy className="h-4 w-4" /> <span className="hidden sm:inline">Tournament</span>
            </button>
            <a
              href="#/settings"
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition sm:px-3 ${isSettings ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <Settings className="h-4 w-4" /> <span className="hidden sm:inline">Settings</span>
            </a>
            <a
              href="#/admin"
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition sm:px-3 ${isAdmin ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <ShieldCheck className="h-4 w-4" /> <span className="hidden sm:inline">Admin</span>
            </a>
            {!isAdmin && !isSettings && (
              <div className="ml-1 flex items-center gap-2 sm:ml-2">
                <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-slate-800 text-sm">
                  {avatarDisplay}
                </div>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="hidden items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-slate-300 transition hover:border-white/25 hover:text-white sm:inline-flex"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {isAdmin ? (
          <AdminPage />
        ) : isSettings ? (
          <SettingsPage player={player} />
        ) : showTournament ? (
          <TournamentPage player={playerInfo} onLeave={() => setShowTournament(false)} />
        ) : selectedTable ? (
          <TablePage
            player={playerInfo}
            tableConfig={selectedTable.config}
            tableName={selectedTable.table.name}
            tableId={selectedTable.table.id}
            onLeaveTable={() => setSelectedTable(null)}
          />
        ) : (
          <TableLobbyWrapper
            balance={player.balance}
            onSelect={setSelectedTable}
            onTournament={() => setShowTournament(true)}
          />
        )}
      </main>
    </div>
  );
}

function TableLobbyWrapper({
  balance,
  onSelect,
  onTournament,
}: {
  balance: number;
  onSelect: (selection: { table: PokerTableRow; config: TableConfig }) => void;
  onTournament: () => void;
}) {
  return <TableLobby balance={balance} onSelect={onSelect} onTournament={onTournament} />;
}

export default App;
