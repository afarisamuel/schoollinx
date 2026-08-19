-- Add reset_token columns to all existing tenant schemas
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name LIKE 'tenant_%'
    LOOP
        EXECUTE format(
            'ALTER TABLE %I.users ADD COLUMN IF NOT EXISTS reset_token VARCHAR, ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMPTZ',
            r.schema_name
        );
    END LOOP;
END;

