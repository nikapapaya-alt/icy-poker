/*
# Poker table, wallet and admin schema

1. New Tables
- `players`: one row per visitor who joins. Holds display name, wallet balance (PHP) and account status (active or frozen).
- `transactions`: cash-in (deposit) and cash-out (withdrawal) requests with method, account/reference details, and approval status.
- `table_sessions`: one row per poker buy-in, closed when the player cashes out of the table.
- `game_logs`: system activity feed shown in the admin panel.
- `settings`: admin-controlled values (table rake, bot aggression, buy-in limits).

2. Modified Tables
- None.

3. Security
- RLS enabled on every table.
- Browser can read everything (needed for realtime wallet and admin views) and can only insert a player row or a pending transaction.
- Every balance change, approval, buy-in, cash-out and setting change goes through SECURITY DEFINER functions that validate input and write a log entry.

4. Important Notes
- This build has no sign-in. Anyone with the link can call these functions. Add real authentication and server-side game logic before handling real money.
- Functions are granted to the anon and authenticated roles because the app runs without login.
*/

CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 2 AND 24),
  balance numeric(12,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'frozen')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('cash_in', 'cash_out')),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  method text NOT NULL CHECK (method IN ('gcash', 'maya', 'bank')),
  account_details text NOT NULL CHECK (char_length(account_details) BETWEEN 4 AND 60),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS transactions_status_created_idx ON transactions (status, created_at DESC);
CREATE INDEX IF NOT EXISTS transactions_player_idx ON transactions (player_id);

CREATE TABLE IF NOT EXISTS table_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  buy_in numeric(12,2) NOT NULL CHECK (buy_in > 0),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  cashed_out numeric(12,2),
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);

CREATE INDEX IF NOT EXISTS table_sessions_player_idx ON table_sessions (player_id, status);

CREATE TABLE IF NOT EXISTS game_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  level text NOT NULL CHECK (level IN ('info', 'warn', 'error', 'admin')),
  message text NOT NULL,
  player_id uuid REFERENCES players(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS game_logs_created_idx ON game_logs (created_at DESC);

CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO settings (key, value) VALUES
  ('rake_percent', '5'),
  ('bot_aggression', '"balanced"'),
  ('min_buy_in', '500'),
  ('max_buy_in', '20000')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON players TO anon, authenticated;
GRANT INSERT (display_name) ON players TO anon, authenticated;
GRANT SELECT, INSERT (player_id, type, amount, method, account_details) ON transactions TO anon, authenticated;
GRANT SELECT ON table_sessions TO anon, authenticated;
GRANT SELECT ON game_logs TO anon, authenticated;
GRANT SELECT ON settings TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_players" ON players;
CREATE POLICY "anon_select_players" ON players FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_players" ON players;
CREATE POLICY "anon_insert_players" ON players FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_select_transactions" ON transactions;
CREATE POLICY "anon_select_transactions" ON transactions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_transactions" ON transactions;
CREATE POLICY "anon_insert_transactions" ON transactions FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM players p WHERE p.id = player_id AND p.status = 'active')
  );

