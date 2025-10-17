import type { Database } from '@chorerights/db';

import type { SupabaseClient, User } from '@supabase/supabase-js';

type PublicClient = SupabaseClient<Database>;

const adminEmailEnv = process.env.ADMIN_EMAILS ?? '';
const adminEmailSet = new Set(
  adminEmailEnv
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0),
);

function hasAdminRoleClaim(user: User | null): boolean {
  if (!user) {
    return false;
  }

  const roleClaim =
    (user.app_metadata?.role as string | undefined) ??
    (user.user_metadata?.role as string | undefined);

  return typeof roleClaim === 'string' && roleClaim.toLowerCase() === 'admin';
}

function isAdminEmail(email?: string | null): boolean {
  if (!email) {
    return false;
  }

  return adminEmailSet.has(email.toLowerCase());
}

export async function isAdminUser(client: PublicClient, user: User | null): Promise<boolean> {
  if (!user) {
    return false;
  }

  if (isAdminEmail(user.email) || hasAdminRoleClaim(user)) {
    return true;
  }

  const { data, error } = await client
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('Failed to verify admin role', error);
    return false;
  }

  return data?.role === 'admin';
}
