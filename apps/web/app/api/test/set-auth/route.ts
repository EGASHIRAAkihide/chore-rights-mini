import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const payloadSchema = z.object({
  email: z.string().email(),
  role: z.enum(['creator', 'licensee', 'admin']),
});

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase environment variables missing for test auth helper.');
    return NextResponse.json(
      { error: 'Supabase environment not configured.' },
      { status: 500 },
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const detail = issue
      ? `${issue.path.join('.') || 'body'}: ${issue.message}`
      : 'Invalid request payload.';
    return NextResponse.json({ error: detail }, { status: 400 });
  }

  const { email, role } = parsed.data;
  const password = process.env.E2E_TEST_PASSWORD ?? 'Password123!';

  const supabase = createClient<any>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  let userId: string | undefined;

  const signUpResult = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role },
    },
  });

  if (signUpResult.error) {
    if (!signUpResult.error.message?.includes('registered')) {
      console.error('Failed to sign up test user', signUpResult.error);
      return NextResponse.json(
        { error: 'Unable to create test user.' },
        { status: 500 },
      );
    }
  }

  userId = signUpResult.data.user?.id ?? undefined;

  if (!userId) {
    const signInResult = await supabase.auth.signInWithPassword({ email, password });
    if (signInResult.error || !signInResult.data.user) {
      console.error('Failed to sign in test user', signInResult.error);
      return NextResponse.json(
        { error: 'Unable to authenticate test user.' },
        { status: 500 },
      );
    }
    userId = signInResult.data.user.id;
  }

  const sessionResult = await supabase.auth.getSession();
  let accessToken = sessionResult.data.session?.access_token;
  let refreshToken = sessionResult.data.session?.refresh_token;

  if (!accessToken || !refreshToken) {
    const signInResult = await supabase.auth.signInWithPassword({ email, password });
    if (signInResult.error || !signInResult.data.session) {
      console.error('Failed to sign in test user', signInResult.error);
      return NextResponse.json(
        { error: 'Unable to authenticate test user.' },
        { status: 500 },
      );
    }
    accessToken = signInResult.data.session.access_token;
    refreshToken = signInResult.data.session.refresh_token;
    userId = signInResult.data.user.id;
  }

  const sessionClient = createClient<any>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const upsertResult = await sessionClient
    .from('users')
    .upsert({ id: userId, email, role }, { onConflict: 'id' });

  if (upsertResult.error) {
    console.error('Failed to upsert test user profile', upsertResult.error);
    return NextResponse.json(
      { error: 'Unable to provision test user profile.' },
      { status: 500 },
    );
  }

  const response = NextResponse.json(
    { ok: true, userId, role },
    { status: 200 },
  );

  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: (process.env.NODE_ENV as string) === 'production',
    path: '/',
    maxAge: 60 * 60,
  };
  response.cookies.set('sb-access-token', accessToken, cookieOptions);
  response.cookies.set('sb-refresh-token', refreshToken, cookieOptions);

  return response;
}
