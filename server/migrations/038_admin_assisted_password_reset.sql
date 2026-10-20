-- Admin-assisted password reset with one-time temporary passwords.
--
-- Reuses password_reset_requests (migration 016). When an admin approves a
-- request, a random temporary password is generated; only its bcrypt hash is
-- stored here. Logging in with it forces the user to set a new password, after
-- which the temporary hash is cleared and the request is marked completed.
--
-- Safe to re-run. No rows are deleted.

ALTER TABLE public.password_reset_requests
  ADD COLUMN IF NOT EXISTS temp_password_hash TEXT,
  ADD COLUMN IF NOT EXISTS temp_password_issued_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS temp_password_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Only the four documented statuses are allowed.
UPDATE public.password_reset_requests SET status = LOWER(TRIM(status)) WHERE status <> LOWER(TRIM(status));
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'password_reset_requests_status_check'
  ) THEN
    ALTER TABLE public.password_reset_requests
      ADD CONSTRAINT password_reset_requests_status_check
      CHECK (status IN ('pending', 'approved', 'rejected', 'completed'));
  END IF;
END $$;

-- At most one pending request per user. Older duplicate pending requests (if
-- any exist from before this rule) are closed as rejected, newest is kept.
UPDATE public.password_reset_requests prr
SET status = 'rejected', resolved_at = COALESCE(resolved_at, NOW())
WHERE prr.status = 'pending'
  AND EXISTS (
    SELECT 1 FROM public.password_reset_requests newer
    WHERE newer.user_id = prr.user_id AND newer.status = 'pending' AND newer.id > prr.id
  );
CREATE UNIQUE INDEX IF NOT EXISTS password_reset_requests_one_pending
  ON public.password_reset_requests(user_id) WHERE status = 'pending';

-- At most one usable temporary password per user.
CREATE UNIQUE INDEX IF NOT EXISTS password_reset_requests_one_temp_password
  ON public.password_reset_requests(user_id) WHERE temp_password_hash IS NOT NULL;

-- The email-link reset flow (migration 037) is retired: invalidate any
-- outstanding links. The table is kept for history.
DO $$
BEGIN
  IF to_regclass('public.password_reset_tokens') IS NOT NULL THEN
    UPDATE public.password_reset_tokens SET revoked_at = NOW()
    WHERE used_at IS NULL AND revoked_at IS NULL;
  END IF;
END $$;
