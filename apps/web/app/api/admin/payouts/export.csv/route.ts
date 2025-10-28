import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { z } from 'zod';

import { requireAdmin } from '../../../_utils/admin';
import { stringifyCsv } from '../../../_utils/csv';
import { createProblemResponse } from '../../../_utils/problem';
import {
  applySupabaseCookies,
  createSupabaseServerClient,
  createSupabaseServiceClient,
  ensureSupabaseSession,
} from '../../../_utils/supabase';

const monthParamSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, { message: 'Expected format YYYY-MM' })
  .refine((value) => {
    const monthNumber = Number(value.slice(5));
    return monthNumber >= 1 && monthNumber <= 12;
  }, { message: 'month must be between 01 and 12' });

const querySchema = z.object({
  month: monthParamSchema,
});

function resolveMonthRange(month: string) {
  const [yearString, monthString] = month.split('-');
  const year = Number(yearString);
  const monthIndex = Number(monthString) - 1;

  if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return null;
  }

  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0));

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (guard) {
    return guard;
  }

  const { supabase, response: supabaseResponse } = createSupabaseServerClient(request);
  await ensureSupabaseSession(request, supabase);
  const serviceSupabase = createSupabaseServiceClient();

  const url = new URL(request.url);
  const rawParams = Object.fromEntries(url.searchParams.entries());
  const parsedParams = querySchema.safeParse(rawParams);

  if (!parsedParams.success) {
    const issue = parsedParams.error.issues[0];
    const detail = issue
      ? `${issue.path.join('.') || 'query'}: ${issue.message}`
      : 'Invalid query parameters.';
    const problem = createProblemResponse(400, 'Bad Request', { detail });
    applySupabaseCookies(problem, supabaseResponse);
    return problem;
  }

  const { month } = parsedParams.data;
  const range = resolveMonthRange(month);
  if (!range) {
    const problem = createProblemResponse(400, 'Bad Request', {
      detail: 'month must reference a valid calendar month.',
    });
    applySupabaseCookies(problem, supabaseResponse);
    return problem;
  }

  const { data, error } = await serviceSupabase
    .from('payout_instructions')
    .select('receipt_id,party_user_id,currency,amount_cents,status,created_at,paid_at')
    .gte('created_at', range.start)
    .lt('created_at', range.end)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch payout instructions for export', error);
    const problem = createProblemResponse(500, 'Internal Server Error', {
      detail: 'Unable to generate payout export.',
    });
    applySupabaseCookies(problem, supabaseResponse);
    return problem;
  }

  const rows = (data ?? []).map((row) => ({
    receipt_id: row.receipt_id,
    party_user_id: row.party_user_id,
    currency: row.currency,
    amount_cents: row.amount_cents,
    status: row.status,
    created_at: row.created_at,
    paid_at: row.paid_at ?? '',
  }));

  const csv = stringifyCsv(rows, {
    columns: ['receipt_id', 'party_user_id', 'currency', 'amount_cents', 'status', 'created_at', 'paid_at'],
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(csv));
      controller.close();
    },
  });

  const filename = `payouts-${month}.csv`;
  const response = new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });

  applySupabaseCookies(response, supabaseResponse);
  return response;
}
