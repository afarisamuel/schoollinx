-- 000004_phase_3.down.sql

DROP TABLE IF EXISTS telemetry_events CASCADE;

ALTER TABLE tenants 
DROP COLUMN IF EXISTS nps_score;