DROP POLICY IF EXISTS "anon_select_table_sessions" ON table_sessions;
CREATE POLICY "anon_select_table_sessions" ON table_sessions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_game_logs" ON game_logs;
CREATE POLICY "anon_select_game_logs" ON game_logs FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_settings" ON settings;
CREATE POLICY "anon_select_settings" ON settings FOR SELECT
  TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION log_event(p_level text, p_message text, p_player uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO game_logs (level, message, player_id) VALUES (p_level, p_message, p_player);
$$;

REVOKE EXECUTE ON FUNCTION log_event(text, text, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION resolve_transaction(p_id uuid, p_decision text, p_note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tx transactions%ROWTYPE;
  pl players%ROWTYPE;
BEGIN
  IF p_decision NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'Invalid decision';
  END IF;

  SELECT * INTO tx FROM transactions WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;
  IF tx.status <> 'pending' THEN
    RAISE EXCEPTION 'Transaction was already resolved';
  END IF;

  SELECT * INTO pl FROM players WHERE id = tx.player_id FOR UPDATE;

  IF p_decision = 'approve' THEN
    IF tx.type = 'cash_in' THEN
      UPDATE players SET balance = balance + tx.amount WHERE id = pl.id;
    ELSE
      IF pl.balance < tx.amount THEN
        RAISE EXCEPTION 'Player balance is lower than the requested cash-out';
      END IF;
      UPDATE players SET balance = balance - tx.amount WHERE id = pl.id;
    END IF;
    UPDATE transactions
      SET status = 'approved', resolved_at = now(), admin_note = p_note
      WHERE id = p_id;
  ELSE
    UPDATE transactions
      SET status = 'rejected', resolved_at = now(), admin_note = p_note
      WHERE id = p_id;
  END IF;

  PERFORM log_event(
    'admin',
    format('%s %s request of PHP %s for %s',
      CASE WHEN p_decision = 'approve' THEN 'Approved' ELSE 'Rejected' END,
      tx.type, tx.amount, pl.display_name),
    pl.id
  );
END;
$$;

CREATE OR REPLACE FUNCTION admin_set_balance(p_player uuid, p_balance numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pl players%ROWTYPE;
BEGIN
  IF p_balance IS NULL OR p_balance < 0 THEN
    RAISE EXCEPTION 'Balance must be zero or more';
  END IF;

  UPDATE players SET balance = p_balance WHERE id = p_player RETURNING * INTO pl;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Player not found';
  END IF;

  PERFORM log_event('admin', format('Balance manually set to PHP %s for %s', p_balance, pl.display_name), pl.id);
END;
$$;

CREATE OR REPLACE FUNCTION admin_set_player_status(p_player uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pl players%ROWTYPE;
BEGIN
  IF p_status NOT IN ('active', 'frozen') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  UPDATE players SET status = p_status WHERE id = p_player RETURNING * INTO pl;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Player not found';
  END IF;

  PERFORM log_event('admin', format('Account for %s set to %s', pl.display_name, p_status), pl.id);
END;
$$;

CREATE OR REPLACE FUNCTION admin_set_setting(p_key text, p_value jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_key = 'rake_percent' THEN
    IF (p_value #>> '{}')::numeric NOT BETWEEN 0 AND 20 THEN
      RAISE EXCEPTION 'Rake must be between 0 and 20 percent';
    END IF;
  ELSIF p_key = 'bot_aggression' THEN
    IF (p_value #>> '{}') NOT IN ('passive', 'balanced', 'aggressive') THEN
      RAISE EXCEPTION 'Invalid bot aggression';
    END IF;
  ELSIF p_key IN ('min_buy_in', 'max_buy_in') THEN
    IF (p_value #>> '{}')::numeric < 100 THEN
      RAISE EXCEPTION 'Buy-in limits must be at least 100';
    END IF;
  ELSE
    RAISE EXCEPTION 'Unknown setting';
  END IF;

  UPDATE settings SET value = p_value, updated_at = now() WHERE key = p_key;
  PERFORM log_event('admin', format('Setting %s changed to %s', p_key, p_value #>> '{}'), NULL);
END;
$$;

CREATE OR REPLACE FUNCTION poker_buy_in(p_player uuid, p_amount numeric)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pl players%ROWTYPE;
  min_buy numeric;
  max_buy numeric;
  session_id uuid;
BEGIN
  SELECT (value #>> '{}')::numeric INTO min_buy FROM settings WHERE key = 'min_buy_in';
  SELECT (value #>> '{}')::numeric INTO max_buy FROM settings WHERE key = 'max_buy_in';

  SELECT * INTO pl FROM players WHERE id = p_player FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Player not found';
  END IF;
  IF pl.status <> 'active' THEN
    RAISE EXCEPTION 'This account is frozen';
  END IF;
  IF p_amount < min_buy OR p_amount > max_buy THEN
    RAISE EXCEPTION 'Buy-in must be between PHP % and PHP %', min_buy, max_buy;
  END IF;
  IF EXISTS (SELECT 1 FROM table_sessions WHERE player_id = p_player AND status = 'open') THEN
    RAISE EXCEPTION 'You are already seated at a table';
  END IF;
  IF pl.balance < p_amount THEN
    RAISE EXCEPTION 'Not enough balance for this buy-in';
  END IF;

  UPDATE players SET balance = balance - p_amount WHERE id = p_player;
  INSERT INTO table_sessions (player_id, buy_in) VALUES (p_player, p_amount) RETURNING id INTO session_id;
  PERFORM log_event('info', format('%s bought in for PHP %s', pl.display_name, p_amount), p_player);

  RETURN session_id;
END;
$$;

CREATE OR REPLACE FUNCTION poker_cash_out(p_session uuid, p_amount numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ses table_sessions%ROWTYPE;
  pl players%ROWTYPE;
BEGIN
  IF p_amount IS NULL OR p_amount < 0 THEN
    RAISE EXCEPTION 'Invalid cash-out amount';
  END IF;

  SELECT * INTO ses FROM table_sessions WHERE id = p_session FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Table session not found';
  END IF;
  IF ses.status <> 'open' THEN
    RAISE EXCEPTION 'Table session is already closed';
  END IF;

  UPDATE players SET balance = balance + p_amount WHERE id = ses.player_id RETURNING * INTO pl;
  UPDATE table_sessions
    SET status = 'closed', cashed_out = p_amount, closed_at = now()
    WHERE id = p_session;

  PERFORM log_event(
    'info',
    format('%s left the table with PHP %s (bought in for PHP %s)', pl.display_name, p_amount, ses.buy_in),
    pl.id
  );

  RETURN pl.balance;
END;
$$;

REVOKE EXECUTE ON FUNCTION resolve_transaction(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION admin_set_balance(uuid, numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION admin_set_player_status(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION admin_set_setting(text, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION poker_buy_in(uuid, numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION poker_cash_out(uuid, numeric) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION resolve_transaction(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_set_balance(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_set_player_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_set_setting(text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION poker_buy_in(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION poker_cash_out(uuid, numeric) TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE players; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE transactions; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE game_logs; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE settings; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;
