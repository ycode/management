/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_MANAGEMENT_SUPABASE_URL: process.env.NEXT_PUBLIC_MANAGEMENT_SUPABASE_URL,
    NEXT_PUBLIC_MANAGEMENT_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_MANAGEMENT_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_CLOUD_DEPLOYMENT_URL: process.env.CLOUD_DEPLOYMENT_URL,
  },
};

module.exports = nextConfig;


