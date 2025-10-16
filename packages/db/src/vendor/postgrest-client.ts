import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Minimal Postgrest client wrapper that mirrors the subset of @supabase/postgrest-js used in this repository.
 */
export class PostgrestClient<Schema> {
  private readonly client: SupabaseClient<Schema>;

  constructor(
    url: string,
    options: {
      schema?: string;
      headers?: Record<string, string>;
    } = {},
  ) {
    const apiKey = options.headers?.apikey ?? options.headers?.Authorization?.replace(/^Bearer\s+/i, '') ?? '';
    this.client = createClient<Schema>(url, apiKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    if (options.schema && options.schema !== 'public') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.client as any).schema = options.schema;
    }
  }

  from<TableName extends string>(table: TableName) {
    return this.client.from(table);
  }
}
