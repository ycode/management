/**
 * Supabase Client - Shared Tenant Database
 * 
 * Connects to the shared Supabase instance that stores all tenant data.
 * This is the same database used by the cloud deployment.
 * 
 * Use this to:
 * - Initialize new tenant data
 * - Check tenant usage
 * - Perform admin operations
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.TENANT_SUPABASE_URL!;
const supabaseServiceKey = process.env.TENANT_SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Tenant Supabase credentials not configured');
}

/**
 * Get Supabase admin client for tenant database
 * Always use service role key as management app needs full access
 */
export function getTenantAdmin(): SupabaseClient {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Initialize tenant data in shared database
 * Called when provisioning a new tenant
 */
export async function initializeTenantData(tenantId: string): Promise<void> {
  const client = getTenantAdmin();
  
  try {
    // Create default home page for tenant
    const { data: page, error: pageError } = await client
      .from('pages')
      .insert({
        tenant_id: tenantId,
        slug: 'home',
        title: 'Home',
        status: 'draft',
      })
      .select()
      .single();
    
    if (pageError) {
      console.error('Failed to create default page:', pageError);
      throw pageError;
    }
    
    if (!page) {
      throw new Error('Failed to retrieve created page');
    }
    
    // Create draft version for home page
    const { error: versionError } = await client
      .from('page_versions')
      .insert({
        tenant_id: tenantId,
        page_id: page.id,
        layers: [
          {
            id: 'root',
            type: 'container',
            classes: 'min-h-screen flex items-center justify-center bg-gray-50',
            children: [
              {
                id: 'welcome',
                type: 'heading',
                classes: 'text-4xl font-bold text-gray-900',
                content: 'Welcome to Your Site!'
              }
            ]
          }
        ],
        is_published: false
      });
    
    if (versionError) {
      console.error('Failed to create default page version:', versionError);
      throw versionError;
    }
    
    console.log(`Initialized data for tenant: ${tenantId}`);
  } catch (error) {
    console.error('Failed to initialize tenant data:', error);
    throw error;
  }
}

/**
 * Get tenant usage statistics
 */
export async function getTenantUsage(tenantId: string): Promise<{
  pages: number;
  assets: number;
  storage_mb: number;
}> {
  const client = getTenantAdmin();
  
  // Set tenant context
  await client.rpc('set_config', {
    setting: 'app.tenant_id',
    value: tenantId,
    is_local: true
  });
  
  // Count pages
  const { count: pageCount } = await client
    .from('pages')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);
  
  // Count assets
  const { count: assetCount } = await client
    .from('assets')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);
  
  // Calculate storage
  const { data: assets } = await client
    .from('assets')
    .select('size')
    .eq('tenant_id', tenantId);
  
  const storageBytes = assets?.reduce((total, asset) => {
    return total + (asset.size || 0);
  }, 0) || 0;
  
  const storageMB = Math.round(storageBytes / (1024 * 1024));
  
  return {
    pages: pageCount || 0,
    assets: assetCount || 0,
    storage_mb: storageMB
  };
}

/**
 * Delete all tenant data
 * Called when tenant is cancelled
 */
export async function deleteTenantData(tenantId: string): Promise<void> {
  const client = getTenantAdmin();
  
  try {
    // Set tenant context
    await client.rpc('set_config', {
      setting: 'app.tenant_id',
      value: tenantId,
      is_local: true
    });
    
    // Delete page versions
    await client
      .from('page_versions')
      .delete()
      .eq('tenant_id', tenantId);
    
    // Delete pages
    await client
      .from('pages')
      .delete()
      .eq('tenant_id', tenantId);
    
    // Delete assets
    await client
      .from('assets')
      .delete()
      .eq('tenant_id', tenantId);
    
    // Delete settings
    await client
      .from('settings')
      .delete()
      .eq('tenant_id', tenantId);
    
    // Delete from storage
    const { data: files } = await client.storage
      .from('assets')
      .list(tenantId);
    
    if (files && files.length > 0) {
      const filePaths = files.map(f => `${tenantId}/${f.name}`);
      await client.storage
        .from('assets')
        .remove(filePaths);
    }
    
    console.log(`Deleted all data for tenant: ${tenantId}`);
  } catch (error) {
    console.error('Failed to delete tenant data:', error);
    throw error;
  }
}

/**
 * Check if tenant exists in database
 */
export async function tenantExists(tenantId: string): Promise<boolean> {
  const client = getTenantAdmin();
  
  const { count } = await client
    .from('pages')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .limit(1);
  
  return (count || 0) > 0;
}

