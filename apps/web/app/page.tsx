import Link from 'next/link';

import { generateICC } from '@chorerights/lib';


const sampleICC = generateICC('JP', 'CRG', 27);

export default function LandingPage() {
  return (
    <section className="space-y-12" data-testid="landing-page">
      <header className="space-y-6 rounded-2xl bg-white p-10 shadow-sm" data-testid="landing-hero">
        <span className="inline-flex items-center rounded-full bg-brand-muted px-4 py-1 text-xs font-semibold text-brand">
          Polygon Proof-of-Concept
        </span>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          Protect choreography IP with verified ICC proofs and automated licensing.
        </h1>
        <p className="max-w-2xl text-lg text-slate-600">
          ChoreRights lets creators register their routines, license them to partners, and receive
          transparent royalty distribution backed by Supabase and Polygon.
        </p>
        <div className="flex flex-wrap gap-4" data-testid="landing-cta-group">
          <Link
            href="/dashboard/new"
            className="rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white shadow hover:bg-blue-600"
            data-testid="primary-cta"
          >
            Register choreography
          </Link>
          <Link
            href="/admin/kpi"
            className="rounded-lg border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:border-brand hover:text-brand"
            data-testid="secondary-cta"
          >
            View KPI dashboard
          </Link>
        </div>
      </header>
      <article className="grid gap-6 lg:grid-cols-2" aria-labelledby="section-overview">
        <div
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-8"
          data-testid="pillar-registration"
        >
          <h2 id="section-overview" className="text-2xl font-bold text-slate-900">
            Why ChoreRights now?
          </h2>
          <p className="text-sm text-slate-600">
            From the PRD (FR-01 through FR-14), creators need a dedicated workflow to register
            works, manage licenses, and track royalties. This MVP focuses on those core flows for
            the PoC timeline.
          </p>
          <dl className="grid gap-3 text-sm text-slate-600">
            <div className="rounded-lg bg-slate-50 p-4" data-testid="stat-icc-sample">
              <dt className="font-semibold text-slate-800">Sample ICC Code</dt>
              <dd className="text-slate-500">{sampleICC}</dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-4" data-testid="stat-royalty-split">
              <dt className="font-semibold text-slate-800">Royalty Split (FR-10)</dt>
              <dd className="text-slate-500">70% Creator / 30% Platform</dd>
            </div>
          </dl>
        </div>
        <div
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-8"
          data-testid="pillar-features"
        >
          <h3 className="text-xl font-semibold text-slate-900">MVP Deliverables</h3>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
            <li data-testid="feature-registration">
              ICC-backed registration &amp; fingerprint capture
            </li>
            <li data-testid="feature-licensing">
              License request workflow with approval / rejection
            </li>
            <li data-testid="feature-kpi">Admin KPI dashboard sourced from Supabase</li>
            <li data-testid="feature-blockchain">Polygon Mumbai proofs through mocked contracts</li>
          </ul>
          <div
            className="rounded-lg bg-slate-100 p-4 text-xs text-slate-500"
            data-testid="note-compliance"
          >
            Compliant with GDPR &amp; APPI (Japan) requirements noted in the NFR section.
          </div>
        </div>
      </article>
    </section>
  );
}
