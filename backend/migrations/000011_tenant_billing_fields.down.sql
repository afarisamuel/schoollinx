-- 000011_tenant_billing_fields.down.sql
ALTER TABLE public.tenants
  DROP COLUMN IF EXISTS billing_due_date,
  DROP COLUMN IF EXISTS trial_ends_at,
  DROP COLUMN IF EXISTS discount_percentage,
  DROP COLUMN IF EXISTS fixed_price_override,
  DROP COLUMN IF EXISTS nps_score,
  DROP COLUMN IF EXISTS require_2fa,
  DROP COLUMN IF EXISTS dpa_signed_at,
  DROP COLUMN IF EXISTS feature_flags,
  DROP COLUMN IF EXISTS address,
  DROP COLUMN IF EXISTS contact_numbers,
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS logo_url,
  DROP COLUMN IF EXISTS paystack_public_key,
  DROP COLUMN IF EXISTS paystack_secret_key,
  DROP COLUMN IF EXISTS class_score_weight,
  DROP COLUMN IF EXISTS exam_score_weight;
