#!/usr/bin/env -S node --loader ts-node/esm
/**
 * Export KPI to CSV: reads `kpi_daily` from Supabase and writes /docs/kpi/kpi_export_<date>.csv
 */

import { createClient } from '@chorerights/db';

import { mkdirSync, writeFileSync } from 'fs';

import { stringify } from './lib/csv-stringify-sync';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_*_KEY in env');
  process.exit(1);
}

const from = process.env.KPI_FROM ?? '2025-10-01';
const to = process.env.KPI_TO ?? '2026-03-31';

(async () => {
  const supabase = createClient({ serviceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) });
  const { data, error } = await supabase
    .from('kpi_daily')
    .select('*')
    .gte('day', from)
    .lte('day', to)
    .order('day', { ascending: true });

  if (error) {
    console.error('Supabase error:', error);
    process.exit(1);
  }

  mkdirSync('docs/kpi', { recursive: true });
  const out = `docs/kpi/kpi_export_${new Date().toISOString().slice(0, 10)}.csv`;
  const csv = stringify(data ?? [], {
    header: true,
    columns: [
      'day',
      'signup_users',
      'work_count',
      'license_requests',
      'agreements',
      'api_uptime',
      'ai_precision',
      'updated_at',
    ],
  });
  writeFileSync(out, csv, 'utf8');
  console.log(`✅ Exported ${data?.length ?? 0} rows to ${out}`);
})();
