import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

import type { Database } from '@chorerights/db';

import { z } from 'zod';

import { logAuditEvent } from '../../_utils/events';
import { createProblemResponse } from '../../_utils/problem';
import {
  applySupabaseCookies,
  createSupabaseServerClient,
  ensureSupabaseSession,
} from '../../_utils/supabase';

import type { SupabaseClient } from '@supabase/supabase-js';



const licenseRequestSchema = z.object({
  workId: z.string().uuid(),
  usage: z.string().min(1),
  territory: z.string().min(1),
  durationDays: z.number().int().positive(),
  feeYen: z.number().int().nonnegative(),
});

type LicenseRequestInput = z.infer<typeof licenseRequestSchema>;

export async function POST(request: NextRequest) {
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

  let payload: LicenseRequestInput;
  try {
    const json = await request.json();
    const result = licenseRequestSchema.safeParse(json);
    if (!result.success) {
      const issue = result.error.issues[0];
      const detail = issue
        ? `${issue.path.join('.') || 'body'}: ${issue.message}`
        : 'Invalid request payload.';
      const problem = createProblemResponse(400, 'Bad Request', { detail });
      applySupabaseCookies(problem, supabaseResponse);
      return problem;
    }
    payload = result.data;
  } catch {
    const problem = createProblemResponse(400, 'Bad Request', {
      detail: 'Request body must be valid JSON.',
    });
    applySupabaseCookies(problem, supabaseResponse);
    return problem;
  }

  const { data: insertResult, error: insertError } = await supabase
    .from('license_requests')
    .insert({
      work_id: payload.workId,
      requester_id: authData.user.id,
      request_data: {
        usage: payload.usage,
        territory: payload.territory,
        durationDays: payload.durationDays,
        feeYen: payload.feeYen,
      },
      status: 'PENDING',
    })
    .select('id,status')
    .single();

  if (insertError) {
    console.error('Failed to create license request', insertError);
    const problem = createProblemResponse(500, 'Internal Server Error', {
      detail: 'Unable to create license request.',
    });
    applySupabaseCookies(problem, supabaseResponse);
    return problem;
  }

  await logEventSafe(supabase, authData.user.id, insertResult.id).catch((err) => {
    console.error('Failed to log license.request event', err);
  });

  const response = NextResponse.json(
    {
      id: insertResult.id,
      status: insertResult.status?.toLowerCase() ?? 'pending',
    },
    { status: 201 },
  );
  applySupabaseCookies(response, supabaseResponse);
  return response;
}

async function logEventSafe(client: SupabaseClient<Database>, userId: string, requestId: string) {
  await logAuditEvent(client, {
    userId,
    action: 'license.request',
    entity: 'license_request',
    entityId: requestId,
    meta: { license_request_id: requestId },
  });
}
