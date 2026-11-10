/*
# Storage policies for avatars and payment-proofs buckets

1. New Storage Policies
- `avatars` (public bucket): authenticated users can upload to their own folder path `user-id/`. Anyone can read (public bucket).
- `payment-proofs` (private bucket): authenticated users can upload to their own folder path `user-id/`. Only the owner and admin can read their own proofs.

2. Security
- Avatar uploads are restricted to the authenticated user's own folder.
- Payment proof uploads are restricted to the authenticated user's own folder.
- Payment proof reads are restricted to the owner only (admin reads through service role which bypasses RLS).

3. Important Notes
- Avatars are public so they can be displayed at the poker table for all players to see.
- Payment proofs are private; only the uploading user and the admin (via service role) can view them.
*/

-- Avatar bucket policies (public read, authenticated write to own folder)
DROP POLICY IF EXISTS "avatar_public_read" ON storage.objects;
CREATE POLICY "avatar_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatar_owner_upload" ON storage.objects;
CREATE POLICY "avatar_owner_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "avatar_owner_update" ON storage.objects;
CREATE POLICY "avatar_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "avatar_owner_delete" ON storage.objects;
CREATE POLICY "avatar_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Payment-proofs bucket policies (owner read, authenticated write to own folder)
DROP POLICY IF EXISTS "proof_owner_read" ON storage.objects;
CREATE POLICY "proof_owner_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "proof_owner_upload" ON storage.objects;
CREATE POLICY "proof_owner_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "proof_owner_delete" ON storage.objects;
CREATE POLICY "proof_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
