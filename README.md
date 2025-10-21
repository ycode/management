# YCode Cloud Management App

The management app for YCode Cloud - handles billing, tenant provisioning, SSO, and updates.

## Overview

This is a standalone Next.js application that manages the cloud offering:

- **User Management** - Sign up, login, account management
- **Tenant Provisioning** - Create and manage projects (tenants)
- **SSO Integration** - Single sign-on to cloud deployment
- **Billing** - Stripe integration for subscriptions
- **Update Management** - Control when to deploy upstream updates
- **Analytics** - Usage tracking and metrics

## Architecture

```
Management App (this)  ←→  Cloud Deployment (ycode-cloud-deployment)
        ↓                              ↓
Management Supabase           Shared Tenant Supabase
(users, tenants, billing)     (all tenant content)
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Management Database

Create a Supabase project for management data:

```bash
# Run migrations in database/migrations/
# These create tables for:
# - users (management app users)
# - tenants (customer projects)
# - tenant_users (access control)
# - subscriptions (Stripe billing)
# - update_logs (deployment tracking)
```

### 3. Set Up Tenant Database

This is the shared Supabase instance where all tenant content lives.

```bash
# Create separate Supabase project
# Run base migrations from ycode-4/database/supabase/
# Run cloud migrations from ycode-cloud-deployment/cloud-overlay/database/migrations/
```

### 4. Configure Environment

```bash
cp env.example .env.local
```

Edit `.env.local`:

```bash
# Management Database
NEXT_PUBLIC_MANAGEMENT_SUPABASE_URL=https://management.supabase.co
NEXT_PUBLIC_MANAGEMENT_SUPABASE_ANON_KEY=...
MANAGEMENT_SUPABASE_SERVICE_ROLE_KEY=...

# Shared Tenant Database
TENANT_SUPABASE_URL=https://tenants.supabase.co
TENANT_SUPABASE_SERVICE_ROLE_KEY=...

# SSO Secret (shared with cloud deployment)
SSO_SECRET=your-shared-secret-here

# Cloud Deployment URL
CLOUD_DEPLOYMENT_URL=https://cloud.ycode.app

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# GitHub (for update checking)
GITHUB_TOKEN=ghp_...
GITHUB_REPO_OWNER=yourorg
GITHUB_REPO_NAME=ycode-4
```

### 5. Set Up Stripe

1. Create Stripe account
2. Create products and pricing
3. Set up webhook endpoint: `https://manage.ycode.app/api/stripe/webhooks`
4. Add webhook secret to environment

### 6. Run Development Server

```bash
npm run dev
```

Runs on http://localhost:3001

## Directory Structure

```
app/
├── dashboard/               # User dashboard
│   └── page.tsx
├── projects/
│   ├── new/                # Create project
│   │   └── page.tsx
│   └── [id]/
│       ├── settings/       # Project settings
│       └── billing/        # Billing management
├── api/
│   ├── projects/
│   │   ├── create/         # POST - Create tenant
│   │   └── [id]/           # GET/PUT/DELETE - Manage tenant
│   ├── sso/
│   │   ├── generate/       # Generate SSO token
│   │   └── validate/       # Validate SSO token (called by deployment)
│   ├── tenants/
│   │   └── [id]/
│   │       ├── status/     # Check tenant status
│   │       └── limits/     # Get tenant limits
│   └── stripe/
│       └── webhooks/       # Stripe webhook handler
├── admin/
│   └── updates/
│       └── [id]/           # Update approval dashboard
└── lib/
    ├── sso-tokens.ts       # JWT token generation/validation
    ├── supabase-management.ts  # Management DB client
    └── supabase-tenants.ts     # Tenant DB client
```

## Key Features

### Tenant Provisioning

When a user creates a project:

1. Create tenant record in management database
2. Initialize tenant data in shared database (default pages, etc.)
3. Generate SSO token
4. Return access URL with token

See: `app/api/projects/create/route.ts`

### SSO Flow

1. User clicks "Open Builder" in management app
2. Generate SSO token with tenant_id and user_id
3. Redirect to `https://cloud.ycode.app?token=...`
4. Cloud deployment validates token with management app
5. Cloud deployment creates session and sets tenant context
6. User can now edit their site

See: `lib/sso-tokens.ts`, `app/api/sso/validate/route.ts`

### Billing Integration

1. User subscribes via Stripe Checkout
2. Webhook receives subscription events
3. Update tenant status and plan
4. Cloud deployment checks tenant status before operations

See: `app/api/stripe/webhooks/route.ts`

### Update Management

