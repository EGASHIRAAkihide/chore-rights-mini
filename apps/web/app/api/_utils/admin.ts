import type { NextRequest } from 'next/server';

import { createProblemResponse } from './problem';
import { applySupabaseCookies, createSupabaseServerClient, ensureSupabaseSession } from './supabase';

function getAdminAllowlist(): string[] {
  const sources = [process.env.ADMIN_EMAILS, process.env.ADMIN_ALLOWLIST];
  const entries = sources
    .filter((value): value is string => Boolean(value && value.length > 0))
    .flatMap((value) => value.split(','))
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0);
  return Array.from(new Set(entries));
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) {
    return false;
  }
  return getAdminAllowlist().includes(email.toLowerCase());
}

function hasServiceRoleAccess(request: NextRequest): boolean {
  const headerKey = request.headers.get('x-service-role-key');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(serviceRoleKey && headerKey && headerKey === serviceRoleKey);
}

function hasTestAdminBypass(request: NextRequest): boolean {
  return (
    process.env.ENABLE_TEST_HELPERS === '1' && (request.headers.get('x-test-admin') ?? '').trim() === '1'
  );
}

export async function requireAdmin(request: NextRequest) {
  if (hasServiceRoleAccess(request) || hasTestAdminBypass(request)) {
    return null;
  }

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
