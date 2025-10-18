import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { createServerClient } from '@supabase/ssr';

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
