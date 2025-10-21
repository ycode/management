/**
 * Generate SSO Token API
 * 
 * Generate a new SSO token for accessing the cloud deployment
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateSSOToken } from '@/lib/sso-tokens';
import { getManagementAdmin } from '@/lib/supabase-management';

/**
 * POST /api/sso/generate
 * 
 * Generate SSO token for tenant access
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Decode JWT to get user info (works with local Supabase)
    const base64Payload = token.split('.')[1];
    if (!base64Payload) {
      return NextResponse.json(
        { error: 'Invalid token format' },
        { status: 401 }
      );
    }
    
    const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
    const userId = payload.sub;
    const userEmail = payload.email;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { tenant_id } = body;
    
    if (!tenant_id) {
      return NextResponse.json(
        { error: 'tenant_id required' },
        { status: 400 }
      );
    }
    
    const managementAdmin = getManagementAdmin();
    
    // Verify user has access to this tenant
    const { data: tenantUser, error: accessError } = await managementAdmin
      .from('tenant_users')
      .select('role')
      .eq('tenant_id', tenant_id)
      .eq('user_id', userId)
      .single();
    
    if (accessError || !tenantUser) {
      console.error('Access check failed:', accessError);
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    // Generate SSO token
    const ssoToken = generateSSOToken({
      tenant_id,
      user_id: userId,
      email: userEmail || 'user@ycode.app',
    });
    
    const deploymentUrl = process.env.CLOUD_DEPLOYMENT_URL || 'http://localhost:3000';
    
    return NextResponse.json({
      token: ssoToken,
      access_url: `${deploymentUrl}?token=${ssoToken}`,
    });
    
  } catch (error) {
    console.error('SSO generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate token', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

