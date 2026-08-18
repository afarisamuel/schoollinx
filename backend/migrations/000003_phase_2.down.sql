-- 000003_phase_2.down.sql

DROP TABLE IF EXISTS hardware_leases CASCADE;
DROP TABLE IF EXISTS affiliate_referrals CASCADE;
DROP TABLE IF EXISTS affiliates CASCADE;
DROP TABLE IF EXISTS platform_invoices CASCADE;
DROP TABLE IF EXISTS sms_ledgers CASCADE;

ALTER TABLE tenants 
DROP COLUMN IF EXISTS discount_percentage,
DROP COLUMN IF EXISTS fixed_price_override;
