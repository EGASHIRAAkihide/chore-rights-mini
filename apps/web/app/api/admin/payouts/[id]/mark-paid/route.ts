import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { z } from 'zod';

import { requireAdmin } from '../../../../_utils/admin';
import { createProblemResponse } from '../../../../_utils/problem';
import {
  applySupabaseCookies,
  createSupabaseServerClient,
  createSupabaseServiceClient,
  ensureSupabaseSession,
} from '../../../../_utils/supabase';

const payloadSchema = z
  .object({
    paid_at: z.string().datetime({ offset: true }).optional(),
  })
  .optional()
  .default({});

const MUTABLE_STATUSES = ['pending', 'scheduled', 'processing'];

type Params = {
  params: {
    id: string;
  };
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const guard = await requireAdmin(request);
  if (guard) {
    return guard;
  }

  const { supabase, response: supabaseResponse } = createSupabaseServerClient(request);
  await ensureSupabaseSession(request, supabase);
  const serviceSupabase = createSupabaseServiceClient();

  const { id } = params;
  if (!id) {
    const problem = createProblemResponse(400, 'Bad Request', {
      detail: 'Instruction id is required.',
    });
    applySupabaseCookies(problem, supabaseResponse);
    return problem;
  }

  const body = await request.json().catch(() => ({}));
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const detail = issue
      ? `${issue.path.join('.') || 'body'}: ${issue.message}`
      : 'Invalid request payload.';
    const problem = createProblemResponse(400, 'Bad Request', { detail });
    applySupabaseCookies(problem, supabaseResponse);
    return problem;
  }

  const requestPayload = parsed.data;

  const { data: existing, error: fetchError } = await serviceSupabase
    .from('payout_instructions')
    .select('id,status,paid_at,party_user_id')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) {
    console.error('Failed to load payout instruction for admin mark-paid', fetchError);
    const problem = createProblemResponse(500, 'Internal Server Error', {
      detail: 'Unable to load payout instruction.',
    });
    applySupabaseCookies(problem, supabaseResponse);
    return problem;
  }

  if (!existing) {
    const problem = createProblemResponse(404, 'Not Found', {
      detail: 'Payout instruction not found.',
    });
    applySupabaseCookies(problem, supabaseResponse);
    return problem;
  }

  if (existing.status === 'paid') {
    const response = NextResponse.json(
      {
        ok: true,
        id: existing.id,
        paid_at: existing.paid_at,
      },
      { status: 200 },
    );
    applySupabaseCookies(response, supabaseResponse);
    return response;
  }

  if (!MUTABLE_STATUSES.includes(existing.status ?? '')) {
    const problem = createProblemResponse(409, 'Conflict', {
      detail: 'Payout status does not allow marking as paid.',
    });
    applySupabaseCookies(problem, supabaseResponse);
    return problem;
  }

  const effectivePaidAt = requestPayload.paid_at ?? new Date().toISOString();

  const { data: updated, error: updateError } = await serviceSupabase
    .from('payout_instructions')
    .update({ status: 'paid', paid_at: effectivePaidAt })
    .eq('id', existing.id)
    .in('status', MUTABLE_STATUSES)
    .select('id,paid_at')
    .maybeSingle();

  if (updateError) {
    console.error('Failed to update payout instruction to paid via admin API', updateError);
    const problem = createProblemResponse(500, 'Internal Server Error', {
      detail: 'Unable to mark payout as paid.',
    });
    applySupabaseCookies(problem, supabaseResponse);
    return problem;
  }

  if (!updated) {
    const problem = createProblemResponse(409, 'Conflict', {
      detail: 'Payout status changed before it could be marked as paid.',
    });
    applySupabaseCookies(problem, supabaseResponse);
    return problem;
  }

  const { error: eventError } = await serviceSupabase.from('events').insert({
    user_id: null,
    kind: 'payout.mark_paid',
    meta: {
      actor: 'admin',
      action: 'payout.mark_paid',
      entity: 'payout_instruction',
      entity_id: existing.id,
      target_party_user_id: existing.party_user_id,
      paid_at: updated.paid_at,
      previous_status: existing.status,
      via: 'admin',
    },
  });

  if (eventError) {
    console.error('Failed to log admin payout mark-paid event', eventError);
  }

  const response = NextResponse.json(
    {
      ok: true,
      id: updated.id,
      paid_at: updated.paid_at,
    },
    { status: 200 },
  );

  applySupabaseCookies(response, supabaseResponse);
  return response;
}
