import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { requireAdmin } from '../../_utils/admin';
import { createProblemResponse } from '../../_utils/problem';
import { applySupabaseCookies, createSupabaseServerClient } from '../../_utils/supabase';

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const guard = await requireAdmin(request);
  if (guard) {
    return guard;
  }

  const { supabase, response: supabaseResponse } = createSupabaseServerClient(request);

  const { error } = await supabase.rpc('aggregate_kpi_daily');
  if (error) {
    console.error('Failed to run aggregate_kpi_daily RPC', error);
    const problem = createProblemResponse(500, 'Internal Server Error', {
      detail: 'Unable to refresh KPI metrics.',
    });
    applySupabaseCookies(problem, supabaseResponse);
    return problem;
  }

  const response = NextResponse.json({ ok: true });
  applySupabaseCookies(response, supabaseResponse);
  return response;
}
