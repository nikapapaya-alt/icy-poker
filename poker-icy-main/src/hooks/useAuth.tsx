import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { fetchPlayerByAuthId } from '@/lib/api';
import { writeStoredPlayer, clearStoredPlayer, type StoredPlayer } from '@/lib/identity';
import type { PlayerRow } from '@/lib/models';

interface AuthState {
  session: Session | null;
  user: User | null;
  player: PlayerRow | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshPlayer: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [player, setPlayer] = useState<PlayerRow | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadPlayerForUser(u: User) {
    const p = await fetchPlayerByAuthId(u.id);
    setPlayer(p);
    if (p) {
      const stored: StoredPlayer = {
        id: p.id,
        name: p.display_name,
        avatarUrl: p.avatar_url,
        avatarEmoji: p.avatar_emoji,
      };
      writeStoredPlayer(stored);
    }
    return p;
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        void loadPlayerForUser(data.session.user).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        void (async () => {
          await loadPlayerForUser(sess.user);
          setLoading(false);
        })();
      } else {
        setPlayer(null);
        clearStoredPlayer();
        setLoading(false);
      }
    });

    return () => {
      void sub.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signUp(email: string, password: string, displayName: string) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (data.user) {
      const { error: insertError } = await supabase.from('players').insert({
        display_name: displayName,
        auth_id: data.user.id,
      });
      if (insertError) throw new Error(insertError.message);
    }
  }

  async function signOut() {
    clearStoredPlayer();
    setPlayer(null);
    await supabase.auth.signOut();
  }

  async function refreshPlayer() {
    if (user) {
      await loadPlayerForUser(user);
    }
  }

  return (
    <AuthContext.Provider value={{ session, user, player, loading, signIn, signUp, signOut, refreshPlayer }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
