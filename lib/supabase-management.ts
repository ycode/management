/**
 * Supabase Client - Management Database
 * 
 * Connects to the management Supabase instance that stores:
 * - Management app users
 * - Tenant records
 * - Subscriptions and billing
 * - Update logs
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_MANAGEMENT_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_MANAGEMENT_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.MANAGEMENT_SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Management Supabase credentials not configured');
}

/**
 * Client-side Supabase client
 * Use in React components and client-side code
 */
export const supabaseManagement = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/**
 * Server-side Supabase client with service role key
 * Use in API routes and server-side functions
 */
export function getManagementAdmin() {
  if (!supabaseServiceKey) {
    throw new Error('Management service role key not configured');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Database Types
 */
export interface ManagementUser {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  owner_id: string;
  status: 'active' | 'suspended' | 'cancelled';
  plan: 'free' | 'pro' | 'enterprise';
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TenantUser {
  id: string;
  tenant_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'editor';
  created_at: string;
}

export interface Subscription {
  id: string;
  tenant_id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  status: string;
  plan: string;
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateLog {
  id: string;
  from_version: string;
  to_version: string;
  status: 'pending_review' | 'testing' | 'approved' | 'deployed' | 'rolled_back';
  tested_at: string | null;
  deployed_at: string | null;
  rolled_back_at: string | null;
  release_notes: string;
  created_at: string;
}

