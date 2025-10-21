#!/bin/bash

# Helper script to create .env.local with Supabase credentials

echo "🔧 YCode Cloud - Environment Setup Helper"
echo ""
echo "This script will help you create .env.local with your local Supabase credentials"
echo ""

# Check if .env.local already exists
if [ -f .env.local ]; then
    echo "⚠️  .env.local already exists!"
    read -p "Do you want to overwrite it? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 0
    fi
fi

echo "📝 Please enter your Supabase credentials:"
echo "(Run 'supabase status' in each Supabase directory to get these)"
echo ""

# Management DB
echo "--- Management Database (port 54321) ---"
read -p "Management API URL (default: http://localhost:54321): " MGMT_URL
MGMT_URL=${MGMT_URL:-http://localhost:54321}

read -p "Management anon key: " MGMT_ANON

read -p "Management service_role key: " MGMT_SERVICE

echo ""

# Tenant DB
echo "--- Tenant Database (port 54322) ---"
read -p "Tenant API URL (default: http://localhost:54322): " TENANT_URL
TENANT_URL=${TENANT_URL:-http://localhost:54322}

read -p "Tenant service_role key: " TENANT_SERVICE

echo ""

# Create .env.local
cat > .env.local << EOF
# Management Database
NEXT_PUBLIC_MANAGEMENT_SUPABASE_URL=$MGMT_URL
NEXT_PUBLIC_MANAGEMENT_SUPABASE_ANON_KEY=$MGMT_ANON
MANAGEMENT_SUPABASE_SERVICE_ROLE_KEY=$MGMT_SERVICE

# Tenant Database
TENANT_SUPABASE_URL=$TENANT_URL
TENANT_SUPABASE_SERVICE_ROLE_KEY=$TENANT_SERVICE

# SSO Secret (must match cloud deployment!)
SSO_SECRET=local-testing-secret-key-123

# Cloud Deployment URL
CLOUD_DEPLOYMENT_URL=http://localhost:3000

# Internal API key
INTERNAL_API_KEY=local-test-api-key
EOF

echo ""
echo "✅ .env.local created successfully!"
echo ""
echo "Next steps:"
echo "1. Run: npm install"
echo "2. Run: npm run dev"
echo "3. Visit: http://localhost:3001"
echo ""


