-- Secure password reset tokens.
--
-- Only a SHA-256 hash of each reset token is stored; the token itself exists
-- only in the emailed link. Tokens are single-use (used_at), can be revoked
-- when a newer token is issued (revoked_at) and expire (expires_at).
--
-- Safe to re-run. Creates new objects only, plus the security cleanup at the
-- end of this file.

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  purpose VARCHAR(20) NOT NULL DEFAULT 'self_service'
    CHECK (purpose IN ('self_service', 'admin_approved')),
  request_id INTEGER REFERENCES public.password_reset_requests(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_user_created_idx
  ON public.password_reset_tokens(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS password_reset_tokens_expires_idx
  ON public.password_reset_tokens(expires_at);

-- JWTs issued before this time are rejected (logs out sessions after a reset).
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

-- Security cleanup: the admin-approval flow previously stored usable reset
-- tokens in plain text. Invalidate them (the request rows themselves are kept;
-- an admin can approve a request again to issue a new, hashed token).
UPDATE public.password_reset_requests
SET reset_token = NULL,
    token_expires_at = LEAST(COALESCE(token_expires_at, NOW()), NOW())
WHERE reset_token IS NOT NULL;
