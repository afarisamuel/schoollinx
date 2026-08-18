-- =============================================================================
-- 000016_campus_operations.up.sql
-- New Campus Operations Phase 1: Lost and Found, Visitor Management, Disciplinary
-- =============================================================================

CREATE TABLE IF NOT EXISTS lost_and_found_items (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_name     TEXT NOT NULL,
    description   TEXT,
    category      TEXT,
    found_location TEXT NOT NULL,
    date_found    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status        TEXT NOT NULL DEFAULT 'UNCLAIMED', -- UNCLAIMED, CLAIMED, DISCARDED
    reported_by_id UUID REFERENCES users(id),
    claimed_by_id UUID REFERENCES users(id),
    date_claimed  TIMESTAMPTZ,
    deleted_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE visitor_logs ADD COLUMN IF NOT EXISTS badge_number TEXT;
ALTER TABLE visitor_logs ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE';

CREATE TABLE IF NOT EXISTS disciplinary_incidents (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id    UUID REFERENCES students(id) NOT NULL,
    reported_by_id UUID REFERENCES users(id) NOT NULL,
    incident_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    incident_type TEXT NOT NULL,
    description   TEXT,
    action_taken  TEXT,
    status        TEXT NOT NULL DEFAULT 'OPEN', -- OPEN, RESOLVED
    points_deducted INTEGER DEFAULT 0,
    deleted_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
