/*
# Lock down browser access and gate admin functions

1. Modified Tables
- players, transactions, table_sessions, game_logs, settings: removed the default UPDATE and DELETE rights (and any other default rights) that the browser roles had. Any visitor could previously edit balances, approve their own cash-out requests, or delete logs.
- Browser roles now have SELECT on all five tables, INSERT on players(display_name) and INSERT on transactions(player_id, type, amount, method, account_details) only.

2. New Tables
- admin_credentials: holds one bcrypt hash of the admin password. No browser role has any access to it.

3. Modified Functions
- New admin_verify(p_admin_key) checks the admin password. The browser can call it to log in.
- resolve_transaction, admin_set_balance, admin_set_player_status and admin_set_setting now take the admin password as their first argument and reject calls without it.
- admin_set_setting also rejects a minimum buy-in above the maximum (and the reverse).
- Each function is executable only by the browser roles that need it.

4. Important Notes
- The admin password is stored only as a hash. Anyone without it cannot change balances, approve requests or edit settings.
- poker_buy_in and poker_cash_out are still player-facing. Table chip counts are calculated in the browser, so cash-out amounts are not yet verified against real play. Server-side table logic is required before real money is used.
*/

CREATE TABLE IF NOT EXISTS admin_credentials (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  password_hash text NOT NULL
);

ALTER TABLE admin_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON admin_credentials FROM PUBLIC, anon, authenticated;

INSERT INTO admin_credentials (id, password_hash)
VALUES (1, '$2a$10$fwB8zj8BJU32PjoWzxU08edG/e3ellujGL/RB6slCV685DuIz0vpm')
ON CONFLICT (id) DO NOTHING;

REVOKE ALL ON players, transactions, table_sessions, game_logs, settings FROM PUBLIC, anon, authenticated;

GRANT SELECT ON players, transactions, table_sessions, game_logs, settings TO anon, authenticated;
GRANT INSERT (display_name) ON players TO anon, authenticated;
GRANT INSERT (player_id, type, amount, method, account_details) ON transactions TO anon, authenticated;

DROP FUNCTION IF EXISTS resolve_transaction(uuid, text, text);
DROP FUNCTION IF EXISTS admin_set_balance(uuid, numeric);
DROP FUNCTION IF EXISTS admin_set_player_status(uuid, text);
DROP FUNCTION IF EXISTS admin_set_setting(text, jsonb);

CREATE OR REPLACE FUNCTION admin_verify(p_admin_key text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_credentials
    WHERE id = 1 AND password_hash = extensions.crypt(p_admin_key, password_hash)
  );
$$;

CREATE OR REPLACE FUNCTION assert_admin(p_admin_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT admin_verify(p_admin_key) THEN
    RAISE EXCEPTION 'Admin password is incorrect';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION resolve_transaction(p_admin_key text, p_id uuid, p_decision text, p_note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tx transactions%ROWTYPE;
  pl players%ROWTYPE;
BEGIN
  PERFORM assert_admin(p_admin_key);

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

CREATE OR REPLACE FUNCTION admin_set_balance(p_admin_key text, p_player uuid, p_balance numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pl players%ROWTYPE;
BEGIN
  PERFORM assert_admin(p_admin_key);

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

CREATE OR REPLACE FUNCTION admin_set_player_status(p_admin_key text, p_player uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pl players%ROWTYPE;
BEGIN
  PERFORM assert_admin(p_admin_key);

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

CREATE OR REPLACE FUNCTION admin_set_setting(p_admin_key text, p_key text, p_value jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  other_key text;
  other_value numeric;
BEGIN
  PERFORM assert_admin(p_admin_key);

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
    other_key := CASE WHEN p_key = 'min_buy_in' THEN 'max_buy_in' ELSE 'min_buy_in' END;
    SELECT (value #>> '{}')::numeric INTO other_value FROM settings WHERE key = other_key;
    IF p_key = 'min_buy_in' AND (p_value #>> '{}')::numeric > other_value THEN
      RAISE EXCEPTION 'Minimum buy-in cannot be above the maximum';
    END IF;
    IF p_key = 'max_buy_in' AND (p_value #>> '{}')::numeric < other_value THEN
      RAISE EXCEPTION 'Maximum buy-in cannot be below the minimum';
    END IF;
  ELSE
    RAISE EXCEPTION 'Unknown setting';
  END IF;

  UPDATE settings SET value = p_value, updated_at = now() WHERE key = p_key;
  PERFORM log_event('admin', format('Setting %s changed to %s', p_key, p_value #>> '{}'), NULL);
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_verify(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION assert_admin(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION resolve_transaction(text, uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION admin_set_balance(text, uuid, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION admin_set_player_status(text, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION admin_set_setting(text, text, jsonb) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION admin_verify(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION resolve_transaction(text, uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_set_balance(text, uuid, numeric) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_set_player_status(text, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_set_setting(text, text, jsonb) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION poker_buy_in(uuid, numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION poker_cash_out(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION poker_buy_in(uuid, numeric) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION poker_cash_out(uuid, numeric) TO anon, authenticated;
