-- 000005_phase_4.down.sql

DROP TABLE IF EXISTS system_audit_logs CASCADE;
DROP TABLE IF EXISTS whitelisted_ips CASCADE;

ALTER TABLE tenants 
DROP COLUMN IF EXISTS require_2fa,
DROP COLUMN IF EXISTS dpa_signed_at;
