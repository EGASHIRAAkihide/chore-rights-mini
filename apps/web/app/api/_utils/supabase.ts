import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

type SupabaseClientResult = {
  supabase: ReturnType<typeof createServerClient<any>>;
  response: NextResponse;
};

export function createSupabaseServerClient(request: NextRequest): SupabaseClientResult {
  const response = NextResponse.next();

  const supabase = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          response.cookies.set({
            name,
            value: '',
            ...options,
            maxAge: 0,
          });
        },
      },
    },
  );

  return { supabase, response };
}

export function applySupabaseCookies(target: NextResponse, source: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });
}

export async function ensureSupabaseSession(
  request: NextRequest,
  supabase: ReturnType<typeof createServerClient<any>>,
) {
  const accessToken = request.cookies.get('sb-access-token')?.value;
  const refreshToken = request.cookies.get('sb-refresh-token')?.value;

  if (accessToken && refreshToken) {
    await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  }
}

export function createSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Supabase service role client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export const createServerSupabaseClient = createSupabaseServerClient;
export const createAdminSupabaseClient = createSupabaseServiceClient;
