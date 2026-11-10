/*
# Restrict poker_tables and qr_codes to SELECT-only for browser roles

1. Modified Tables
- `poker_tables`: revoked INSERT, UPDATE, DELETE from anon and authenticated. Only SELECT remains (public config data).
- `qr_codes`: revoked INSERT, UPDATE, DELETE from anon and authenticated. Only SELECT remains (public config data).

2. Security
- These are admin-managed configuration tables. Browser roles only need to read them.
- Changes are made through admin SECURITY DEFINER functions which use the service role internally.
*/

REVOKE INSERT, UPDATE, DELETE ON poker_tables FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON qr_codes FROM anon, authenticated;
