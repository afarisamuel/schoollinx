-- 000002_student_candidate_fields.up.sql
-- Add missing fields from candidates.xlsx to the students table

ALTER TABLE students
    -- Core Identity
    ADD COLUMN IF NOT EXISTS index_number    TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS gender          TEXT,

    -- Academic Origin
    ADD COLUMN IF NOT EXISTS basic_school    TEXT,
    ADD COLUMN IF NOT EXISTS region          TEXT,
    ADD COLUMN IF NOT EXISTS district        TEXT,

    -- Exam Results
    ADD COLUMN IF NOT EXISTS exam_year       INTEGER,
    ADD COLUMN IF NOT EXISTS aggregate       INTEGER,
    ADD COLUMN IF NOT EXISTS raw_score       INTEGER,

    -- Placement Details
    ADD COLUMN IF NOT EXISTS placed_school          TEXT,
    ADD COLUMN IF NOT EXISTS placed_program         TEXT,
    ADD COLUMN IF NOT EXISTS placed_residence_type  TEXT;
