/*
# Grant wallet and poker functions to the anonymous app role

1. Modified Functions
- resolve_transaction, admin_set_balance, admin_set_player_status, admin_set_setting, poker_buy_in and poker_cash_out are now callable by the anon role.

2. Security
- Still not callable by PUBLIC without a role. Each function validates its inputs internally.

3. Important Notes
- The app has no sign-in screen, so every request runs as anon. Without this grant every button would fail with a permission error.
*/

GRANT EXECUTE ON FUNCTION resolve_transaction(uuid, text, text) TO anon;
GRANT EXECUTE ON FUNCTION admin_set_balance(uuid, numeric) TO anon;
GRANT EXECUTE ON FUNCTION admin_set_player_status(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION admin_set_setting(text, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION poker_buy_in(uuid, numeric) TO anon;
GRANT EXECUTE ON FUNCTION poker_cash_out(uuid, numeric) TO anon;
