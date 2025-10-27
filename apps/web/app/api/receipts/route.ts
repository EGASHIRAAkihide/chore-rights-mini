import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import type { Database } from '@chorerights/db';

import { z } from 'zod';

import { logAuditEvent } from '../_utils/events';
import { createProblemResponse } from '../_utils/problem';
import {
  applySupabaseCookies,
  createSupabaseServerClient,
  createSupabaseServiceClient,
  ensureSupabaseSession,
} from '../_utils/supabase';

type ReceiptRow = Database['public']['Tables']['receipts']['Row'];
type ReceiptSummary = Pick<
  ReceiptRow,
  'id' | 'status' | 'gross_amount' | 'currency' | 'payout_instructions' | 'distributed_at'
>;

const receiptSchema = z.object({
  agreementId: z.string().uuid(),
  grossAmount: z.coerce.number().positive(),
  currency: z.string().min(1).max(8).optional(),
  split: z
    .object({
      creator: z.coerce.number().nonnegative().optional(),
      licensee: z.coerce.number().nonnegative().optional(),
      platform: z.coerce.number().nonnegative().optional(),
    })
    .optional(),
  memo: z.string().max(200).optional(),
  creatorId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const authHeader = request.headers.get('authorization') ?? '';
  const normalizedAuthHeader = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : authHeader;
  const isServiceRequest = Boolean(
    serviceRoleKey && normalizedAuthHeader.length > 0 && normalizedAuthHeader === serviceRoleKey,
  );

  let supabase: ReturnType<typeof createSupabaseServerClient>['supabase'];
  let supabaseResponse: NextResponse | null = null;

  if (isServiceRequest) {
    supabase = createSupabaseServiceClient();
  } else {
    const supabaseSetup = createSupabaseServerClient(request);
    supabase = supabaseSetup.supabase;
    supabaseResponse = supabaseSetup.response;
    await ensureSupabaseSession(request, supabase);
  }

  let payload: z.infer<typeof receiptSchema>;
  try {
    const json = await request.json();
    const parsed = receiptSchema.safeParse(json);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const detail = issue
        ? `${issue.path.join('.') || 'body'}: ${issue.message}`
        : 'Invalid request payload.';
      const problem = createProblemResponse(400, 'Bad Request', { detail });
      if (supabaseResponse) {
        applySupabaseCookies(problem, supabaseResponse);
      }
      return problem;
    }
    payload = parsed.data;
  } catch {
    const problem = createProblemResponse(400, 'Bad Request', {
      detail: 'Request body must be valid JSON.',
    });
    if (supabaseResponse) {
      applySupabaseCookies(problem, supabaseResponse);
    }
    return problem;
  }

  let actorUserId: string | null = null;
  if (isServiceRequest) {
    actorUserId = payload.creatorId ?? null;
    if (!actorUserId) {
      const problem = createProblemResponse(400, 'Bad Request', {
        detail: 'creatorId is required when using service credentials.',
      });
      return problem;
    }
  } else {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      const problem = createProblemResponse(401, 'Unauthorized', {
        detail: 'Authentication required.',
      });
      if (supabaseResponse) {
        applySupabaseCookies(problem, supabaseResponse);
      }
      return problem;
    }
    actorUserId = authData.user.id;
  }

  const { data: agreement, error: agreementError } = await supabase
    .from('agreements')
    .select('id,creator_id,licensee_id')
    .eq('id', payload.agreementId)
    .maybeSingle();

  if (agreementError) {
    console.error('Failed to verify agreement for receipt', agreementError);
    const problem = createProblemResponse(500, 'Internal Server Error', {
      detail: 'Unable to verify agreement for receipt.',
    });
    if (supabaseResponse) {
      applySupabaseCookies(problem, supabaseResponse);
    }
    return problem;
  }

  if (!agreement) {
    const problem = createProblemResponse(404, 'Not Found', {
      detail: 'Agreement not found.',
    });
    if (supabaseResponse) {
      applySupabaseCookies(problem, supabaseResponse);
    }
    return problem;
  }

  if (!actorUserId || agreement.creator_id !== actorUserId) {
    const problem = createProblemResponse(403, 'Forbidden', {
      detail: 'Only the creator may register receipts for this agreement.',
    });
    if (supabaseResponse) {
      applySupabaseCookies(problem, supabaseResponse);
    }
    return problem;
  }

  const insertPayload = {
    agreement_id: payload.agreementId,
    gross_amount: payload.grossAmount,
    currency: (payload.currency ?? 'JPY').toUpperCase(),
    meta: payload.memo ? { memo: payload.memo } : null,
  };

  const { data: insertResult, error: insertError } = await supabase
    .from('receipts')
    .insert(insertPayload)
    .select('id,status,gross_amount,currency,payout_instructions')
    .single();

  if (insertError || !insertResult) {
    console.error('Failed to insert receipt', insertError);
    const problem = createProblemResponse(500, 'Internal Server Error', {
      detail: 'Unable to create receipt.',
    });
    if (supabaseResponse) {
      applySupabaseCookies(problem, supabaseResponse);
    }
    return problem;
  }

  const rpcArgs: Record<string, unknown> = {
    p_receipt_id: insertResult.id,
  };

  if (payload.split) {
    rpcArgs.p_split = {
      creator: payload.split.creator ?? null,
      licensee: payload.split.licensee ?? payload.split.platform ?? null,
      platform: payload.split.platform ?? null,
    };
  }

  const { error: rpcError, data: rpcResult } = await supabase.rpc('distribute_receipt', rpcArgs);
  if (rpcError) {
    console.error('Failed to distribute receipt via RPC', rpcError);
  }

  const { data: refreshed, error: refreshError } = await supabase
    .from('receipts')
    .select('id,status,payout_instructions,gross_amount,currency,distributed_at')
    .eq('id', insertResult.id)
    .maybeSingle();

  if (refreshError || !refreshed) {
    console.error('Failed to refresh receipt after distribution', refreshError);
    const problem = createProblemResponse(500, 'Internal Server Error', {
      detail: 'Receipt created but payout distribution failed.',
    });
    if (supabaseResponse) {
      applySupabaseCookies(problem, supabaseResponse);
    }
    return problem;
  }

  const responsePayload = normalizeReceiptResponse(refreshed, rpcResult);

  const response = NextResponse.json(responsePayload, { status: 201 });
  if (supabaseResponse) {
    applySupabaseCookies(response, supabaseResponse);
  }

  const auditUserId = actorUserId ?? agreement.creator_id;

  await logAuditEvent(supabase, {
    userId: auditUserId,
    action: 'receipt.create',
    entity: 'receipt',
    entityId: responsePayload.id,
    meta: { agreement_id: payload.agreementId },
  }).catch((error) => {
    console.error('Failed to log receipt.create event', error);
  });

  if (responsePayload.status === 'distributed') {
    await logAuditEvent(supabase, {
      userId: auditUserId,
      action: 'receipt.distribute',
      entity: 'receipt',
      entityId: responsePayload.id,
      meta: { agreement_id: payload.agreementId },
    }).catch((error) => {
      console.error('Failed to log receipt.distribute event', error);
    });
  }

  return response;
}

function normalizeReceiptResponse(
  row: ReceiptSummary,
  rpcResult: unknown,
): {
  id: string;
  status: string;
  grossAmount: number;
  currency: string;
  payoutInstructions: unknown;
  distributedAt: string | null;
} {
  const payout =
    row.payout_instructions && Array.isArray(row.payout_instructions)
      ? row.payout_instructions
      : rpcResult ?? [];

  return {
    id: row.id,
    status: row.status.toLowerCase(),
    grossAmount: row.gross_amount,
    currency: row.currency,
    payoutInstructions: payout ?? [],
    distributedAt: row.distributed_at,
  };
}
