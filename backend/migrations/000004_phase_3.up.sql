-- 000004_phase_3.up.sql

ALTER TABLE tenants 
ADD COLUMN nps_score INT DEFAULT 0;

CREATE TABLE telemetry_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    user_id UUID,
    event_type VARCHAR(50) NOT NULL,
    metadata JSONB DEFAULT '{}',
    ip_address VARCHAR(50),
    device VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_telemetry_events_tenant_id ON telemetry_events(tenant_id);
CREATE INDEX idx_telemetry_events_event_type ON telemetry_events(event_type);
CREATE INDEX idx_telemetry_events_created_at ON telemetry_events(created_at);
