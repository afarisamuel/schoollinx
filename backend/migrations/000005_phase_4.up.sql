-- 000005_phase_4.up.sql

ALTER TABLE tenants 
ADD COLUMN require_2fa BOOLEAN DEFAULT FALSE,
ADD COLUMN dpa_signed_at TIMESTAMP WITH TIME ZONE;

CREATE TABLE system_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID,
    target_id UUID,
    action VARCHAR(50) NOT NULL,
    details TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_sysaudit_admin_id ON system_audit_logs(admin_id);
CREATE INDEX idx_sysaudit_target_id ON system_audit_logs(target_id);

CREATE TABLE whitelisted_ips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(255),
    added_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
