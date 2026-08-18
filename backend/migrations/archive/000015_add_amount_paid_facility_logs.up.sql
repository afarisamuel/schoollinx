-- Migration: 000015_add_amount_paid_to_fiscal_records
-- Adds the amount_paid column to fiscal_records for existing tenant schemas
-- that were created before this field was introduced.

ALTER TABLE fiscal_records
    ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(12,4) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS rooms (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL UNIQUE,
    capacity   INTEGER,
    type       TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Also add the facility_usage_logs table if it does not exist (Phase 7 feature).
CREATE TABLE IF NOT EXISTS facility_usage_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id     UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id),
    start_time  TIMESTAMPTZ NOT NULL,
    end_time    TIMESTAMPTZ,
    purpose     TEXT,
    notes       TEXT
);

CREATE INDEX IF NOT EXISTS idx_facility_usage_room
    ON facility_usage_logs(room_id);
