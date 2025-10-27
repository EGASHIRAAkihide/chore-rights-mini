import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import {
  applySupabaseCookies,
  createAdminSupabaseClient,
  createServerSupabaseClient,
} from '../../_utils/supabase';

function isRouteEnabled() {
  return process.env.E2E_ENABLED === '1' && process.env.NODE_ENV !== 'production';
}

function missingSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url && anonKey && serviceRoleKey) {
    return null;
  }

  return { url, anonKey, serviceRoleKey };
}

export async function POST(request: NextRequest) {
  if (!isRouteEnabled()) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const envStatus = missingSupabaseEnv();
  if (envStatus) {
    console.error('Supabase environment variables missing for test auth helper.', envStatus);
    return NextResponse.json(
      { ok: false, error: 'Supabase environment not configured.' },
      { status: 500 },
    );
  }

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  const role = typeof body?.role === 'string' && body.role ? body.role : undefined;

  if (!email) {
    return NextResponse.json({ ok: false, error: 'Email is required.' }, { status: 400 });
  }

  let supabaseResponse: NextResponse | null = null;
  const respond = (payload: Record<string, unknown>, init: ResponseInit) => {
    const jsonResponse = NextResponse.json(payload, init);
    if (supabaseResponse) {
      applySupabaseCookies(jsonResponse, supabaseResponse);
    }
    return jsonResponse;
  };
  try {
    const admin = createAdminSupabaseClient();
    const { error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      app_metadata: role ? { role } : {},
      user_metadata: { e2e: true },
    });

    if (createError && !/already (exists|registered)/i.test(createError.message ?? '')) {
      console.error('Failed to create test user via admin API', { email }, createError);
      return respond({ ok: false, error: 'Unable to create test user.' }, { status: 500 });
    }

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    const actionLink = linkData?.properties?.action_link;
    if (linkError || !actionLink) {
      console.error('Failed to generate magic link for test user', { email }, linkError);
      return respond({ ok: false, error: 'Unable to generate magic link.' }, { status: 500 });
    }

    let code: string | null = null;
    try {
      const linkUrl = new URL(actionLink);
      code = linkUrl.searchParams.get('code');
    } catch (parseError) {
      console.error('Failed to parse magic link URL for test user', { email }, parseError);
      return respond({ ok: false, error: 'Invalid magic link received.' }, { status: 500 });
    }

    if (!code) {
      console.error('Magic link code missing for test user', { email });
      return respond({ ok: false, error: 'Magic link code missing.' }, { status: 500 });
    }

    const { supabase, response: serverResponse } = createServerSupabaseClient(request);
    supabaseResponse = serverResponse;
    const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError || !exchangeData?.user) {
      console.error('Failed to exchange magic link code for session', { email }, exchangeError);
      return respond({ ok: false, error: 'Unable to establish session.' }, { status: 500 });
    }

    return respond({ ok: true, userId: exchangeData.user.id }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error during test auth setup', { email }, error);
    return respond({ ok: false, error: 'Unexpected error establishing session.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isRouteEnabled()) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  try {
    const envStatus = missingSupabaseEnv();
    if (envStatus) {
      console.error('Supabase environment variables missing for sign-out helper.', envStatus);
      return NextResponse.json(
        { ok: false, error: 'Supabase environment not configured.' },
        { status: 500 },
      );
    }

    const { supabase, response: supabaseResponse } = createServerSupabaseClient(request);
    await supabase.auth.signOut();

    const response = NextResponse.json({ ok: true }, { status: 200 });
    applySupabaseCookies(response, supabaseResponse);
    return response;
  } catch (error) {
    console.error('Failed to sign out test session', error);
    return NextResponse.json({ ok: false, error: 'Unable to sign out.' }, { status: 500 });
  }
}
