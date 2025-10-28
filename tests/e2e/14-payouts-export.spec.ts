import { expect, test } from '@playwright/test';
import { randomUUID } from 'crypto';

import type { APIRequestOptions, Page } from '@playwright/test';

type UserRole = 'creator' | 'licensee' | 'admin';

const CSV_HEADER =
  'receipt_id,party_user_id,currency,amount_cents,status,created_at,paid_at';

test.describe('Admin payout CSV export', () => {
  test('exports payout instructions for a given month', async ({ browser }, testInfo) => {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!isValidServiceRoleKey(serviceRoleKey)) {
      test.skip(true, 'SUPABASE_SERVICE_ROLE_KEY is required to export payouts.');
    }

    const baseURL =
      testInfo.project.use.baseURL ??
      process.env.E2E_BASE_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      'http://127.0.0.1:3000';

    const creatorContext = await browser.newContext({ baseURL });
    const creatorPage = await creatorContext.newPage();

    const licenseeContext = await browser.newContext({ baseURL });
    const licenseePage = await licenseeContext.newPage();

    try {
      const creatorEmail = `creator-${randomUUID()}@payout-export.test`;
      const creatorId = await createSession(creatorPage, creatorEmail, 'creator');

      const licenseeEmail = `licensee-${randomUUID()}@payout-export.test`;
      await createSession(licenseePage, licenseeEmail, 'licensee');

      const workSerial = `${Math.floor(100000 + Math.random() * 900000)}`;
      const workPayload = {
        title: `Payout Export ${workSerial}`,
        description: 'CSV export verification',
        video: { storageKey: `public/works/${randomUUID()}.mp4` },
        icc: { country: 'JP', registrant: 'CRG', serial: workSerial },
        fingerprint: { algo: 'pose-v1', hash_or_vector: randomUUID().replace(/-/g, '') },
        delegation: { isDelegated: false, scope: [] },
        termsAccepted: true,
      };

      const workResponse = await apiCall(creatorPage, 'POST', '/api/works/register', {
        data: workPayload,
      });
      expect(workResponse.response.status()).toBe(201);
      const workId = workResponse.json?.id as string;
      expect(workId).toBeTruthy();

      const licenseRequestPayload = {
        workId,
        usage: 'Broadcast special',
        territory: 'JP',
        durationDays: 7,
        feeYen: 55000,
      };

      const licenseRequestResponse = await apiCall(
        licenseePage,
        'POST',
        '/api/license/request',
        {
          data: licenseRequestPayload,
        },
      );
      expect(licenseRequestResponse.response.status()).toBe(201);
      const requestId = licenseRequestResponse.json?.id as string;
      expect(requestId).toBeTruthy();

      const approveResponse = await apiCall(creatorPage, 'POST', '/api/license/approve', {
        data: { requestId },
      });
      expect(approveResponse.response.status()).toBe(200);
      const agreementId = approveResponse.json?.agreementId as string;
      expect(agreementId).toBeTruthy();

      await createReceipt(creatorPage, serviceRoleKey, {
        agreementId,
        creatorId,
        grossAmount: 82000,
        currency: 'JPY',
      });

      await createReceipt(creatorPage, serviceRoleKey, {
        agreementId,
        creatorId,
        grossAmount: 63000,
        currency: 'JPY',
      });

      await creatorPage.waitForTimeout(1000);

      const now = new Date();
      const monthParam = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

      const exportResponse = await creatorPage.request.get(
        `/api/admin/payouts/export.csv?month=${monthParam}`,
        {
          headers: {
            'x-service-role-key': serviceRoleKey,
          },
        },
      );

      expect(exportResponse.status()).toBe(200);
      const contentType = exportResponse.headers()['content-type'] ?? '';
      expect(contentType.toLowerCase()).toContain('text/csv');

      const csvText = await exportResponse.text();
      const lines = csvText.split('\n').filter((line) => line.length > 0);

      expect(lines.length).toBeGreaterThan(1);
      expect(lines[0]).toBe(CSV_HEADER);

      const dataRows = lines.slice(1);
      const firstRowCells = dataRows[0].split(',');
      expect(firstRowCells.length).toBe(7);
      expect(Number.isNaN(Number(firstRowCells[3]))).toBe(false);

      for (const row of dataRows) {
        const [receiptId, partyUserId, , amountCents, , createdAt] = row.split(',');
        expect(receiptId).toBeTruthy();
        expect(partyUserId).toBeTruthy();
        expect(Number.isNaN(Number(amountCents))).toBe(false);
        const createdDate = new Date(createdAt);
        expect(Number.isNaN(createdDate.getTime())).toBe(false);
        expect(createdDate.getUTCFullYear()).toBe(now.getUTCFullYear());
        expect(createdDate.getUTCMonth()).toBe(now.getUTCMonth());
      }
    } finally {
      await Promise.all([creatorContext.close(), licenseeContext.close()]);
    }
  });
});

async function createReceipt(
  page: Page,
  serviceRoleKey: string,
  options: { agreementId: string; creatorId: string; grossAmount: number; currency: string },
) {
  const response = await page.request.post('/api/receipts', {
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      'content-type': 'application/json',
    },
    data: {
      agreementId: options.agreementId,
      grossAmount: options.grossAmount,
      currency: options.currency,
      creatorId: options.creatorId,
    },
  });
  expect(response.status()).toBe(201);
}

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

function isValidServiceRoleKey(value: string | undefined): value is string {
  return typeof value === 'string' && value.split('.').length === 3;
}
