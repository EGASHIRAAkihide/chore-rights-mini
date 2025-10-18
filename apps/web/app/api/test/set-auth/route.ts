import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { createClient } from '@supabase/supabase-js';
import { createHmac, randomBytes } from 'crypto';
import { z } from 'zod';

const payloadSchema = z.object({
  email: z.string().email(),
  role: z.enum(['creator', 'licensee', 'admin']),
});

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signJwt(payload: Record<string, unknown>, secret: string): string {
  const headerSegment = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadSegment = base64UrlEncode(JSON.stringify(payload));
  const data = `${headerSegment}.${payloadSegment}`;
  const signature = base64UrlEncode(
    createHmacSha256(secret)
      .update(data)
      .digest(),
  );

  return `${data}.${signature}`;
}

function createHmacSha256(secret: string) {
  return createHmac('sha256', secret);
}

function createRefreshToken(): string {
  return base64UrlEncode(randomBytes(48));
}

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;

  if (!supabaseUrl || !supabaseAnonKey || !supabaseJwtSecret) {
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

  const issuedAt = Math.floor(Date.now() / 1000);
  const expiration = issuedAt + 60 * 60;

  const accessTokenPayload = {
    aud: 'authenticated',
    exp: expiration,
    sub: userId,
    email,
    role,
    iss: supabaseUrl,
    iat: issuedAt,
    aal: 'aal1',
    amr: ['password'],
    app_metadata: {
      provider: 'email',
      providers: ['email'],
      role,
    },
    user_metadata: {
      role,
    },
  };

  const accessToken = signJwt(accessTokenPayload, supabaseJwtSecret);
  const refreshToken = createRefreshToken();

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
