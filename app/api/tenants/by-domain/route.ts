/**
 * Get Tenant by Custom Domain
 * 
 * Used by cloud deployment to look up tenant from custom domain
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
    
    const domain = request.nextUrl.searchParams.get('domain');
    
    if (!domain) {
      return NextResponse.json(
        { error: 'Domain parameter required' },
        { status: 400 }
      );
    }
    
    const managementAdmin = getManagementAdmin();
    
    const { data: tenant, error } = await managementAdmin
      .from('tenants')
      .select('id, status')
      .eq('custom_domain', domain)
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
    console.error('Custom domain lookup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


