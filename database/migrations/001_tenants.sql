-- Tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE NOT NULL,
  custom_domain TEXT UNIQUE,
  owner_id UUID NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tenants_owner ON tenants(owner_id);
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_custom_domain ON tenants(custom_domain) WHERE custom_domain IS NOT NULL;

-- Tenant users table
CREATE TABLE IF NOT EXISTS tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'editor')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

CREATE INDEX idx_tenant_users_tenant ON tenant_users(tenant_id);
CREATE INDEX idx_tenant_users_user ON tenant_users(user_id);
