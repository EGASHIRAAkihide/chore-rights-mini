import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import type { Database } from '@chorerights/db';

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

type PayoutInstruction = Database['public']['Tables']['payout_instructions']['Row'];

export const dynamic = 'force-dynamic';

const currencySymbols: Record<string, string> = {
  JPY: '¥',
  USD: '$',
  EUR: '€',
};

function formatAmount(cents: number, currency: string) {
  const symbol = currencySymbols[currency] ?? '';
  const absolute = Math.abs(cents);
  const formatted = (absolute / 100).toFixed(2);
  return `${symbol}${formatted}${symbol ? '' : ` ${currency}`}`;
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatStatus(value: string | null) {
  const normalized = (value ?? 'pending').toLowerCase();
  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatRounding(cents: number, currency: string) {
  const symbol = currencySymbols[currency] ?? '';
  const sign = cents >= 0 ? '+' : '';
  const absolute = Math.abs(cents);
  if (absolute === 0) {
    return '';
  }
  if (absolute === 1 && currencySymbols[currency] === '$') {
    return `${sign}1¢`;
  }
  const formatted = (absolute / 100).toFixed(2);
  return `${sign}${symbol}${formatted}${symbol ? '' : ` ${currency}`}`;
}

export default async function PayoutsPage() {
  const supabase = createServerComponentClient<Database>({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const { data, error } = await supabase
    .from('payout_instructions')
    .select(
      'id,receipt_id,agreement_id,party_user_id,created_at,currency,amount_cents,status,rounding_adjustment,rounding_cents',
    )
    .eq('party_user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Unable to fetch payout instructions', error);
    throw error;
  }

  const payouts: PayoutInstruction[] = data ?? [];

  const totals = payouts.reduce<Record<string, number>>((acc, row) => {
    acc[row.currency] = (acc[row.currency] ?? 0) + row.amount_cents;
    return acc;
  }, {});

  return (
    <section className="space-y-6" data-testid="payouts-page">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Payouts</h1>
        <p className="text-sm text-slate-600">
          Review the latest payout instructions generated for your agreements.
        </p>
      </header>

      {payouts.length === 0 ? (
        <div
          className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500"
          data-testid="payouts-empty"
        >
          No payouts yet. Once receipts are distributed, instructions will appear here.
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(totals).map(([currency, cents]) => (
              <div
                key={currency}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                data-testid="payouts-total-row"
                data-currency={currency}
                data-total-cents={cents}
              >
                <p className="text-xs uppercase text-slate-500">Total ({currency})</p>
                <p className="text-lg font-semibold text-slate-900">
                  {formatAmount(cents, currency)}
                </p>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-sm" data-testid="payouts-table">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Agreement</th>
                  <th className="px-4 py-3">Currency</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Rounding Adjustment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payouts.map((row) => (
                  <tr key={row.id} data-testid="payout-row">
                    <td className="px-4 py-3 text-slate-700">{formatTimestamp(row.created_at)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.agreement_id}</td>
                    <td className="px-4 py-3 text-slate-700">{row.currency}</td>
                    <td
                      className="px-4 py-3 font-semibold text-slate-900"
                      data-amount-cents={row.amount_cents}
                    >
                      {formatAmount(row.amount_cents, row.currency)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{formatStatus(row.status)}</td>
                    <td className="px-4 py-3 text-emerald-600">
                      {row.rounding_adjustment ? formatRounding(row.rounding_cents, row.currency) : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
