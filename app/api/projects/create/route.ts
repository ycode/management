/**
 * Create Project (Tenant) API
 * 
 * Provisions a new tenant in the system:
 * 1. Create tenant record in management database
 * 2. Initialize tenant data in shared database
 * 3. Generate SSO token for access
 */

import { NextRequest, NextResponse } from 'next/server';
import { getManagementAdmin } from '@/lib/supabase-management';
import { initializeTenantData } from '@/lib/supabase-tenants';
import { generateAccessURL } from '@/lib/sso-tokens';

/**
 * POST /api/projects/create
 * 
 * Create a new tenant project
 * 
 * Request body:
 * {
 *   "name": "My Project",
 *   "subdomain": "my-project" // Optional, auto-generated if not provided
 * }
 * 
 * Response:
 * {
 *   "tenant": {...},
 *   "access_url": "https://cloud.ycode.app?token=..."
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from session
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
    const userEmail = payload.email || 'user@ycode.app';
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }
    
    const managementAdmin = getManagementAdmin();
    
    // Parse request body
    const body = await request.json();
    const { name, subdomain: requestedSubdomain } = body;
    
    if (!name) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }
    
    // Generate subdomain if not provided
    const subdomain = requestedSubdomain || 
      name.toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    
    // Check if subdomain is available
    const { data: existingTenant } = await managementAdmin
      .from('tenants')
      .select('id')
      .eq('subdomain', subdomain)
      .single();
    
    if (existingTenant) {
      return NextResponse.json(
        { error: 'Subdomain already taken' },
        { status: 409 }
      );
    }
    
    // Create tenant record
    const { data: tenant, error: tenantError } = await managementAdmin
      .from('tenants')
      .insert({
        name,
        subdomain,
        owner_id: userId,
        status: 'active',
        plan: 'free'
      })
      .select()
      .single();
    
    if (tenantError) {
      console.error('Failed to create tenant:', tenantError);
      return NextResponse.json(
        { error: 'Failed to create project' },
        { status: 500 }
      );
    }
    
    // Create tenant-user relationship
    await managementAdmin
      .from('tenant_users')
      .insert({
        tenant_id: tenant.id,
        user_id: userId,
        role: 'owner'
      });
    
    // Initialize tenant data in shared database
    try {
      await initializeTenantData(tenant.id);
    } catch (error) {
      console.error('Failed to initialize tenant data:', error);
      
      // Rollback: Delete tenant record
      await managementAdmin
        .from('tenants')
        .delete()
        .eq('id', tenant.id);
      
      return NextResponse.json(
        { error: 'Failed to initialize project data' },
        { status: 500 }
      );
    }
    
    // Generate access URL with SSO token
    const accessUrl = generateAccessURL(tenant.id, userId, userEmail);
    
    // Log tenant creation
    console.log(`Created tenant: ${tenant.id} (${tenant.name}) for user: ${userId}`);
    
    return NextResponse.json({
      tenant,
      access_url: accessUrl
    }, { status: 201 });
    
  } catch (error) {
    console.error('Project creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

