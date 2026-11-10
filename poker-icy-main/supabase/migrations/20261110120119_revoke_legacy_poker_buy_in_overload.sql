/*
# Revoke legacy poker buy-in overload

1. Modified Functions
- `poker_buy_in(p_player uuid, p_amount numeric)` is the older two-argument version. The app now calls the three-argument version that takes a table id.

2. Security
- Removes EXECUTE on the two-argument overload from PUBLIC, anon and authenticated so it can no longer be called over the Data API.
- The function itself is kept, so no data or definitions are removed.

3. Notes
- Safe to re-run: REVOKE on an already-revoked privilege does nothing.
*/

REVOKE EXECUTE ON FUNCTION public.poker_buy_in(uuid, numeric) FROM PUBLIC, anon, authenticated;
