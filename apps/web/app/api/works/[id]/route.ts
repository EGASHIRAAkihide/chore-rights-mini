import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

import { z } from 'zod';

import { createProblemResponse } from '../../_utils/problem';
import { applySupabaseCookies, createSupabaseServerClient } from '../../_utils/supabase';

const paramsSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
});

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { supabase, response: supabaseResponse } = createSupabaseServerClient(request);

  const { success, data, error } = paramsSchema.safeParse(params);
  if (!success) {
    const detail = error.issues[0]?.message ?? 'Invalid identifier.';
    const problem = createProblemResponse(400, 'Bad Request', { detail });
    applySupabaseCookies(problem, supabaseResponse);
    return problem;
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    const problem = createProblemResponse(401, 'Unauthorized', {
      detail: 'Authentication required.',
    });
    applySupabaseCookies(problem, supabaseResponse);
    return problem;
  }

  const { data: work, error: fetchError } = await supabase
    .from('works')
    .select('id,title,icc_code,owner_id,created_at')
    .eq('id', data.id)
    .maybeSingle();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      const problem = createProblemResponse(404, 'Not Found', { detail: 'Work not found.' });
      applySupabaseCookies(problem, supabaseResponse);
      return problem;
    }

    console.error('Failed to fetch work', fetchError);
    const problem = createProblemResponse(500, 'Internal Server Error', {
      detail: 'Unable to fetch work record.',
    });
    applySupabaseCookies(problem, supabaseResponse);
    return problem;
  }

  if (!work) {
    const problem = createProblemResponse(404, 'Not Found', { detail: 'Work not found.' });
    applySupabaseCookies(problem, supabaseResponse);
    return problem;
  }

  const responsePayload = {
    id: work.id,
    title: work.title,
    icc: work.icc_code,
    ownerId: work.owner_id ?? undefined,
    createdAt: work.created_at,
  };

  const response = NextResponse.json(responsePayload);
  applySupabaseCookies(response, supabaseResponse);
  return response;
}
