import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { z } from 'zod';

import { isAdminEmail } from '../../_utils/admin';
import { createProblemResponse } from '../../_utils/problem';
import {
  applySupabaseCookies,
  createSupabaseServerClient,
  createSupabaseServiceClient,
  ensureSupabaseSession,
} from '../../_utils/supabase';

const payloadSchema = z.object({
  instructionId: z.string().uuid(),
  paidAt: z.string().datetime({ offset: true }).optional(),
  txnRef: z.string().max(120).optional(),
});

const MUTABLE_STATUSES = ['pending', 'scheduled', 'processing'];

function problemWithCookies(response: NextResponse, supabaseResponse: NextResponse) {
  applySupabaseCookies(response, supabaseResponse);
  return response;
}

export async function POST(request: NextRequest) {
  const { supabase, response: supabaseResponse } = createSupabaseServerClient(request);
  await ensureSupabaseSession(request, supabase);

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    const problem = createProblemResponse(401, 'Unauthorized', {
      detail: 'Authentication required.',
    });
    return problemWithCookies(problem, supabaseResponse);
  }

  const body = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const detail = issue
      ? `${issue.path.join('.') || 'body'}: ${issue.message}`
      : 'Invalid request payload.';
    const problem = createProblemResponse(400, 'Bad Request', { detail });
    return problemWithCookies(problem, supabaseResponse);
  }

  const payload = parsed.data;
  const actorId = authData.user.id;
  const actorEmail = authData.user.email;
  const isAdmin = isAdminEmail(actorEmail);

  const serviceSupabase = createSupabaseServiceClient();

  const { data: instruction, error: fetchError } = await serviceSupabase
    .from('payout_instructions')
    .select('id, status, party_user_id, paid_at, txn_ref')
    .eq('id', payload.instructionId)
    .maybeSingle();

  if (fetchError) {
    console.error('Failed to load payout instruction for mark-paid', fetchError);
    const problem = createProblemResponse(500, 'Internal Server Error', {
      detail: 'Unable to load payout instruction.',
    });
    return problemWithCookies(problem, supabaseResponse);
  }

  if (!instruction) {
    const problem = createProblemResponse(404, 'Not Found', {
      detail: 'Payout instruction not found.',
    });
    return problemWithCookies(problem, supabaseResponse);
  }

  if (!isAdmin && instruction.party_user_id !== actorId) {
    const problem = createProblemResponse(403, 'Forbidden', {
      detail: 'You are not allowed to mark this payout as paid.',
    });
    return problemWithCookies(problem, supabaseResponse);
  }

  if (instruction.status === 'paid') {
    const problem = createProblemResponse(409, 'Conflict', {
      detail: 'Payout already marked as paid.',
    });
    return problemWithCookies(problem, supabaseResponse);
  }

  if (!MUTABLE_STATUSES.includes(instruction.status ?? '')) {
    const problem = createProblemResponse(409, 'Conflict', {
      detail: 'Payout status does not allow marking as paid.',
    });
    return problemWithCookies(problem, supabaseResponse);
  }

  const effectivePaidAt = payload.paidAt ?? new Date().toISOString();
  const updatePayload = {
    status: 'paid',
    paid_at: effectivePaidAt,
    txn_ref: payload.txnRef ?? null,
  };

  const { data: updatedInstruction, error: updateError } = await serviceSupabase
    .from('payout_instructions')
    .update(updatePayload)
    .eq('id', instruction.id)
    .in('status', MUTABLE_STATUSES)
    .select('id, status')
    .maybeSingle();

  if (updateError) {
    console.error('Failed to update payout instruction to paid', updateError);
    const problem = createProblemResponse(500, 'Internal Server Error', {
      detail: 'Unable to mark payout as paid.',
    });
    return problemWithCookies(problem, supabaseResponse);
  }

  if (!updatedInstruction) {
    const problem = createProblemResponse(409, 'Conflict', {
      detail: 'Payout status changed before it could be marked as paid.',
    });
    return problemWithCookies(problem, supabaseResponse);
  }

  const eventPayload = {
    user_id: actorId,
    kind: 'payout.mark_paid',
    meta: {
      actor: actorId,
      action: 'payout.mark_paid',
      entity: 'payout_instruction',
      entity_id: instruction.id,
      status_before: instruction.status,
      paid_at: effectivePaidAt,
      txn_ref: payload.txnRef ?? null,
    },
  };

  const { error: eventError } = await serviceSupabase.from('events').insert(eventPayload);
  if (eventError) {
    console.error('Failed to log payout mark-paid event', eventError);
    const problem = createProblemResponse(500, 'Internal Server Error', {
      detail: 'Unable to log payout event.',
    });
    return problemWithCookies(problem, supabaseResponse);
  }

  const response = NextResponse.json({
    ok: true,
    instruction_id: instruction.id,
    status: 'paid',
  });

  applySupabaseCookies(response, supabaseResponse);
  return response;
}
