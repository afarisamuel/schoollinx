-- Rollback: 000015_add_amount_paid_facility_logs
DROP TABLE IF EXISTS facility_usage_logs;
-- NOTE: We intentionally do NOT drop amount_paid as it may contain live data.
-- To reverse, run manually: ALTER TABLE fiscal_records DROP COLUMN IF EXISTS amount_paid;
