-- =============================================================================
-- 000016_campus_operations.down.sql
-- New Campus Operations Phase 1: Lost and Found, Visitor Management, Disciplinary
-- =============================================================================

DROP TABLE IF EXISTS disciplinary_incidents CASCADE;
ALTER TABLE visitor_logs DROP COLUMN IF EXISTS badge_number;
ALTER TABLE visitor_logs DROP COLUMN IF EXISTS status;
DROP TABLE IF EXISTS lost_and_found_items CASCADE;
