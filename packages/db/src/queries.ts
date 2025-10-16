import {
  eventInsertSchema,
  kpiDailyRowSchema,
  type KpiDailyRow,
  type WorkRow,
  workRowSchema,
} from './zod';

import type { Database } from './types';
import type { PostgrestClient } from './vendor/postgrest-client';
import type { SupabaseClient } from '@supabase/supabase-js';


export type PublicClient = SupabaseClient<Database>;

export async function fetchDailyKpi(
  client: PublicClient,
  params: { from?: string; to?: string } = {},
): Promise<KpiDailyRow[]> {
  const builder = client.from('kpi_daily').select('*').order('day', { ascending: true });

  if (params.from) {
    builder.gte('day', params.from);
  }
  if (params.to) {
    builder.lte('day', params.to);
  }

  const { data, error } = await builder;
  if (error) {
    throw error;
  }

  return kpiDailyRowSchema.array().parse(data ?? []);
}

export async function fetchDailyKpiRest(
  client: PostgrestClient<Database>,
  params: { from?: string; to?: string } = {},
): Promise<KpiDailyRow[]> {
  const builder = client.from('kpi_daily').select('*').order('day', { ascending: true });
  if (params.from) {
    builder.gte('day', params.from);
  }
  if (params.to) {
    builder.lte('day', params.to);
  }

  const { data, error } = await builder;
  if (error) {
    throw error;
  }

  return kpiDailyRowSchema.array().parse(data ?? []);
}

export async function logEvent(
  client: PublicClient,
  payload: { kind: string; meta?: Record<string, unknown>; userId?: string | null },
): Promise<void> {
  const body = eventInsertSchema.parse({
    kind: payload.kind,
    meta: payload.meta ?? null,
    user_id: payload.userId ?? null,
  });
  const eventsInsertPayload = {
    kind: body.kind,
    meta: body.meta ?? null,
    user_id: body.user_id,
  };
  const { error } = await client.from('events').insert(eventsInsertPayload as never);

  if (error) {
    throw error;
  }
}

export async function listWorksByOwner(
  client: PublicClient,
  ownerId: string,
  options: { limit?: number } = {},
): Promise<WorkRow[]> {
  const { limit = 50 } = options;
  const { data, error } = await client
    .from('works')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return workRowSchema.array().parse(data ?? []);
}
