CREATE TABLE IF NOT EXISTS public.system_security_ips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    added_by VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_security_ips_ip ON public.system_security_ips(ip_address);
