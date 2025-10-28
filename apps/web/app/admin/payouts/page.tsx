import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import type { Database } from '@chorerights/db';

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

import { AdminMarkPaidButton } from '../../../components/payouts/admin-mark-paid-button';
import { isAdminEmail } from '../../api/_utils/admin';
import { createSupabaseServiceClient } from '../../api/_utils/supabase';

type PayoutInstruction = Database['public']['Tables']['payout_instructions']['Row'];

type SearchParams = {
  [key: string]: string | string[] | undefined;
};

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 25;

function parseSingleParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function resolveMonthRange(month?: string) {
  if (!month) {
    return null;
  }

  const match = month.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;

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

function formatAmount(cents: number, currency: string) {
  const absolute = Math.abs(cents);
  const formatted = (absolute / 100).toFixed(2);
  return `${currency} ${formatted}`;
}

function formatDate(value: string | null) {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatStatus(status: string | null) {
  const normalized = (status ?? 'pending').toLowerCase();
  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildQueryString(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === '') {
      return;
    }
    search.set(key, String(value));
  });
  const qs = search.toString();
  return qs.length > 0 ? `?${qs}` : '';
}

function computeTotals(rows: Array<{ currency: string; amount_cents: number }>) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.currency] = (acc[row.currency] ?? 0) + row.amount_cents;
    return acc;
  }, {});
}

export default async function AdminPayoutsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createServerComponentClient<Database>({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  if (!isAdminEmail(user.email)) {
    redirect('/');
  }

  const serviceSupabase = createSupabaseServiceClient();

  const monthParam = parseSingleParam(searchParams.month);
  const statusParam = parseSingleParam(searchParams.status);
  const pageParam = Number.parseInt(parseSingleParam(searchParams.page) ?? '1', 10);
  const page = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;

  const range = resolveMonthRange(monthParam);

  let instructionQuery = serviceSupabase
    .from('payout_instructions')
    .select(
      'id,receipt_id,agreement_id,party_user_id,currency,amount_cents,status,created_at,paid_at,rounding_adjustment,rounding_cents,txn_ref',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false });

  if (range) {
    instructionQuery = instructionQuery
      .gte('created_at', range.start)
      .lt('created_at', range.end);
  }

  if (statusParam === 'pending' || statusParam === 'paid') {
    instructionQuery = instructionQuery.eq('status', statusParam);
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  instructionQuery = instructionQuery.range(from, to);

  const { data: instructions, error: instructionsError, count } = await instructionQuery;

  if (instructionsError) {
    console.error('Failed to load payout instructions for admin dashboard', instructionsError);
    throw instructionsError;
  }

  const payouts: PayoutInstruction[] = instructions ?? [];

  let totalsRows: Array<{ currency: string; amount_cents: number }> = payouts;

  if (payouts.length < (count ?? 0)) {
    let totalsQuery = serviceSupabase
      .from('payout_instructions')
      .select('id,currency,amount_cents', { head: false })
      .order('created_at', { ascending: false })
      .limit(1000);

    if (range) {
      totalsQuery = totalsQuery.gte('created_at', range.start).lt('created_at', range.end);
    }

    if (statusParam === 'pending' || statusParam === 'paid') {
      totalsQuery = totalsQuery.eq('status', statusParam);
    }

    const { data: totalsData, error: totalsError } = await totalsQuery;

    if (!totalsError && totalsData) {
      totalsRows = totalsData as Array<{ currency: string; amount_cents: number }>;
    }
  }

  const totals = computeTotals(totalsRows);

  const totalPages =
    count && count > 0 ? Math.max(1, Math.ceil(count / PAGE_SIZE)) : payouts.length > 0 ? 1 : 0;

  const prevQuery = buildQueryString({
    month: monthParam,
    status: statusParam,
    page: page > 1 ? page - 1 : undefined,
  });

  const nextQuery = buildQueryString({
    month: monthParam,
    status: statusParam,
    page: page < totalPages ? page + 1 : undefined,
  });

  return (
    <section className="space-y-8" data-testid="admin-payouts-page">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Payout Reconciliation</h1>
        <p className="text-sm text-slate-600">
          Review and reconcile payout instructions across all creators.
        </p>
      </header>

      <form className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-end">
        <div className="flex flex-1 flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Month
            <input
              type="month"
              defaultValue={monthParam}
              name="month"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </label>
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Status
            <select
              name="status"
              defaultValue={statusParam ?? ''}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
            </select>
          </label>
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            Apply
          </button>
          <a
            href="/admin/payouts"
            className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            Reset
          </a>
        </div>
      </form>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="admin-payouts-totals">
        {Object.entries(totals).map(([currency, cents]) => (
          <div
            key={currency}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            data-currency={currency}
            data-total-cents={cents}
          >
            <p className="text-xs uppercase tracking-wide text-slate-500">Total ({currency})</p>
            <p className="text-lg font-semibold text-slate-900">{formatAmount(cents, currency)}</p>
          </div>
        ))}
        {Object.keys(totals).length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-500">
            No payouts match the selected filters.
          </div>
        ) : null}
      </section>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm" data-testid="admin-payouts-table">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Receipt</th>
              <th className="px-4 py-3">Creator</th>
              <th className="px-4 py-3">Currency</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Paid At</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payouts.map((row) => (
              <tr key={row.id} data-testid="admin-payout-row" data-instruction-id={row.id}>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.receipt_id}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.party_user_id}</td>
                <td className="px-4 py-3 text-slate-700">{row.currency}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">
                  {formatAmount(row.amount_cents, row.currency)}
                </td>
                <td className="px-4 py-3 text-slate-700" data-testid="admin-payout-status" data-status={row.status}>
                  {formatStatus(row.status)}
                </td>
                <td className="px-4 py-3 text-slate-700">{formatDate(row.created_at)}</td>
                <td className="px-4 py-3 text-slate-700">{formatDate(row.paid_at)}</td>
                <td className="px-4 py-3 text-right">
                  {row.status !== 'paid' ? (
                    <AdminMarkPaidButton instructionId={row.id} />
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))}
            {payouts.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-sm text-slate-500">
                  No payout instructions found for the selected filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <nav className="flex items-center justify-between" aria-label="Pagination">
          <a
            href={`/admin/payouts${prevQuery}`}
            className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
            aria-disabled={page <= 1}
            data-disabled={page <= 1}
          >
            Previous
          </a>
          <span className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </span>
          <a
            href={`/admin/payouts${nextQuery}`}
            className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
            aria-disabled={page >= totalPages}
            data-disabled={page >= totalPages}
          >
            Next
          </a>
        </nav>
      ) : null}
    </section>
  );
}
