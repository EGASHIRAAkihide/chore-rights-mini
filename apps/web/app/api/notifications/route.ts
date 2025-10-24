import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import type { Database } from '@chorerights/db';

import { applySupabaseCookies, createSupabaseServerClient, ensureSupabaseSession } from '../_utils/supabase';

type EventRow = Database['public']['Tables']['events']['Row'];

function formatMessage(row: EventRow): string {
  switch (row.kind) {
    case 'license.request':
    case 'license.request.created': {
      const company = typeof row.meta === 'object' && row.meta !== null ? (row.meta as Record<string, unknown>).company : undefined;
      return company
        ? `License request from ${String(company)}`
        : 'New license request received';
    }
    case 'license.approve':
    case 'license.approved':
      return 'A license request was approved';
    case 'work.register':
    case 'work.registered':
      return 'Choreography registered successfully';
    case 'notifications.test':
      return 'Test notification';
    default:
      return row.kind.replace(/\./g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  }
}

export async function GET(request: NextRequest) {
  const { supabase, response: supabaseResponse } = createSupabaseServerClient(request);
  await ensureSupabaseSession(request, supabase);

  const { data: authData } = await supabase.auth.getUser();

  if (!authData?.user) {
    const response = NextResponse.json({ items: [], unreadCount: 0 });
    applySupabaseCookies(response, supabaseResponse);
    return response;
  }

  const { data, error } = await supabase
    .from('events')
    .select('id,kind,meta,created_at')
    .eq('user_id', authData.user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error && error.code !== 'PGRST116') {
    console.error('Failed to fetch notifications', error);
    const problem = NextResponse.json({ error: 'Unable to fetch notifications.' }, { status: 500 });
    applySupabaseCookies(problem, supabaseResponse);
    return problem;
  }

  const items = (data ?? []).map((row) => ({
    id: row.id,
    message: formatMessage(row as EventRow),
    createdAt: row.created_at,
    kind: row.kind,
    meta: row.meta ?? null,
  }));

  const response = NextResponse.json(
    {
      items,
      unreadCount: items.length,
    },
    { status: 200 },
  );
  applySupabaseCookies(response, supabaseResponse);
  return response;
}

