-- 000002_student_candidate_fields.down.sql
-- Revert candidate fields added to students table

ALTER TABLE students
    DROP COLUMN IF EXISTS index_number,
    DROP COLUMN IF EXISTS gender,
    DROP COLUMN IF EXISTS basic_school,
    DROP COLUMN IF EXISTS region,
    DROP COLUMN IF EXISTS district,
    DROP COLUMN IF EXISTS exam_year,
    DROP COLUMN IF EXISTS aggregate,
    DROP COLUMN IF EXISTS raw_score,
    DROP COLUMN IF EXISTS placed_school,
    DROP COLUMN IF EXISTS placed_program,
    DROP COLUMN IF EXISTS placed_residence_type;
