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

const querySchema = z
  .object({
    from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Expected format YYYY-MM-DD' })
      .optional(),
    to: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Expected format YYYY-MM-DD' })
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.from && value.to && value.from > value.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '"from" must be on or before "to"',
        path: ['from'],
      });
    }
  });

function formatDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  const day = `${date.getUTCDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftDateString(dateString: string, offsetDays: number): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return formatDate(date);
}

function defaultDateRange(): { from: string; to: string } {
  const now = new Date();
  const to = formatDate(now);
  const from = shiftDateString(to, -29);
  return { from, to };
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
    const firstIssue = parsedParams.error.issues[0];
    const detail = firstIssue
      ? `${firstIssue.path.join('.') || 'query'}: ${firstIssue.message}`
      : 'Invalid query parameters.';
    const problem = createProblemResponse(400, 'Bad Request', { detail });
    applySupabaseCookies(problem, supabaseResponse);
    return problem;
  }

  const defaults = defaultDateRange();
  const rangeTo = parsedParams.data.to ?? defaults.to;
  const rangeFrom = parsedParams.data.from ?? shiftDateString(rangeTo, -29);

  if (rangeFrom > rangeTo) {
    const problem = createProblemResponse(400, 'Bad Request', {
      detail: '"from" must be on or before "to".',
    });
    applySupabaseCookies(problem, supabaseResponse);
    return problem;
  }

  const { data, error } = await serviceSupabase
    .from('kpi_daily')
    .select('day,work_count,license_requests,agreements')
    .gte('day', rangeFrom)
    .lte('day', rangeTo)
    .order('day', { ascending: true });

  if (error) {
    console.error('Failed to fetch KPI data', error);
    const problem = createProblemResponse(500, 'Internal Server Error', {
      detail: 'Unable to generate KPI export.',
    });
    applySupabaseCookies(problem, supabaseResponse);
    return problem;
  }

  type KpiRow = {
    day: string;
    work_count: number | null;
    license_requests: number | null;
    agreements: number | null;
  };

  const rows = ((data ?? []) as KpiRow[]).map((row) => ({
    day: row.day,
    works: row.work_count ?? 0,
    requests: row.license_requests ?? 0,
    approvals: row.agreements ?? 0,
  }));

  const csv = stringifyCsv(rows, {
    columns: ['day', 'works', 'requests', 'approvals'],
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(csv));
      controller.close();
    },
  });

  const filename = `kpi_export_${rangeFrom}_${rangeTo}.csv`;
  const response = new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });

  applySupabaseCookies(response, supabaseResponse);
  return response;
}
