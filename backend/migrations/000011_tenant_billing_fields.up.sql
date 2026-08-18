-- 000011_tenant_billing_fields.up.sql
-- Add missing billing and configuration columns to public.tenants that were added via GORM struct but not migrated.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS billing_due_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS discount_percentage DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fixed_price_override DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nps_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS require2_fa BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS dpa_signed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS feature_flags JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_numbers TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS paystack_public_key TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS paystack_secret_key TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS class_score_weight REAL DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS exam_score_weight REAL DEFAULT 0.5;

-- Rename require_2fa to require2_fa if it was previously created
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tenants' AND column_name='require_2fa') THEN
    ALTER TABLE public.tenants RENAME COLUMN require_2fa TO require2_fa;
  END IF;
END $$;
