/*
# Admin-managed payment QR images

1. Modified Tables
- `qr_codes`: new `image_data` column holding an admin-uploaded QR image as a data URL. Null means the default image is shown.

2. New Functions
- `admin_set_qr_image(p_admin_key, p_id, p_image)`: admin-only. Stores or clears (null) a QR image. Only PNG, JPEG or WebP data URLs up to ~500 KB are accepted.

3. Security
- Requires the admin password like every other admin function.
- Browser roles keep SELECT-only access to qr_codes.
*/

ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS image_data text;

CREATE OR REPLACE FUNCTION admin_set_qr_image(p_admin_key text, p_id uuid, p_image text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  qr qr_codes%ROWTYPE;
BEGIN
  PERFORM assert_admin(p_admin_key);

  IF p_image IS NOT NULL AND (
    p_image !~ '^data:image/(png|jpeg|webp);base64,' OR char_length(p_image) > 500000
  ) THEN
    RAISE EXCEPTION 'QR image must be a PNG, JPEG or WebP file under 500 KB';
  END IF;

  UPDATE qr_codes SET image_data = p_image WHERE id = p_id RETURNING * INTO qr;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'QR code not found';
  END IF;

  PERFORM log_event(
    'admin',
    format('QR image for %s %s', qr.label, CASE WHEN p_image IS NULL THEN 'removed' ELSE 'updated' END),
    NULL
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_set_qr_image(text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_set_qr_image(text, uuid, text) TO anon, authenticated;
