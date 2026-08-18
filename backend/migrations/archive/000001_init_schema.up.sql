-- Migration: 000003_baseline_full_schema.up.sql
-- =============================================================================
-- 000003_baseline_full_schema.up.sql
-- Full authoritative baseline for the High School Management System.
-- Supersedes 000001 and 000002 (archived in migrations/archive/).
--
-- All statements use IF NOT EXISTS — safe to run against an existing database.
-- Applied to both the public (global) schema AND each per-tenant schema.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- GLOBAL TABLES (public schema only)
-- =============================================================================

CREATE TABLE IF NOT EXISTS tenants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL UNIQUE,
    subdomain       TEXT UNIQUE,
    schema_name     TEXT UNIQUE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    subscription_plan TEXT NOT NULL DEFAULT 'BASIC',
    per_student_per_term_rate NUMERIC(10,4) NOT NULL DEFAULT 0.0,
    sms_credits       INTEGER NOT NULL DEFAULT 0,
    storage_limit_gb  INTEGER NOT NULL DEFAULT 5,
    storage_used_mb   INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    address         TEXT,
    contact_numbers TEXT,
    email           TEXT,
    logo_url        TEXT,
    class_score_weight NUMERIC(4,2) DEFAULT 0.5,
    exam_score_weight NUMERIC(4,2) DEFAULT 0.5,
    paystack_public_key TEXT,
    paystack_secret_key TEXT
);

CREATE TABLE IF NOT EXISTS revoked_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jti         VARCHAR(255) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_revoked_tokens_jti ON revoked_tokens(jti);
CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires ON revoked_tokens(expires_at);

-- =============================================================================
-- TENANT-SCOPED TABLES
-- Applied to each tenant schema via RunTenantMigrations.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Core identity
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email                   TEXT NOT NULL UNIQUE,
    username                TEXT UNIQUE,
    phone_number            TEXT UNIQUE,
    password                TEXT NOT NULL,
    role                    TEXT NOT NULL,
    must_change_password    BOOLEAN NOT NULL DEFAULT FALSE,
    setup_token             TEXT,
    setup_token_expires_at  TIMESTAMPTZ,
    two_factor_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
    two_factor_secret       TEXT,
    deleted_at              TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_setup_token ON users(setup_token);