1. Cron job checks GitHub for new releases
2. Create update proposal in database
3. Admin reviews and tests on staging
4. Admin approves deployment
5. Trigger Vercel deployment via API
6. Monitor rollout and rollback if needed

See: `app/admin/updates/[id]/page.tsx`

## API Endpoints

### Projects

- `POST /api/projects/create` - Create new tenant
- `GET /api/projects` - List user's projects
- `GET /api/projects/[id]` - Get project details
- `PUT /api/projects/[id]` - Update project
- `DELETE /api/projects/[id]` - Delete project

### SSO

- `POST /api/sso/generate` - Generate SSO token
- `POST /api/sso/validate` - Validate SSO token (called by deployment)

### Tenants

- `GET /api/tenants/[id]/status` - Check if tenant is active
- `GET /api/tenants/[id]/limits` - Get tenant usage limits
- `GET /api/tenants/[id]/usage` - Get tenant usage statistics

### Stripe

- `POST /api/stripe/webhooks` - Handle Stripe events
- `POST /api/stripe/checkout` - Create checkout session
- `POST /api/stripe/portal` - Create customer portal session

### Updates

- `POST /api/admin/updates/check` - Check for new releases
- `GET /api/admin/updates` - List updates
- `POST /api/admin/updates/deploy` - Deploy approved update
- `POST /api/admin/deployments/rollback` - Rollback deployment

## Database Schema

### Management Database

**tenants**
```sql
- id: UUID (PK)
- name: TEXT
- subdomain: TEXT (unique)
- owner_id: UUID (FK to users)
- status: ENUM (active, suspended, cancelled)
- plan: ENUM (free, pro, enterprise)
- stripe_customer_id: TEXT
- stripe_subscription_id: TEXT
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

**tenant_users**
```sql
- id: UUID (PK)
- tenant_id: UUID (FK to tenants)
- user_id: UUID (FK to users)
- role: ENUM (owner, admin, editor)
- created_at: TIMESTAMP
```

**subscriptions**
```sql
- id: UUID (PK)
- tenant_id: UUID (FK to tenants)
- stripe_subscription_id: TEXT
- status: TEXT
- plan: TEXT
- current_period_start: TIMESTAMP
- current_period_end: TIMESTAMP
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

**update_logs**
```sql
- id: UUID (PK)
- from_version: TEXT
- to_version: TEXT
- status: ENUM (pending_review, testing, approved, deployed, rolled_back)
- tested_at: TIMESTAMP
- deployed_at: TIMESTAMP
- rolled_back_at: TIMESTAMP
- release_notes: TEXT
- created_at: TIMESTAMP
```

## Deployment

### Deploy to Vercel

```bash
vercel --prod
```

### Environment Variables

Add all variables from `.env.local` to Vercel project settings.

### Custom Domain

Set domain to: `manage.ycode.app`

### Cron Jobs

Add to `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/admin/updates/check",
    "schedule": "0 */6 * * *"
  }]
}
```

## Development

### Local Testing

```bash
# Terminal 1: Run management app
npm run dev

# Terminal 2: Run cloud deployment
cd ../ycode-cloud-deployment
npm run dev:cloud

# Terminal 3: Local Supabase (optional)
npx supabase start
```

### Create Test Tenant

```bash
curl -X POST http://localhost:3001/api/projects/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <user-token>" \
  -d '{
    "name": "Test Project",
    "subdomain": "test"
  }'
```

### Test SSO Flow

```bash
# Get SSO token from create response
# Visit: http://localhost:3000?token=<sso-token>
```

## Monitoring

### Key Metrics

- Tenant count and growth
- Active subscriptions
- Churn rate
- Usage per tenant (pages, assets, storage)
- Error rates
- API response times

### Alerts

Set up alerts for:
- Stripe webhook failures
- Tenant provisioning errors
- High error rates
- Failed deployments

## Security

- All SSO tokens expire in 15 minutes
- Tenant status checked on every validation
- Service role keys never exposed to client
- CORS configured for cloud deployment only
- Rate limiting on API endpoints
- Stripe webhook signature verification

## Support

### Troubleshooting

**Tenant provisioning fails:**
- Check tenant database connection
- Verify migrations ran successfully
- Check Supabase logs

**SSO validation fails:**
- Verify SSO_SECRET matches in both apps
- Check token expiration
- Verify tenant is active

**Stripe webhook fails:**
- Verify webhook secret
- Check Stripe dashboard for errors
- Review webhook logs

## Next Steps

1. Build frontend UI for dashboard
2. Implement billing pages
3. Add update management UI
4. Set up monitoring and alerts
5. Create customer documentation
6. Launch marketing site

