DROP TABLE IF EXISTS public.system_announcements;

ALTER TABLE public.tenants DROP COLUMN IF EXISTS custom_domain;
ALTER TABLE public.tenants DROP COLUMN IF EXISTS trial_ends_at;
ALTER TABLE public.tenants DROP COLUMN IF EXISTS feature_flags;
