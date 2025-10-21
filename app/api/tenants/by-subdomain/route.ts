/**
 * Get Tenant by Subdomain
 * 
 * Used by cloud deployment to look up tenant from subdomain
 */

import { NextRequest, NextResponse } from 'next/server';
import { getManagementAdmin } from '@/lib/supabase-management';

export async function GET(request: NextRequest) {
  try {
    // Verify internal API key
    const apiKey = request.headers.get('x-api-key');
    const expectedKey = process.env.INTERNAL_API_KEY;
    
    if (expectedKey && apiKey !== expectedKey) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const subdomain = request.nextUrl.searchParams.get('subdomain');
    
    if (!subdomain) {
      return NextResponse.json(
        { error: 'Subdomain parameter required' },
        { status: 400 }
      );
    }
    
    const managementAdmin = getManagementAdmin();
    
    const { data: tenant, error } = await managementAdmin
      .from('tenants')
      .select('id, status')
      .eq('subdomain', subdomain)
      .eq('status', 'active')
      .single();
    
    if (error || !tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      tenant_id: tenant.id,
    });
    
  } catch (error) {
    console.error('Subdomain lookup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


