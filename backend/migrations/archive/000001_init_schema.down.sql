-- Migration: 000012_add_scan_events.down.sql
DROP TABLE IF EXISTS scan_events;


-- Migration: 000011_add_tenant_subscription_payments.down.sql
DROP TABLE IF EXISTS public.tenant_subscription_payments;


-- Migration: 000010_add_tenant_paystack_keys.down.sql
ALTER TABLE public.tenants DROP COLUMN IF EXISTS paystack_public_key;
ALTER TABLE public.tenants DROP COLUMN IF EXISTS paystack_secret_key;


-- Migration: 000009_terminal_progress_report.down.sql
DROP TABLE IF EXISTS terminal_evaluations;

ALTER TABLE tenants 
DROP COLUMN IF EXISTS address,
DROP COLUMN IF EXISTS contact_numbers,
DROP COLUMN IF EXISTS email,
DROP COLUMN IF EXISTS logo_url,
DROP COLUMN IF EXISTS class_score_weight,
DROP COLUMN IF EXISTS exam_score_weight;


-- Migration: 000008_add_amount_paid_to_fiscal_records.down.sql
ALTER TABLE fiscal_records DROP COLUMN IF EXISTS amount_paid;


-- Migration: 000007_update_transport_route_fee.down.sql
BEGIN;

DO $$
BEGIN
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_schema = current_schema() AND table_name='transport_routes' AND column_name='daily_fee') THEN
    ALTER TABLE transport_routes RENAME COLUMN daily_fee TO term_fee;
  END IF;
END $$;

COMMIT;


-- Migration: 000006_link_teachers_to_staff.down.sql
-- Remove staff_profile_id from teachers
ALTER TABLE teachers DROP COLUMN IF EXISTS staff_profile_id;


-- Migration: 000003_baseline_full_schema.down.sql
-- =============================================================================
-- 000003_baseline_full_schema.down.sql
-- Rolls back all tables created in the baseline.
-- =============================================================================

DROP TABLE IF EXISTS payment_webhook_logs CASCADE;
DROP TABLE IF EXISTS payment_transactions CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS intervention_plans CASCADE;
DROP TABLE IF EXISTS recommendations CASCADE;
DROP TABLE IF EXISTS portfolio_achievements CASCADE;
DROP TABLE IF EXISTS student_portfolios CASCADE;
DROP TABLE IF EXISTS behavior_logs CASCADE;
DROP TABLE IF EXISTS health_records CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS resources CASCADE;
DROP TABLE IF EXISTS room_bookings CASCADE;
DROP TABLE IF EXISTS visitor_logs CASCADE;
DROP TABLE IF EXISTS inventory_items CASCADE;
DROP TABLE IF EXISTS canteen_subscriptions CASCADE;
DROP TABLE IF EXISTS meal_plans CASCADE;
DROP TABLE IF EXISTS bus_assignments CASCADE;
DROP TABLE IF EXISTS transport_routes CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS club_members CASCADE;
DROP TABLE IF EXISTS clubs CASCADE;
DROP TABLE IF EXISTS library_loans CASCADE;
DROP TABLE IF EXISTS library_books CASCADE;
DROP TABLE IF EXISTS professional_developments CASCADE;
DROP TABLE IF EXISTS performance_reviews CASCADE;
DROP TABLE IF EXISTS tax_brackets CASCADE;
DROP TABLE IF EXISTS allowance_types CASCADE;
DROP TABLE IF EXISTS deduction_types CASCADE;
DROP TABLE IF EXISTS staff_attendances CASCADE;
DROP TABLE IF EXISTS leave_balances CASCADE;
DROP TABLE IF EXISTS leave_requests CASCADE;
DROP TABLE IF EXISTS payroll_records CASCADE;
DROP TABLE IF EXISTS staff_profiles CASCADE;
DROP TABLE IF EXISTS daily_bills CASCADE;
DROP TABLE IF EXISTS donations CASCADE;
DROP TABLE IF EXISTS expense_claims CASCADE;
DROP TABLE IF EXISTS expenditures CASCADE;
DROP TABLE IF EXISTS budgets CASCADE;
DROP TABLE IF EXISTS wallet_transactions CASCADE;
DROP TABLE IF EXISTS fee_structures CASCADE;
DROP TABLE IF EXISTS fiscal_records CASCADE;
DROP TABLE IF EXISTS meeting_bookings CASCADE;
DROP TABLE IF EXISTS meeting_slots CASCADE;
DROP TABLE IF EXISTS reminders CASCADE;
DROP TABLE IF EXISTS notices CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS campaign_logs CASCADE;
DROP TABLE IF EXISTS campaigns CASCADE;
DROP TABLE IF EXISTS invigilation_duties CASCADE;
DROP TABLE IF EXISTS exam_sessions CASCADE;
DROP TABLE IF EXISTS exam_results CASCADE;
DROP TABLE IF EXISTS exam_schedules CASCADE;
DROP TABLE IF EXISTS exams CASCADE;
DROP TABLE IF EXISTS academic_insights CASCADE;
DROP TABLE IF EXISTS homeworks CASCADE;
DROP TABLE IF EXISTS timetable_entries CASCADE;
DROP TABLE IF EXISTS academic_assignments CASCADE;
DROP TABLE IF EXISTS teacher_class_assignments CASCADE;
DROP TABLE IF EXISTS scan_events CASCADE;
DROP TABLE IF EXISTS attendances CASCADE;
DROP TABLE IF EXISTS class_term_locks CASCADE;
DROP TABLE IF EXISTS grade_logs CASCADE;
DROP TABLE IF EXISTS grade_weights CASCADE;
DROP TABLE IF EXISTS grades CASCADE;
DROP TABLE IF EXISTS academic_terms CASCADE;
DROP TABLE IF EXISTS academic_periods CASCADE;
DROP TABLE IF EXISTS alumni_profiles CASCADE;
DROP TABLE IF EXISTS student_guardians CASCADE;
DROP TABLE IF EXISTS guardians CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS teacher_subjects CASCADE;
DROP TABLE IF EXISTS teachers CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS scholastic_levels CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Global tables
DROP TABLE IF EXISTS revoked_tokens CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;


