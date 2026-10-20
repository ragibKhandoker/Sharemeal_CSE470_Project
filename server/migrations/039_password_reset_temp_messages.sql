-- Temporary messages for admin-assisted password resets.
--
-- When a user requests a reset they receive a secret request code. Only an
-- X25519 public key derived from that code (via scrypt + salt) is stored
-- here. On approval the temporary password is encrypted to that public key,
-- so the stored message can only be opened with the user's code. The message
-- is deleted after it is read once.
--
-- Safe to re-run. Adds columns only.

ALTER TABLE public.password_reset_requests
  ADD COLUMN IF NOT EXISTS message_public_key TEXT,
  ADD COLUMN IF NOT EXISTS message_key_salt TEXT,
  ADD COLUMN IF NOT EXISTS code_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS temp_message_ciphertext TEXT,
  ADD COLUMN IF NOT EXISTS temp_message_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS temp_message_viewed_at TIMESTAMPTZ;
