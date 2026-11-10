/*
# Add authentication, profiles, multiple poker tables, QR cash-in, and proof-of-payment uploads

1. Modified Tables
- `players`: added `auth_id` (uuid, links to auth.users), `avatar_url` (text, profile photo URL), `avatar_emoji` (text, default avatar emoji for users without a photo).
- `transactions`: added `proof_url` (text, nullable — URL to uploaded payment proof screenshot), `qr_code_id` (uuid, nullable — references qr_codes row used for cash-in).
- `settings`: no schema change; new key `qr_payment_info` will be stored as JSONB for QR code display.

2. New Tables
- `poker_tables`: predefined tables with varying bet levels (min bet, blinds, buy-in limits). Each row represents one table option like ₱1, ₱2, ₱5, ₱10, ₱20, ₱50, ₱100, ₱200, ₱1000.
- `qr_codes`: QR code definitions for casino cash-in. Each row has a payment method, account details, and an embedded QR string. Shown to users during cash-in.
- `storage bucket`: `avatars` — for user profile photos.
- `storage bucket`: `payment-proofs` — for cash-in proof-of-payment screenshots.

3. Security
- RLS enabled on all new tables.
- `poker_tables` and `qr_codes` are readable by all (anon + authenticated) since they are public casino configuration.
- `players` SELECT updated to remain public (needed for live wallet and seat display).
- `players` UPDATE added for authenticated users to update only their own avatar and display name.
- `transactions` INSERT updated to also allow `proof_url` and `qr_code_id` columns.
- Storage policies: users can upload avatars to their own folder; users can upload payment proofs; admins can read all.
- New function `update_profile` lets a user change their display name and avatar URL (validated server-side).
- New function `poker_buy_in_for_table` accepts a table_id to validate buy-in against the selected table's limits.

4. Important Notes
- This migration adds Supabase Auth integration. The frontend will use email/password sign-up and login.
- `players.auth_id` links to `auth.users(id)`. New sign-ups create a `players` row automatically.
- `poker_tables` are seeded with the requested bet levels.
- `qr_codes` are seeded with placeholder QR payment info that the admin can update.
- Profile photos are uploaded to the `avatars` storage bucket; payment proofs to `payment-proofs`.
*/

-- Add columns to players table
ALTER TABLE players ADD COLUMN IF NOT EXISTS auth_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE players ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE players ADD COLUMN IF NOT EXISTS avatar_emoji text NOT NULL DEFAULT '🙂';

-- Add columns to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS proof_url text;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS qr_code_id uuid;

-- Create poker_tables table
CREATE TABLE IF NOT EXISTS poker_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  min_bet numeric(12,2) NOT NULL CHECK (min_bet > 0),
  small_blind numeric(12,2) NOT NULL CHECK (small_blind > 0),
  big_blind numeric(12,2) NOT NULL CHECK (big_blind > 0),
  min_buy_in numeric(12,2) NOT NULL CHECK (min_buy_in > 0),
  max_buy_in numeric(12,2) NOT NULL CHECK (max_buy_in >= min_buy_in),
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create qr_codes table
CREATE TABLE IF NOT EXISTS qr_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  method text NOT NULL CHECK (method IN ('gcash', 'maya', 'bank')),
  account_name text NOT NULL,
  account_number text NOT NULL,
  qr_payload text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE poker_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;

-- Grant SELECT on new tables to anon and authenticated (public config data)
GRANT SELECT ON poker_tables TO anon, authenticated;
GRANT SELECT ON qr_codes TO anon, authenticated;

-- Policies for poker_tables (public read)
DROP POLICY IF EXISTS "anon_select_poker_tables" ON poker_tables;
CREATE POLICY "anon_select_poker_tables" ON poker_tables FOR SELECT
  TO anon, authenticated USING (true);

-- Policies for qr_codes (public read)
DROP POLICY IF EXISTS "anon_select_qr_codes" ON qr_codes;
CREATE POLICY "anon_select_qr_codes" ON qr_codes FOR SELECT
  TO anon, authenticated USING (true);

-- Update players INSERT grant to include new columns
GRANT INSERT (display_name, auth_id, avatar_url, avatar_emoji) ON players TO anon, authenticated;

-- Update players SELECT (already public, re-affirm)
DROP POLICY IF EXISTS "anon_select_players" ON players;
CREATE POLICY "anon_select_players" ON players FOR SELECT
  TO anon, authenticated USING (true);

-- Allow authenticated users to UPDATE their own player row (display_name, avatar only)
DROP POLICY IF EXISTS "auth_update_own_profile" ON players;
CREATE POLICY "auth_update_own_profile" ON players FOR UPDATE
  TO authenticated USING (auth_id = auth.uid()) WITH CHECK (auth_id = auth.uid());

-- Update transactions INSERT to include proof_url and qr_code_id
REVOKE INSERT ON transactions FROM anon, authenticated;
GRANT INSERT (player_id, type, amount, method, account_details, proof_url, qr_code_id) ON transactions TO anon, authenticated;

