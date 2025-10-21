/**
 * SSO Token Validation API
 * 
 * Called by the cloud deployment to validate SSO tokens.
 * Returns tenant_id and user_id if token is valid.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateSSOToken } from '@/lib/sso-tokens';
import { getManagementAdmin } from '@/lib/supabase-management';

/**
 * POST /api/sso/validate
 * 
 * Validate an SSO token
 * 
 * Request body:
 * {
 *   "token": "jwt-token"
 * }
 * 
 * Response:
 * {
 *   "tenant_id": "uuid",
 *   "user_id": "uuid",
 *   "email": "user@example.com"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token required' },
        { status: 400 }
      );
    }
    
    // Validate JWT token
    const payload = validateSSOToken(token);
    
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
    // Verify tenant is active
    const managementAdmin = getManagementAdmin();
    const { data: tenant, error: tenantError } = await managementAdmin
      .from('tenants')
      .select('id, status, plan')
      .eq('id', payload.tenant_id)
      .single();
    
    if (tenantError || !tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }
    
    if (tenant.status !== 'active') {
      return NextResponse.json(
        { error: `Tenant is ${tenant.status}` },
        { status: 403 }
      );
    }
    
    // Verify user has access to tenant
    const { data: tenantUser, error: accessError } = await managementAdmin
      .from('tenant_users')
      .select('role')
      .eq('tenant_id', payload.tenant_id)
      .eq('user_id', payload.user_id)
      .single();
    
    if (accessError || !tenantUser) {
      return NextResponse.json(
        { error: 'User does not have access to this tenant' },
        { status: 403 }
      );
    }
    
    // Return validated payload
    return NextResponse.json({
      tenant_id: payload.tenant_id,
      user_id: payload.user_id,
      email: payload.email,
      role: tenantUser.role,
      plan: tenant.plan
    });
    
  } catch (error) {
    console.error('SSO validation error:', error);
    return NextResponse.json(
      { error: 'Validation failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sso/validate
 * 
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'sso-validation'
  });
}

