import type { Database, Json } from './types';
import type { SupabaseClient } from '@supabase/supabase-js';

type PublicClient = SupabaseClient<Database>;

export async function fetchDailyKpi(
  client: PublicClient,
  params: { from?: string; to?: string } = {},
) {
  let query = client.from('kpi_daily').select('*').order('day', { ascending: true });

  if (params.from) {
    query = query.gte('day', params.from);
  }
  if (params.to) {
    query = query.lte('day', params.to);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return data;
}

export async function logEvent(
  client: PublicClient,
  payload: { kind: string; meta?: Json },
): Promise<void> {
  const { error } = await client.from('events').insert({
    kind: payload.kind,
    meta: payload.meta ?? null,
  });

  if (error) {
    throw error;
  }
}

export async function listWorksByOwner(client: PublicClient, ownerId: string) {
  const { data, error } = await client
    .from('works')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  return data;
}
