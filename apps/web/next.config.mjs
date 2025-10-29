if (
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY
) {
  console.warn('[env-check] Missing Supabase env. Did you link apps/web/.env.local to root?');
}

const nextConfig = {
  experimental: {
    typedRoutes: true
  },
  eslint: {
    dirs: ['app', 'components', 'lib']
  }
};

export default nextConfig;