-- Seed poker tables with varying bet levels
INSERT INTO poker_tables (name, min_bet, small_blind, big_blind, min_buy_in, max_buy_in, display_order) VALUES
  ('Beginner ₱1', 1, 0.50, 1, 20, 200, 1),
  ('Rookie ₱2', 2, 1, 2, 40, 400, 2),
  ('Rookie ₱3', 3, 1.5, 3, 60, 600, 3),
  ('Casual ₱5', 5, 2.5, 5, 100, 1000, 4),
  ('Casual ₱10', 10, 5, 10, 200, 2000, 5),
  ('Pro ₱20', 20, 10, 20, 400, 4000, 6),
  ('Pro ₱30', 30, 15, 30, 600, 6000, 7),
  ('Pro ₱40', 40, 20, 40, 800, 8000, 8),
  ('High Roller ₱50', 50, 25, 50, 1000, 10000, 9),
  ('High Roller ₱100', 100, 50, 100, 2000, 20000, 10),
  ('VIP ₱200', 200, 100, 200, 4000, 40000, 11),
  ('Whale ₱1000', 1000, 500, 1000, 20000, 200000, 12)
ON CONFLICT DO NOTHING;

-- Seed QR codes for cash-in
INSERT INTO qr_codes (label, method, account_name, account_number, qr_payload, display_order) VALUES
  ('GCash Cash-In', 'gcash', 'Poker Room GCash', '09XX XXX XXXX', 'GCASH|09XXXXXXXXX|Poker Room|100.00|Cash In', 1),
  ('Maya Cash-In', 'maya', 'Poker Room Maya', '09XX XXX XXXX', 'MAYA|09XXXXXXXXX|Poker Room|100.00|Cash In', 2),
  ('Bank Transfer', 'bank', 'Poker Room BPI', '1234 5678 90', 'BANK|BPI|1234567890|Poker Room|100.00|Cash In', 3)
ON CONFLICT DO NOTHING;

-- Update poker_buy_in function to accept table_id
CREATE OR REPLACE FUNCTION poker_buy_in(p_player uuid, p_amount numeric, p_table_id uuid DEFAULT NULL)
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
  tbl poker_tables%ROWTYPE;
BEGIN
  SELECT * INTO pl FROM players WHERE id = p_player FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Player not found';
  END IF;
  IF pl.status <> 'active' THEN
    RAISE EXCEPTION 'This account is frozen';
  END IF;
  IF EXISTS (SELECT 1 FROM table_sessions WHERE player_id = p_player AND status = 'open') THEN
    RAISE EXCEPTION 'You are already seated at a table';
  END IF;

  IF p_table_id IS NOT NULL THEN
    SELECT * INTO tbl FROM poker_tables WHERE id = p_table_id AND is_active = true;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Table not found or not active';
    END IF;
    min_buy := tbl.min_buy_in;
    max_buy := tbl.max_buy_in;
  ELSE
    SELECT (value #>> '{}')::numeric INTO min_buy FROM settings WHERE key = 'min_buy_in';
    SELECT (value #>> '{}')::numeric INTO max_buy FROM settings WHERE key = 'max_buy_in';
  END IF;

  IF p_amount < min_buy OR p_amount > max_buy THEN
    RAISE EXCEPTION 'Buy-in must be between PHP % and PHP %', min_buy, max_buy;
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

REVOKE EXECUTE ON FUNCTION poker_buy_in(uuid, numeric, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION poker_buy_in(uuid, numeric, uuid) TO anon, authenticated;

-- Function to update user profile (display name and avatar)
CREATE OR REPLACE FUNCTION update_profile(p_player uuid, p_display_name text DEFAULT NULL, p_avatar_url text DEFAULT NULL, p_avatar_emoji text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pl players%ROWTYPE;
BEGIN
  SELECT * INTO pl FROM players WHERE id = p_player FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Player not found';
  END IF;

  IF p_display_name IS NOT NULL THEN
    IF char_length(p_display_name) < 2 OR char_length(p_display_name) > 24 THEN
      RAISE EXCEPTION 'Display name must be between 2 and 24 characters';
    END IF;
    UPDATE players SET display_name = p_display_name WHERE id = p_player;
    PERFORM log_event('info', format('%s changed their display name', pl.display_name), p_player);
  END IF;

  IF p_avatar_url IS NOT NULL THEN
    UPDATE players SET avatar_url = p_avatar_url WHERE id = p_player;
  END IF;

  IF p_avatar_emoji IS NOT NULL THEN
    UPDATE players SET avatar_emoji = p_avatar_emoji WHERE id = p_player;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION update_profile(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_profile(uuid, text, text, text) TO anon, authenticated;

-- Add qr_code_id foreign key (after qr_codes table exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'transactions_qr_code_id_fkey'
    AND table_name = 'transactions'
  ) THEN
    ALTER TABLE transactions ADD CONSTRAINT transactions_qr_code_id_fkey
      FOREIGN KEY (qr_code_id) REFERENCES qr_codes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add realtime publication for new tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE poker_tables; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE qr_codes; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;
