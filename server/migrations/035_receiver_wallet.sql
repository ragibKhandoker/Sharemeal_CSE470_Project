-- Receiver in-app wallet, wallet top-ups and internal wallet-to-NGO payments.
--
-- All money columns are BIGINT paisa (1 BDT = 100 paisa) so no floating-point
-- arithmetic is ever involved. Balances live in wallet_accounts and every
-- balance change is recorded as an append-only row in wallet_transactions.
--
-- NGO payments are INTERNAL LEDGER records only: no real money is moved to an
-- NGO's bank or mobile wallet (settlement_status stays 'unsettled' until a
-- payout process exists).
--
-- This migration only creates new objects; it does not drop or alter existing
-- data. Safe to re-run.

CREATE TABLE IF NOT EXISTS public.wallet_accounts (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE RESTRICT,
  balance_paisa BIGINT NOT NULL DEFAULT 0 CHECK (balance_paisa >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'BDT',
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'frozen')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.wallet_topups (
  id BIGSERIAL PRIMARY KEY,
  reference VARCHAR(40) NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  wallet_id BIGINT NOT NULL REFERENCES public.wallet_accounts(id) ON DELETE RESTRICT,
  amount_paisa BIGINT NOT NULL CHECK (amount_paisa > 0),
  provider VARCHAR(30) NOT NULL,
  provider_txn_id VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  is_simulated BOOLEAN NOT NULL,
  idempotency_key VARCHAR(80) NOT NULL,
  failure_reason VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ,
  UNIQUE (user_id, idempotency_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS wallet_topups_provider_txn_unique
  ON public.wallet_topups(provider, provider_txn_id)
  WHERE provider_txn_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS wallet_topups_user_created_idx
  ON public.wallet_topups(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ngo_payments (
  id BIGSERIAL PRIMARY KEY,
  reference VARCHAR(40) NOT NULL UNIQUE,
  receiver_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  ngo_user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  ngo_id INTEGER REFERENCES public.ngos(id) ON DELETE SET NULL,
  amount_paisa BIGINT NOT NULL CHECK (amount_paisa > 0),
  description VARCHAR(200),
  status VARCHAR(20) NOT NULL DEFAULT 'completed'
    CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  settlement_status VARCHAR(20) NOT NULL DEFAULT 'unsettled'
    CHECK (settlement_status IN ('unsettled', 'settled')),
  idempotency_key VARCHAR(80) NOT NULL,
  refund_reason VARCHAR(255),
  refunded_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (receiver_id, idempotency_key),
  CHECK (receiver_id <> ngo_user_id)
);

CREATE INDEX IF NOT EXISTS ngo_payments_ngo_created_idx
  ON public.ngo_payments(ngo_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ngo_payments_receiver_created_idx
  ON public.ngo_payments(receiver_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id BIGSERIAL PRIMARY KEY,
  reference VARCHAR(40) NOT NULL UNIQUE,
  wallet_id BIGINT NOT NULL REFERENCES public.wallet_accounts(id) ON DELETE RESTRICT,
  user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  type VARCHAR(20) NOT NULL CHECK (type IN ('topup', 'ngo_payment', 'refund')),
  direction VARCHAR(6) NOT NULL CHECK (direction IN ('credit', 'debit')),
  amount_paisa BIGINT NOT NULL CHECK (amount_paisa > 0),
  balance_after_paisa BIGINT NOT NULL CHECK (balance_after_paisa >= 0),
  description VARCHAR(255) NOT NULL,
  topup_id BIGINT REFERENCES public.wallet_topups(id) ON DELETE RESTRICT,
  ngo_payment_id BIGINT REFERENCES public.ngo_payments(id) ON DELETE RESTRICT,
  is_simulated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (
    (type = 'topup' AND direction = 'credit' AND topup_id IS NOT NULL) OR
    (type = 'ngo_payment' AND direction = 'debit' AND ngo_payment_id IS NOT NULL) OR
    (type = 'refund' AND direction = 'credit' AND ngo_payment_id IS NOT NULL)
  )
);

-- A top-up can credit a wallet at most once; a payment can be debited and
-- refunded at most once each.
CREATE UNIQUE INDEX IF NOT EXISTS wallet_transactions_one_topup_credit
  ON public.wallet_transactions(topup_id) WHERE type = 'topup';
CREATE UNIQUE INDEX IF NOT EXISTS wallet_transactions_one_payment_debit
  ON public.wallet_transactions(ngo_payment_id) WHERE type = 'ngo_payment';
CREATE UNIQUE INDEX IF NOT EXISTS wallet_transactions_one_payment_refund
  ON public.wallet_transactions(ngo_payment_id) WHERE type = 'refund';
CREATE INDEX IF NOT EXISTS wallet_transactions_user_created_idx
  ON public.wallet_transactions(user_id, created_at DESC, id DESC);

-- Ledger rows are an audit trail: block edits and deletes at the database level.
CREATE OR REPLACE FUNCTION public.wallet_transactions_append_only()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'wallet_transactions is append-only; record a reversal instead';
END;
$$;

DROP TRIGGER IF EXISTS wallet_transactions_no_update_delete ON public.wallet_transactions;
CREATE TRIGGER wallet_transactions_no_update_delete
  BEFORE UPDATE OR DELETE ON public.wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION public.wallet_transactions_append_only();
