import type { Database } from '@chorerights/db';

import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

import type { APIRequestOptions, Page } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';

type UserRole = 'creator' | 'licensee' | 'admin';

test.describe('Mark payout as paid', () => {
  test('admin can mark payout as paid and recipient sees update', async ({ browser }, testInfo) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !isValidServiceRoleKey(serviceRoleKey)) {
      test.skip(true, 'Supabase service role key is required to seed payout instructions.');
    }

    const adminClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const baseURL =
      testInfo.project.use.baseURL ??
      process.env.E2E_BASE_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      'http://127.0.0.1:3000';

    const creatorContext = await browser.newContext({ baseURL });
    const creatorPage = await creatorContext.newPage();

    const adminContext = await browser.newContext({ baseURL });
    const adminPage = await adminContext.newPage();

    try {
      const creatorEmail = `creator-${randomUUID()}@markpaid.test`;
      const creatorId = await createSession(creatorPage, creatorEmail, 'creator');

      const adminEmail = getAdminEmail();
      const adminId = await createSession(adminPage, adminEmail, 'admin');

      await ensureUserProfile(adminClient, creatorId, creatorEmail, 'creator');
      await ensureUserProfile(adminClient, adminId, adminEmail, 'admin');

      const workId = randomUUID();
      const agreementId = randomUUID();
      const receiptId = randomUUID();
      const instructionId = randomUUID();
      const iccSerial = Math.floor(100000 + Math.random() * 900000);
      const now = new Date().toISOString();

      await insertOrThrow(adminClient, 'works', {
        id: workId,
        owner_id: creatorId,
        title: 'Payout Mark Paid',
        description: 'Test payout mark paid flow',
        metadata: null,
        icc_code: `JP-CRG-${iccSerial}`,
        video_url: null,
        status: 'ACTIVE',
        fingerprint_id: null,
      });

      await insertOrThrow(adminClient, 'agreements', {
        id: agreementId,
        work_id: workId,
        creator_id: creatorId,
        licensee_id: adminId,
        terms: { test: true },
        status: 'FINALIZED',
        polygon_tx_hash: null,
        signed_at: now,
      });

      await insertOrThrow(adminClient, 'receipts', {
        id: receiptId,
        agreement_id: agreementId,
        status: 'pending',
        gross_amount: 125000,
        currency: 'USD',
        meta: null,
        payout_instructions: [],
        distributed_at: null,
      });

      await insertOrThrow(adminClient, 'payout_instructions', {
        id: instructionId,
        receipt_id: receiptId,
        agreement_id: agreementId,
        party_user_id: creatorId,
        currency: 'USD',
        amount_cents: 62500,
        status: 'pending',
        rounding_adjustment: false,
        rounding_cents: 0,
        paid_at: null,
        txn_ref: null,
      });

      const markPaidResponse = await apiCall(adminPage, 'POST', '/api/payouts/mark-paid', {
        data: { instructionId },
      });

      expect(markPaidResponse.response.status()).toBe(200);
      expect(markPaidResponse.json?.ok).toBe(true);
      expect(markPaidResponse.json?.status).toBe('paid');
      expect(markPaidResponse.json?.instruction_id).toBe(instructionId);

      const { data: refreshedInstruction, error: refreshError } = await adminClient
        .from('payout_instructions')
        .select('status, paid_at, txn_ref')
        .eq('id', instructionId)
        .maybeSingle();

      expect(refreshError).toBeNull();
      expect(refreshedInstruction?.status).toBe('paid');
      expect(refreshedInstruction?.paid_at).toBeTruthy();

      await creatorPage.goto('/dashboard/payouts');
      await expect(creatorPage.getByTestId('payouts-table')).toBeVisible();

      const statusBadge = creatorPage.getByTestId('payout-status-badge').first();
      await expect(statusBadge).toHaveAttribute('data-status', 'paid');
      await expect(statusBadge).toHaveText(/paid/i);
    } finally {
      await Promise.all([creatorContext.close(), adminContext.close()]);
    }
  });
});

async function createSession(page: Page, email: string, role: UserRole): Promise<string> {
  const response = await apiCall(page, 'POST', '/api/test/set-auth', {
    data: { email, role },
  });

  if (!response.response.ok()) {
    console.error('[set-auth] failed', response.response.status(), response.raw);
  }

  expect(response.response.ok()).toBeTruthy();
  const userId = response.json?.userId as string | undefined;
  expect(userId).toBeTruthy();
  return userId!;
}

async function ensureUserProfile(
  client: SupabaseClient<Database>,
  userId: string,
  email: string,
  role: UserRole,
) {
  const { error } = await client.from('users').upsert(
    {
      id: userId,
      email,
      role,
    },
    { onConflict: 'id' },
  );
  if (error) {
    throw error;
  }
}

async function insertOrThrow<
  T extends keyof Database['public']['Tables'],
  P extends Database['public']['Tables'][T]['Insert'],
>(
  client: SupabaseClient<Database>,
  table: T,
  payload: P,
) {
  const { error } = await client.from(table).insert(payload);
  if (error) {
    throw error;
  }
}

async function apiCall(
  page: Page,
  method: 'GET' | 'POST',
  url: string,
  options: APIRequestOptions = {},
) {
  const response =
    method === 'GET'
      ? await page.request.get(url, options)
      : await page.request.post(url, options);

  const raw = await response.text();

  let json: any = null;
  try {
    json = raw ? JSON.parse(raw) : null;
  } catch {
    json = null;
  }

  return { response, raw, json };
}

function getAdminEmail(): string {
  const [firstEmail] = (process.env.ADMIN_EMAILS ?? 'tester@example.com')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return firstEmail ?? 'tester@example.com';
}

function isValidServiceRoleKey(value: string | undefined): value is string {
  return typeof value === 'string' && value.split('.').length === 3;
}
