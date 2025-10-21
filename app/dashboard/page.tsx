'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  status: string;
  plan: string;
  created_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [error, setError] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const email = localStorage.getItem('user_email');
    
    if (!token) {
      router.push('/');
      return;
    }

    setUserEmail(email || '');
    loadTenants(token);
  }, [router]);

  const loadTenants = async (token: string) => {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_MANAGEMENT_SUPABASE_URL || 'http://localhost:54321';
      const supabaseAnonKey = process.env.NEXT_PUBLIC_MANAGEMENT_SUPABASE_ANON_KEY || '';

      // Get user info
      const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': supabaseAnonKey,
        },
      });

      if (!userResponse.ok) {
        throw new Error('Failed to get user info');
      }

      const userData = await userResponse.json();
      const userId = userData.id;

      // Get tenants for user
      const tenantsResponse = await fetch(
        `${supabaseUrl}/rest/v1/tenants?owner_id=eq.${userId}&select=*&order=created_at.desc`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': supabaseAnonKey,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!tenantsResponse.ok) {
        throw new Error('Failed to load projects');
      }

      const tenantsData = await tenantsResponse.json();
      setTenants(tenantsData);
    } catch (err: any) {
      console.error('Failed to load tenants:', err);
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);

    const token = localStorage.getItem('auth_token');
    if (!token) return;

    try {
      const response = await fetch('/api/projects/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: projectName,
          subdomain: subdomain || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create project');
      }

      // Success! Reload tenants
      await loadTenants(token);
      setShowCreateForm(false);
      setProjectName('');
      setSubdomain('');
      
      // Show success message
      alert(`Project created! Opening builder...`);
      
      // Open builder in new tab
      window.open(data.access_url, '_blank');
      
    } catch (err: any) {
      console.error('Failed to create project:', err);
      setError(err.message || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenBuilder = async (tenant: Tenant) => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    try {
      // Generate proper SSO token via API
      const response = await fetch('/api/sso/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          tenant_id: tenant.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate SSO token');
      }

      // Construct subdomain-based URL for local testing
      // In production, this would be: https://{subdomain}.cloud.ycode.app/ycode?token=...
      const deploymentUrl = process.env.NEXT_PUBLIC_CLOUD_DEPLOYMENT_URL || 'http://localhost:3000';
      const isLocal = deploymentUrl.includes('localhost');
      
      let builderUrl;
      if (isLocal) {
        // Local: Use *.localhost domain
        const port = deploymentUrl.split(':')[2] || '3000';
        builderUrl = `http://${tenant.subdomain}.localhost:${port}/ycode?token=${data.token}`;
      } else {
        // Production: Extract base domain and use subdomain
        const urlObj = new URL(deploymentUrl);
        builderUrl = `${urlObj.protocol}//${tenant.subdomain}.${urlObj.hostname}/ycode?token=${data.token}`;
      }

      console.log('Opening builder at:', builderUrl);
      window.open(builderUrl, '_blank');
      
    } catch (err) {
      console.error('Failed to open builder:', err);
      alert('Failed to open builder. Check console for details.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_email');
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">YCode Cloud</h1>
            <p className="text-sm text-gray-600">{userEmail}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-600 hover:text-gray-900 text-sm"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Your Projects
          </h2>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
          >
            + Create Project
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Create Form Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">Create New Project</h3>
              
              <form onSubmit={handleCreateProject} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="My Awesome Site"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subdomain (optional)
                  </label>
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={subdomain}
                      onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="my-site"
                      pattern="[a-z0-9-]+"
                    />
                    <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md text-sm text-gray-600">
                      .cloud.ycode.app
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty to auto-generate from project name
                  </p>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setProjectName('');
                      setSubdomain('');
                      setError('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-md"
                  >
                    {creating ? 'Creating...' : 'Create Project'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Projects Grid */}
        {tenants.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600 mb-4">No projects yet</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Create your first project →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tenants.map((tenant) => (
              <div
                key={tenant.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {tenant.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {tenant.subdomain}.cloud.ycode.app
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${
                    tenant.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {tenant.status}
                  </span>
                </div>

                <div className="mb-4 text-sm text-gray-500">
                  Plan: <span className="capitalize">{tenant.plan}</span>
                </div>

                <button
                  onClick={() => handleOpenBuilder(tenant)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition"
                >
                  Open Builder →
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Local Testing Mode</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Management App runs on localhost:3001</li>
            <li>• Cloud Deployment runs on localhost:3000</li>
            <li>• Make sure both local Supabase instances are running</li>
            <li>• Make sure cloud deployment is running in terminal</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

