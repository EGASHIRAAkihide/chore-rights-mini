import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

import type { Database } from '@chorerights/db';
import { formatICC, createWorkSchema } from '@chorerights/lib';


import { logAuditEvent } from '../../_utils/events';
import { createProblemResponse } from '../../_utils/problem';
import { applySupabaseCookies, createSupabaseServerClient } from '../../_utils/supabase';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { z } from 'zod';

const workRegistrationSchema = createWorkSchema.pick({
  title: true,
  description: true,
  video: true,
  icc: true,
  fingerprint: true,
  delegation: true,
  termsAccepted: true,
});

type WorkRegistrationInput = z.infer<typeof workRegistrationSchema>;

export async function POST(request: NextRequest) {
  const { supabase, response: supabaseResponse } = createSupabaseServerClient(request);

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    const problem = createProblemResponse(401, 'Unauthorized', {
      detail: 'Authentication required.',
    });
    applySupabaseCookies(problem, supabaseResponse);
    return problem;
  }

  let payload: WorkRegistrationInput;
  try {
    const json = await request.json();
    const parsing = workRegistrationSchema.safeParse(json);
    if (!parsing.success) {
      const firstIssue = parsing.error.issues[0];
      const detail = firstIssue
        ? `${firstIssue.path.join('.') || 'body'}: ${firstIssue.message}`
        : 'Invalid request body.';
      const problem = createProblemResponse(400, 'Bad Request', { detail });
      applySupabaseCookies(problem, supabaseResponse);
      return problem;
    }
    payload = parsing.data;
  } catch {
    const problem = createProblemResponse(400, 'Bad Request', {
      detail: 'Request body must be valid JSON.',
    });
    applySupabaseCookies(problem, supabaseResponse);
    return problem;
  }

  if (!payload.termsAccepted) {
    const problem = createProblemResponse(422, 'Unprocessable Entity', {
      detail: 'termsAccepted must be true.',
    });
    applySupabaseCookies(problem, supabaseResponse);
    return problem;
  }

  const iccCode = formatICC({
    country: payload.icc.country,
    registrant: payload.icc.registrant,
    serial: payload.icc.serial,
  });

  const rpcPayload = {
    title: payload.title,
    description: payload.description ?? null,
    metadata: payload.delegation ? { delegation: payload.delegation } : null,
    icc_code: iccCode,
    video_url: payload.video.storageKey,
    status: 'ACTIVE',
    fingerprint: payload.fingerprint
      ? {
          algo: payload.fingerprint.algo,
          hash: payload.fingerprint.hash_or_vector,
        }
      : null,
  };

  const { data: workId, error: rpcError } = await supabase.rpc('create_work_with_icc', {
    payload: rpcPayload,
  });

  if (rpcError || !workId) {
    console.error('create_work_with_icc failed', rpcError);
    const detail =
      rpcError?.code === '23505'
        ? 'A work with the provided ICC already exists.'
        : 'Unable to register work at this time.';
    const status = rpcError?.code === '23505' ? 409 : 500;
    const problem = createProblemResponse(
      status,
      status === 409 ? 'Conflict' : 'Internal Server Error',
      {
        detail,
      },
    );
    applySupabaseCookies(problem, supabaseResponse);
    return problem;
  }

  const { data: workRecord, error: fetchError } = await supabase
    .from('works')
    .select('id,title,icc_code,owner_id,created_at')
    .eq('id', workId)
    .maybeSingle();

  if (fetchError) {
    console.error('Unable to fetch newly created work', fetchError);
    const problem = createProblemResponse(500, 'Internal Server Error', {
      detail: 'Work was created but could not be retrieved.',
    });
    applySupabaseCookies(problem, supabaseResponse);
    return problem;
  }

  if (!workRecord) {
    const problem = createProblemResponse(404, 'Not Found', {
      detail: 'Work not available for the authenticated user.',
    });
    applySupabaseCookies(problem, supabaseResponse);
    return problem;
  }

  await logMutationEvent(supabase, authData.user.id, workRecord.id).catch((logError) => {
    console.error('Failed to log work.register event', logError);
  });

  const payloadResponse = {
    id: workRecord.id,
    icc: workRecord.icc_code,
    title: workRecord.title,
  };

  const response = NextResponse.json(payloadResponse, { status: 201 });
  applySupabaseCookies(response, supabaseResponse);
  return response;
}

async function logMutationEvent(
  supabase: SupabaseClient<Database>,
  userId: string,
  workId: string,
) {
  await logAuditEvent(supabase, {
    userId,
    action: 'work.register',
    entity: 'work',
    entityId: workId,
    meta: { work_id: workId },
  });
}
