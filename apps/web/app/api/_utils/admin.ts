import type { NextRequest } from 'next/server';

import { createProblemResponse } from './problem';
import { applySupabaseCookies, createSupabaseServerClient, ensureSupabaseSession } from './supabase';

export function isAdminEmail(email?: string | null): boolean {
  if (!email) {
    return false;
  }

  const env = process.env.ADMIN_EMAILS;
  if (!env) {
    return false;
  }

  return env
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0)
    .includes(email.toLowerCase());
}

export async function requireAdmin(request: NextRequest) {
  const { supabase, response: supabaseResponse } = createSupabaseServerClient(request);
  await ensureSupabaseSession(request, supabase);

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    const problem = createProblemResponse(401, 'Unauthorized', {
      detail: 'Authentication required.',
    });
    applySupabaseCookies(problem, supabaseResponse);
    return problem;
  }

  if (!isAdminEmail(authData.user.email)) {
    const problem = createProblemResponse(403, 'Forbidden', {
      detail: 'Administrator access required.',
    });
    applySupabaseCookies(problem, supabaseResponse);
    return problem;
  }

  return null;
}
