import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

import type { Database } from '@chorerights/db';

import { z } from 'zod';

import { logAuditEvent } from '../../_utils/events';
import { createProblemResponse } from '../../_utils/problem';
import { applySupabaseCookies, createSupabaseServerClient } from '../../_utils/supabase';

import type { SupabaseClient } from '@supabase/supabase-js';



const approveSchema = z.object({
  requestId: z.string().uuid(),
});

type ApproveInput = z.infer<typeof approveSchema>;

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

  let payload: ApproveInput;
  try {
    const json = await request.json();
    const parsed = approveSchema.safeParse(json);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const detail = issue
        ? `${issue.path.join('.') || 'body'}: ${issue.message}`
        : 'Invalid request payload.';
      const problem = createProblemResponse(400, 'Bad Request', { detail });
      applySupabaseCookies(problem, supabaseResponse);
      return problem;
    }
    payload = parsed.data;
  } catch {
    const problem = createProblemResponse(400, 'Bad Request', {
      detail: 'Request body must be valid JSON.',
    });
    applySupabaseCookies(problem, supabaseResponse);
    return problem;
  }

  const licenseRequest = await getLicenseRequest(supabase, payload.requestId);
  if (licenseRequest.error) {
    const detail =
      licenseRequest.errorCode === 404
        ? 'License request not found.'
        : 'Unable to view license request.';
    const problem = createProblemResponse(
      licenseRequest.errorCode ?? 500,
      licenseRequest.errorCode === 404 ? 'Not Found' : 'Internal Server Error',
      {
        detail,
      },
    );
    applySupabaseCookies(problem, supabaseResponse);
    return problem;
  }

  const requestRow = licenseRequest.data!;

  if (requestRow.status !== 'PENDING') {
    const problem = createProblemResponse(409, 'Conflict', {
      detail: 'License request already processed.',
    });
    applySupabaseCookies(problem, supabaseResponse);
    return problem;
  }

  const workOwner = await getWorkOwner(supabase, requestRow.work_id);
  if (workOwner.error) {
    const detail =
      workOwner.errorCode === 403
        ? 'You are not authorized to approve this request.'
        : 'Unable to verify work ownership.';
    const status = workOwner.errorCode ?? 500;
    const problem = createProblemResponse(
      status,
      status === 403 ? 'Forbidden' : 'Internal Server Error',
      { detail },
    );
    applySupabaseCookies(problem, supabaseResponse);
    return problem;
  }

  if (workOwner.ownerId !== authData.user.id) {
    const problem = createProblemResponse(403, 'Forbidden', {
      detail: 'You are not authorized to approve this request.',
    });
    applySupabaseCookies(problem, supabaseResponse);
    return problem;
  }

  const agreementInsert = await supabase
    .from('agreements')
    .insert({
      work_id: requestRow.work_id,
      creator_id: workOwner.ownerId,
      licensee_id: requestRow.requester_id,
      terms: requestRow.request_data ?? {},
      status: 'SIGNED',
    })
    .select('id')
    .single();

  if (agreementInsert.error) {
    console.error('Failed to create agreement', agreementInsert.error);
    const problem = createProblemResponse(500, 'Internal Server Error', {
      detail: 'Unable to create agreement.',
    });
    applySupabaseCookies(problem, supabaseResponse);
    return problem;
  }

  const updateResult = await supabase
    .from('license_requests')
    .update({ status: 'APPROVED', updated_at: new Date().toISOString() })
    .eq('id', payload.requestId)
    .select('id')
    .single();

  if (updateResult.error) {
    console.error('Failed to update license request status', updateResult.error);
    const problem = createProblemResponse(500, 'Internal Server Error', {
      detail: 'Agreement created but license request status could not be updated.',
    });
    applySupabaseCookies(problem, supabaseResponse);
    return problem;
  }

  await logApproveEvent(
    supabase,
    authData.user.id,
    payload.requestId,
    agreementInsert.data.id,
  ).catch((err) => {
    console.error('Failed to log license.approve event', err);
  });

  const response = NextResponse.json({
    agreementId: agreementInsert.data.id,
    status: 'approved',
  });
  applySupabaseCookies(response, supabaseResponse);
  return response;
}

async function getLicenseRequest(
  supabase: SupabaseClient<Database>,
  requestId: string,
): Promise<{ data?: LicenseRequestRow; error?: Error; errorCode?: number }> {
  const { data, error } = await supabase
    .from('license_requests')
    .select('id,status,work_id,request_data,requester_id')
    .eq('id', requestId)
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST116') {
      return { error: error as Error, errorCode: 404 };
    }
    console.error('Failed to fetch license request', error);
    return { error: error as Error };
  }

  if (!data) {
    return { error: new Error('Not found'), errorCode: 404 };
  }

  return { data: data as LicenseRequestRow };
}

async function getWorkOwner(
  supabase: SupabaseClient<Database>,
  workId: string,
): Promise<{ ownerId: string } | { error: Error; errorCode?: number }> {
  const { data, error } = await supabase
    .from('works')
    .select('id,owner_id')
    .eq('id', workId)
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST116') {
      return { error: new Error('Forbidden'), errorCode: 403 };
    }
    console.error('Failed to fetch work owner', error);
    return { error: error as Error };
  }

  if (!data) {
    return { error: new Error('Forbidden'), errorCode: 403 };
  }

  return { ownerId: data.owner_id };
}

async function logApproveEvent(
  supabase: SupabaseClient<Database>,
  userId: string,
  requestId: string,
  agreementId: string,
) {
  await logAuditEvent(supabase, {
    userId,
    action: 'license.approve',
    entity: 'license_request',
    entityId: requestId,
    meta: { license_request_id: requestId, agreement_id: agreementId },
  });
}

type LicenseRequestRow = Database['public']['Tables']['license_requests']['Row'];
