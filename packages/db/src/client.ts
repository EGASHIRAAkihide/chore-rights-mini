import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

import { PostgrestClient } from './vendor/postgrest-client';

import type { Database } from './types';

export type DatabaseClient = SupabaseClient<Database>;

export function createClient(options?: { serviceRole?: boolean }): DatabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = options?.serviceRole
    ? process.env.SUPABASE_SERVICE_ROLE_KEY
    : process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error('Missing Supabase credentials. Check environment variables.');
  }

  return createSupabaseClient<Database>(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: true,
    },
  });
}

export function createPostgrestClient(options?: { url?: string; key?: string }) {
  const supabaseUrl = options?.url ?? process.env.SUPABASE_URL;
  const anonKey =
    options?.key ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error('Missing Supabase credentials. Check environment variables.');
  }

  return new PostgrestClient<Database>(supabaseUrl, {
    schema: 'public',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });
}