CREATE TABLE IF NOT EXISTS scholastic_levels (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL UNIQUE,
    ordinal    INTEGER NOT NULL,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS departments (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL UNIQUE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subjects (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL UNIQUE,
    code       TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_profiles (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID REFERENCES users(id),
    first_name   TEXT NOT NULL,
    last_name    TEXT NOT NULL,
    email        TEXT,
    phone_number TEXT,
    job_title    TEXT NOT NULL,
    department   TEXT,
    base_salary  NUMERIC(12,4) NOT NULL,
    bank_account TEXT,
    hire_date    TIMESTAMPTZ NOT NULL,
    deleted_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_staff_user ON staff_profiles(user_id);

CREATE TABLE IF NOT EXISTS teachers (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID REFERENCES users(id),
    first_name       TEXT NOT NULL,
    last_name        TEXT NOT NULL,
    email            TEXT NOT NULL UNIQUE,
    phone_number     TEXT,
    dob              TEXT,
    can_collect_fees BOOLEAN NOT NULL DEFAULT FALSE,
    staff_profile_id UUID REFERENCES staff_profiles(id),
    deleted_at       TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON teachers(user_id);

-- Join table: teachers ↔ subjects
CREATE TABLE IF NOT EXISTS teacher_subjects (
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    PRIMARY KEY (teacher_id, subject_id)
);

CREATE TABLE IF NOT EXISTS classes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                TEXT,
    teacher_id          UUID REFERENCES teachers(id),
    scholastic_level_id UUID REFERENCES scholastic_levels(id),
    deleted_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS students (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               UUID REFERENCES users(id),
    first_name            TEXT NOT NULL,
    last_name             TEXT NOT NULL,
    other_name            TEXT,
    gender                TEXT,
    dob                   TEXT,
    phone_number          TEXT,
    address               TEXT,
    placed_residence_type TEXT,
    photo_url             TEXT,

    enrollment_num        TEXT UNIQUE,
    class_id              UUID REFERENCES classes(id),
    status                TEXT NOT NULL DEFAULT 'ACTIVE',
    level                 INTEGER NOT NULL DEFAULT 1,
    academic_year         VARCHAR(20),
    graduation_date       TIMESTAMPTZ,
    prepaid_balance       NUMERIC(12,4) NOT NULL DEFAULT 0,
    rfid_token            TEXT,
    deleted_at            TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_rfid ON students(rfid_token);

CREATE TABLE IF NOT EXISTS guardians (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id),
    first_name   TEXT,
    last_name    TEXT,
    email        TEXT UNIQUE,
    phone_number TEXT,
    address      TEXT,
    relationship TEXT,
    deleted_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Join table: students ↔ guardians
CREATE TABLE IF NOT EXISTS student_guardians (
    student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    guardian_id UUID NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
    PRIMARY KEY (student_id, guardian_id)
);

CREATE TABLE IF NOT EXISTS alumni_profiles (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id     UUID NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
    higher_ed      TEXT,
    current_career TEXT,
    linkedin_url   TEXT,
    deleted_at     TIMESTAMPTZ,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Academic
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS academic_periods (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         TEXT NOT NULL UNIQUE,
    term_type    TEXT NOT NULL,
    term_count   INTEGER NOT NULL,
    current_term INTEGER NOT NULL DEFAULT 1,
    is_active    BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS academic_terms (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_period_id UUID NOT NULL REFERENCES academic_periods(id) ON DELETE CASCADE,
    term_number        INTEGER NOT NULL,
    name               TEXT NOT NULL,
    start_date         TIMESTAMPTZ NOT NULL,
    end_date           TIMESTAMPTZ NOT NULL,
    is_locked          BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at         TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_academic_terms_period ON academic_terms(academic_period_id);

CREATE TABLE IF NOT EXISTS grades (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id),
    class_id   UUID NOT NULL REFERENCES classes(id),
    score      REAL NOT NULL,
    max_score  REAL NOT NULL DEFAULT 100,
    category   VARCHAR(20) NOT NULL DEFAULT 'ASSIGNMENT',
    subject    TEXT NOT NULL,
    remarks    TEXT,
    term       TEXT NOT NULL,
    editor_id  UUID REFERENCES users(id),
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_class ON grades(class_id);

CREATE TABLE IF NOT EXISTS grade_weights (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id  UUID NOT NULL REFERENCES classes(id),
    category  VARCHAR(20) NOT NULL,
    weight    REAL NOT NULL,
    deleted_at TIMESTAMPTZ,
    UNIQUE (class_id, category)
);

CREATE TABLE IF NOT EXISTS grade_logs (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grade_id   UUID NOT NULL REFERENCES grades(id),
    editor_id  UUID NOT NULL REFERENCES users(id),
    old_score  REAL,
    new_score  REAL,
    note       TEXT,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_grade_logs_grade ON grade_logs(grade_id);

CREATE TABLE IF NOT EXISTS class_term_locks (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id  UUID NOT NULL REFERENCES classes(id),
    term      TEXT NOT NULL,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (class_id, term)
);

CREATE TABLE IF NOT EXISTS attendances (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id),
    class_id   UUID REFERENCES classes(id),
    date       TIMESTAMPTZ,
    status     TEXT,
    remarks    TEXT,
    deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_attendances_student ON attendances(student_id);
CREATE INDEX IF NOT EXISTS idx_attendances_date ON attendances(date);


CREATE TABLE IF NOT EXISTS teacher_class_assignments (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id    UUID NOT NULL REFERENCES teachers(id),
    class_id      UUID NOT NULL REFERENCES classes(id),
    subject       UUID REFERENCES subjects(id),
    academic_year TEXT NOT NULL,
    deleted_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tca_teacher ON teacher_class_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_tca_class ON teacher_class_assignments(class_id);

CREATE TABLE IF NOT EXISTS academic_assignments (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES teachers(id),
    class_id   UUID REFERENCES classes(id),
    subject_id UUID REFERENCES subjects(id),
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS timetable_entries (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id   UUID NOT NULL REFERENCES classes(id),
    subject_id UUID NOT NULL REFERENCES subjects(id),
    teacher_id UUID NOT NULL REFERENCES teachers(id),
    day_of_week INTEGER,
    start_time  TEXT,
    end_time    TEXT,
    room        TEXT,
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_timetable_class ON timetable_entries(class_id);

CREATE TABLE IF NOT EXISTS homeworks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       TEXT NOT NULL,
    description TEXT,
    due_date    TEXT NOT NULL,
    class_id    UUID NOT NULL REFERENCES classes(id),
    subject     TEXT NOT NULL,
    teacher_id  UUID NOT NULL REFERENCES teachers(id),
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS academic_insights (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id          UUID NOT NULL REFERENCES students(id),
    type                TEXT NOT NULL,
    title               TEXT NOT NULL,
    description         TEXT,
    confidence_score    FLOAT,
    reasoning           TEXT,
    suggested_subject_id UUID REFERENCES subjects(id),
    deleted_at          TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_insights_student ON academic_insights(student_id);

-- -----------------------------------------------------------------------------
-- Exams
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS exams (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title         TEXT NOT NULL,
    description   TEXT,
    academic_year TEXT,
    term          TEXT,
    status        TEXT NOT NULL DEFAULT 'DRAFT',
    start_date    TIMESTAMPTZ,
    end_date      TIMESTAMPTZ,
    deleted_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exam_schedules (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id    UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    class_id   UUID NOT NULL REFERENCES classes(id),
    subject    TEXT NOT NULL,
    date       TIMESTAMPTZ NOT NULL,
    start_time TEXT,
    end_time   TEXT,
    max_score  REAL NOT NULL DEFAULT 100,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exam_results (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_schedule_id UUID NOT NULL REFERENCES exam_schedules(id),
    student_id       UUID NOT NULL REFERENCES students(id),
    score            REAL,
    remarks          TEXT,
    editor_id        UUID REFERENCES users(id),
    deleted_at       TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (exam_schedule_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_exam_results_student ON exam_results(student_id);

CREATE TABLE IF NOT EXISTS exam_sessions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id          UUID NOT NULL REFERENCES subjects(id),
    class_id            UUID NOT NULL REFERENCES classes(id),
    facility_id         UUID,
    academic_period_id  UUID REFERENCES academic_periods(id),
    date                TIMESTAMPTZ NOT NULL,
    start_time          TEXT NOT NULL,
    end_time            TEXT NOT NULL,
    deleted_at          TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS invigilation_duties (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_session_id UUID NOT NULL REFERENCES exam_sessions(id),
    teacher_id      UUID NOT NULL REFERENCES teachers(id),
    deleted_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_invigilation_session ON invigilation_duties(exam_session_id);
CREATE INDEX IF NOT EXISTS idx_invigilation_teacher ON invigilation_duties(teacher_id);

-- -----------------------------------------------------------------------------
-- Communications & Messaging
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS campaigns (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject    TEXT NOT NULL,
    body_html  TEXT NOT NULL,
    status     VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    target     TEXT NOT NULL,
    creator_id UUID NOT NULL REFERENCES users(id),
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaign_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id),
    recipient   TEXT NOT NULL,
    status      TEXT,
    error       TEXT,
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_campaign_logs_campaign ON campaign_logs(campaign_id);

CREATE TABLE IF NOT EXISTS conversations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_a UUID NOT NULL REFERENCES users(id),
    participant_b UUID NOT NULL REFERENCES users(id),
    deleted_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id),
    sender_id       UUID NOT NULL REFERENCES users(id),
    content         TEXT NOT NULL,
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);

CREATE TABLE IF NOT EXISTS notices (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title      TEXT NOT NULL,
    content    TEXT NOT NULL,
    author_id  UUID NOT NULL REFERENCES users(id),
    target     TEXT,
    is_active  BOOLEAN NOT NULL DEFAULT TRUE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reminders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           TEXT NOT NULL,
    message         TEXT NOT NULL,
    target_audience TEXT,
    send_date       TIMESTAMPTZ NOT NULL,
    status          TEXT NOT NULL DEFAULT 'PENDING',
    channel         TEXT NOT NULL DEFAULT 'SMS',
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meeting_slots (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES teachers(id),
    date       TIMESTAMPTZ NOT NULL,
    start_time TEXT NOT NULL,
    end_time   TEXT NOT NULL,
    is_booked  BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meeting_bookings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_slot_id UUID NOT NULL REFERENCES meeting_slots(id),
    guardian_id     UUID NOT NULL REFERENCES guardians(id),
    student_id      UUID REFERENCES students(id),
    reason          TEXT,
    status          TEXT NOT NULL DEFAULT 'CONFIRMED',
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Fiscal & Finance
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS fiscal_records (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id  UUID NOT NULL REFERENCES students(id),
    category    TEXT NOT NULL,
    amount      NUMERIC(12,4) NOT NULL,
    amount_paid NUMERIC(12,4) NOT NULL DEFAULT 0,
    description TEXT,
    term_name   VARCHAR(100),
    breakdown   JSONB,
    status      TEXT NOT NULL DEFAULT 'PENDING',
    due_date    TIMESTAMPTZ,
    paid_at     TIMESTAMPTZ,
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fiscal_student ON fiscal_records(student_id);

CREATE TABLE IF NOT EXISTS fee_structures (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_period_id UUID NOT NULL REFERENCES academic_periods(id),
    category           TEXT NOT NULL,
    amount             NUMERIC(12,4) NOT NULL,
    frequency          VARCHAR(50) NOT NULL DEFAULT 'TERMLY',
    is_term_fee        BOOLEAN NOT NULL DEFAULT TRUE,
    deleted_at         TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (academic_period_id, category)
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id  UUID NOT NULL REFERENCES students(id),
    type        VARCHAR(10) NOT NULL,
    amount      NUMERIC(12,4) NOT NULL,
    balance     NUMERIC(12,4) NOT NULL,
    description TEXT,
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wallet_student ON wallet_transactions(student_id);

CREATE TABLE IF NOT EXISTS budgets (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year    TEXT NOT NULL,
    category         TEXT NOT NULL,
    allocated_amount NUMERIC(12,4) NOT NULL,
    spent_amount     NUMERIC(12,4) NOT NULL DEFAULT 0,
    deleted_at       TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenditures (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id   UUID REFERENCES budgets(id),
    amount      NUMERIC(12,4) NOT NULL,
    description TEXT NOT NULL,
    date        TIMESTAMPTZ NOT NULL,
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expense_claims (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requestor_id UUID NOT NULL REFERENCES users(id),
    amount       NUMERIC(12,4) NOT NULL,
    description  TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'PENDING_MANAGER',
    receipt_url  TEXT,
    manager_id   UUID REFERENCES users(id),
    finance_id   UUID REFERENCES users(id),
    deleted_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS donations (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_id       UUID,
    donor_name     TEXT NOT NULL,
    amount         NUMERIC(12,4) NOT NULL,
    purpose        TEXT,
    payment_status TEXT NOT NULL DEFAULT 'PENDING',
    deleted_at     TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_bills (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id   UUID NOT NULL REFERENCES students(id),
    amount       NUMERIC(12,4) NOT NULL,
    date         DATE NOT NULL,
    status       TEXT NOT NULL DEFAULT 'PENDING',
    collected_by UUID REFERENCES users(id),
    collected_at TIMESTAMPTZ,
    deleted_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_daily_bills_student ON daily_bills(student_id);
CREATE INDEX IF NOT EXISTS idx_daily_bills_date ON daily_bills(date);

-- -----------------------------------------------------------------------------
-- HR
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS payroll_records (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id              UUID NOT NULL REFERENCES staff_profiles(id),
    period_month          INTEGER NOT NULL,
    period_year           INTEGER NOT NULL,
    gross_pay             NUMERIC(12,4) NOT NULL,
    allowances            NUMERIC(12,4) NOT NULL DEFAULT 0,
    deductions            NUMERIC(12,4) NOT NULL DEFAULT 0,
    net_pay               NUMERIC(12,4) NOT NULL,
    allowances_breakdown  TEXT,
    deductions_breakdown  TEXT,
    status                VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    payment_date          TIMESTAMPTZ,
    deleted_at            TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payroll_staff ON payroll_records(staff_id);

CREATE TABLE IF NOT EXISTS leave_requests (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id   UUID NOT NULL REFERENCES staff_profiles(id),
    leave_type TEXT NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date   TIMESTAMPTZ NOT NULL,
    reason     TEXT,
    status     VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leave_balances (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id        UUID NOT NULL REFERENCES staff_profiles(id),
    leave_type      TEXT NOT NULL,
    year            INTEGER NOT NULL,
    allocated_days  NUMERIC(5,1) NOT NULL DEFAULT 0,
    used_days       NUMERIC(5,1) NOT NULL DEFAULT 0,
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_attendances (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id     UUID NOT NULL REFERENCES staff_profiles(id),
    date         DATE NOT NULL,
    clock_in     TIMESTAMPTZ,
    clock_out    TIMESTAMPTZ,
    status       VARCHAR(20) NOT NULL DEFAULT 'PRESENT',
    notes        TEXT,
    is_biometric BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_staff ON staff_attendances(staff_id);

CREATE TABLE IF NOT EXISTS deduction_types (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    description TEXT,
    rate_type   TEXT NOT NULL,
    rate        NUMERIC(8,4) NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS allowance_types (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    description TEXT,
    rate_type   TEXT NOT NULL,
    rate        NUMERIC(8,4) NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tax_brackets (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    min_income NUMERIC(12,4) NOT NULL,
    max_income NUMERIC(12,4),
    rate       NUMERIC(6,4) NOT NULL,
    is_active  BOOLEAN NOT NULL DEFAULT TRUE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS performance_reviews (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id              UUID NOT NULL REFERENCES staff_profiles(id),
    reviewer_id           UUID NOT NULL REFERENCES users(id),
    review_date           TIMESTAMPTZ NOT NULL,
    review_period         TEXT,
    score                 NUMERIC(4,2) NOT NULL,
    comments              TEXT,
    goals                 TEXT,
    strengths             TEXT,
    areas_for_improvement TEXT,
    recommendation        TEXT,
    status                TEXT NOT NULL DEFAULT 'DRAFT',
    deleted_at            TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_perf_reviews_staff ON performance_reviews(staff_id);

CREATE TABLE IF NOT EXISTS professional_developments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id        UUID NOT NULL REFERENCES staff_profiles(id),
    course_name     TEXT NOT NULL,
    provider        TEXT,
    completion_date TIMESTAMPTZ,
    cost            NUMERIC(10,4) NOT NULL DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Library
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS library_books (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    isbn             TEXT NOT NULL UNIQUE,
    barcode          TEXT NOT NULL UNIQUE,
    title            TEXT NOT NULL,
    author           TEXT NOT NULL,
    category         TEXT,
    total_copies     INTEGER NOT NULL DEFAULT 1,
    available_copies INTEGER NOT NULL DEFAULT 1,
    deleted_at       TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS library_loans (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id     UUID NOT NULL REFERENCES library_books(id),
    student_id  UUID NOT NULL REFERENCES students(id),
    loan_date   TIMESTAMPTZ NOT NULL,
    due_date    TIMESTAMPTZ NOT NULL,
    returned_at TIMESTAMPTZ,
    status      TEXT NOT NULL DEFAULT 'LOANED',
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_loans_student ON library_loans(student_id);

-- -----------------------------------------------------------------------------
-- Extracurricular
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS clubs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    description TEXT,
    teacher_id  UUID NOT NULL REFERENCES teachers(id),
    category    TEXT NOT NULL,
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS club_members (
    club_id    UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    PRIMARY KEY (club_id, student_id)
);

CREATE TABLE IF NOT EXISTS events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       TEXT NOT NULL,
    description TEXT,
    start_time  TIMESTAMPTZ NOT NULL,
    end_time    TIMESTAMPTZ NOT NULL,
    location    TEXT,
    club_id     UUID REFERENCES clubs(id),
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Logistics (Transport + Canteen)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS transport_routes (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT NOT NULL,
    driver_name   TEXT,
    driver_phone  TEXT,
    vehicle_info  TEXT,
    vehicle_plate TEXT,
    capacity      INTEGER NOT NULL DEFAULT 0,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    daily_fee      NUMERIC(10,4),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bus_assignments (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id),
    route_id   UUID NOT NULL REFERENCES transport_routes(id),
    pick_up    TEXT,
    drop_off   TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meal_plans (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    description TEXT,
    term_fee    NUMERIC(10,4),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS canteen_subscriptions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id   UUID NOT NULL REFERENCES students(id),
    meal_plan_id UUID NOT NULL REFERENCES meal_plans(id),
    term         TEXT,
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Facility / Inventory / Visitors
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS inventory_items (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name              TEXT NOT NULL,
    asset_tag         TEXT UNIQUE,
    category          TEXT,
    quantity          INTEGER NOT NULL DEFAULT 0,
    unit_value        NUMERIC(12,4),
    acquisition_date  TIMESTAMPTZ,
    depreciation_rate NUMERIC(6,4) NOT NULL DEFAULT 0,
    current_value     NUMERIC(12,4),
    location          TEXT,
    status            TEXT NOT NULL DEFAULT 'ACTIVE',
    last_updated      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS visitor_logs (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL,
    phone      TEXT,
    purpose    TEXT,
    host_id    UUID,
    check_in   TIMESTAMPTZ NOT NULL,
    check_out  TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS room_bookings (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id    UUID NOT NULL,
    booker_id  UUID NOT NULL REFERENCES users(id),
    purpose    TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time   TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_room_bookings_room ON room_bookings(room_id);

-- -----------------------------------------------------------------------------
-- Resources & Bookings
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS resources (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    type        TEXT NOT NULL,
    description TEXT,
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL REFERENCES resources(id),
    user_id     UUID NOT NULL REFERENCES users(id),
    start_time  TIMESTAMPTZ NOT NULL,
    end_time    TIMESTAMPTZ NOT NULL,
    status      TEXT NOT NULL,
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Welfare
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS health_records (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id          UUID NOT NULL REFERENCES students(id),
    allergies           TEXT,
    medical_conditions  TEXT,
    required_medication TEXT,
    emergency_contact   TEXT,
    blood_group         TEXT,
    deleted_at          TIMESTAMPTZ,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS behavior_logs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id   UUID NOT NULL REFERENCES students(id),
    reported_by  UUID REFERENCES users(id),
    type         TEXT NOT NULL,
    category     TEXT,
    description  TEXT NOT NULL,
    action_taken TEXT,
    date         TIMESTAMPTZ NOT NULL,
    deleted_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_behavior_student ON behavior_logs(student_id);

-- -----------------------------------------------------------------------------
-- Portfolio
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS student_portfolios (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id  UUID NOT NULL UNIQUE REFERENCES students(id),
    bio         TEXT,
    ambition    TEXT,
    skills      TEXT,
    languages   TEXT,
    hobbies_json TEXT,
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS portfolio_achievements (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES student_portfolios(id) ON DELETE CASCADE,
    category     TEXT,
    title        TEXT NOT NULL,
    description  TEXT,
    date_earned  TIMESTAMPTZ,
    issuer       TEXT,
    deleted_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Recommendations & Interventions
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS recommendations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id          UUID NOT NULL REFERENCES students(id),
    recommended_subject UUID REFERENCES subjects(id),
    reason              TEXT,
    confidence          FLOAT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS intervention_plans (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id   UUID NOT NULL REFERENCES students(id),
    risk_score   FLOAT NOT NULL,
    reason       TEXT NOT NULL,
    action_items JSONB,
    status       TEXT NOT NULL DEFAULT 'DRAFT',
    deleted_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_interventions_student ON intervention_plans(student_id);

-- -----------------------------------------------------------------------------
-- Audit
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS audit_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id),
    user_email  TEXT,
    action      TEXT,
    entity_type TEXT,
    entity_id   TEXT,
    changes     TEXT,
    ip_address  TEXT,
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);

-- -----------------------------------------------------------------------------
-- Documents
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS documents (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id       UUID NOT NULL,
    owner_type     TEXT NOT NULL,
    category       TEXT NOT NULL,
    title          TEXT NOT NULL,
    description    TEXT,
    file_mime_type TEXT NOT NULL,
    file_size      BIGINT,
    storage_path   TEXT NOT NULL,
    uploaded_by    UUID NOT NULL REFERENCES users(id),
    deleted_at     TIMESTAMPTZ,
    uploaded_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents(owner_id);

-- -----------------------------------------------------------------------------
-- Payments (stored in public schema tenant-aware via tenant_id column)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS payment_transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       VARCHAR(255) NOT NULL,
    fiscal_record_id UUID,
    payer_id        UUID,
    amount          NUMERIC(12,4) NOT NULL,
    reference       VARCHAR(255) NOT NULL UNIQUE,
    status          VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    provider        VARCHAR(50) NOT NULL DEFAULT 'PAYSTACK',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payment_tenant ON payment_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_reference ON payment_transactions(reference);

CREATE TABLE IF NOT EXISTS payment_webhook_logs (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  VARCHAR(255) NOT NULL,
    provider   VARCHAR(50) NOT NULL,
    event      VARCHAR(100) NOT NULL,
    payload    JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tenant_subscription_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    student_count INTEGER NOT NULL,
    reference VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    provider VARCHAR(50) NOT NULL DEFAULT 'PAYSTACK',
    payer_email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhook_tenant ON payment_webhook_logs(tenant_id);

-- Migration: 000006_link_teachers_to_staff.up.sql
-- Link teachers to staff_profiles

-- Migration: 000007_update_transport_route_fee.up.sql


-- Migration: 000008_add_amount_paid_to_fiscal_records.up.sql

-- Migration: 000009_terminal_progress_report.up.sql

CREATE TABLE IF NOT EXISTS terminal_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id),
    academic_period_id UUID NOT NULL REFERENCES academic_periods(id),
    term_id UUID NOT NULL REFERENCES academic_terms(id),
    conduct TEXT,
    attitude TEXT,
    interest TEXT,
    class_teacher_remark TEXT,
    head_teacher_remark TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(student_id, academic_period_id, term_id)
);

-- Migration: 000010_add_tenant_paystack_keys.up.sql

-- Migration: 000011_add_tenant_subscription_payments.up.sql
CREATE TABLE IF NOT EXISTS public.tenant_subscription_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    student_count INTEGER NOT NULL,
    reference VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    provider VARCHAR(50) NOT NULL DEFAULT 'PAYSTACK',
    payer_email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Migration: 000012_add_scan_events.up.sql


CREATE TABLE scan_events (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    device_id VARCHAR(100) NOT NULL,
    rfid_token VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    processed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_scan_events_tenant ON scan_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scan_events_device ON scan_events(device_id);
CREATE INDEX IF NOT EXISTS idx_scan_events_rfid ON scan_events(rfid_token);

