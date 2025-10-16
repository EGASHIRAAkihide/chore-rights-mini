import React from 'react';

import { type Database } from '@chorerights/db';


const sampleKpi: Database['public']['Tables']['kpi_daily']['Row'][] = [
  {
    day: '2025-10-01',
    signup_users: 3,
    work_count: 7,
    license_requests: 2,
    agreements: 1,
    api_uptime: 99.7,
    ai_precision: 0.84,
    updated_at: '2025-10-02T09:00:00.000Z',
  },
];

export default function AdminKpiPage() {
  return (
    <section className="space-y-8" data-testid="admin-kpi-dashboard">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">PoC KPI control tower</h1>
        <p className="text-sm text-slate-600" data-testid="kpi-subtitle">
          Mirrors BR-07 and FR-13: monitor creator growth, licensing momentum, and AI precision
          metrics.
        </p>
        <div
          className="rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-700"
          data-testid="kpi-warning"
        >
          Connect to Supabase edge function once database migrations are live. Currently displaying
          seeded snapshot for UI scaffolding.
        </div>
      </header>

      <div
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
        data-testid="kpi-table"
      >
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Day</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Sign-ups</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Works</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">License Requests</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Agreements</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">API Uptime</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">AI Precision</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sampleKpi.map((row) => (
              <React.Fragment key={row.day}>
                <tr data-testid="kpi-row">
                  <td className="px-4 py-3 font-medium text-slate-900">{row.day}</td>
                  <td className="px-4 py-3">{row.signup_users ?? 'N/A'}</td>
                  <td className="px-4 py-3">{row.work_count ?? 'N/A'}</td>
                  <td className="px-4 py-3">{row.license_requests ?? 'N/A'}</td>
                  <td className="px-4 py-3">{row.agreements ?? 'N/A'}</td>
                  <td className="px-4 py-3">{row.api_uptime ?? 'N/A'}%</td>
                  <td className="px-4 py-3">{row.ai_precision ?? 'N/A'}</td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <section className="space-y-4" data-testid="kpi-actions">
        <h2 className="text-xl font-semibold">Next Actions</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-600">
          <li>Wire data fetching to Supabase once migrations land (SQL view: kpi_daily).</li>
          <li>Integrate `/scripts/export-kpi-to-csv.ts` via API route for CSV export (FR-14).</li>
          <li>
            Gate route by admin role when Supabase Auth is configured, per RLS policy summary in the
            data model.
          </li>
        </ol>
      </section>
    </section>
  );
}
