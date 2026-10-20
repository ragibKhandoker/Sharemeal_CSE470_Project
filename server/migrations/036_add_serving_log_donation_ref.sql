-- serving_logs.donation_ref is written by the NGO serving log form, pickup
-- handovers and seed_ngo_data.js, but 008_create_serving_logs.sql never created it.
ALTER TABLE public.serving_logs
  ADD COLUMN IF NOT EXISTS donation_ref TEXT;
