import { expect, test } from '@playwright/test';
import { randomUUID } from 'crypto';

import type { APIRequestOptions, Page } from '@playwright/test';

type UserRole = 'creator' | 'licensee' | 'admin';

test.describe('Payouts dashboard', () => {
  test('shows distributed payouts for creator', async ({ browser }, testInfo) => {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      test.skip(true, 'SUPABASE_SERVICE_ROLE_KEY is required to seed payout receipts');
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
      const creatorEmail = `creator-${randomUUID()}@payout.test`;
      const creatorId = await createSession(creatorPage, creatorEmail, 'creator');

      const workSerial = `${Math.floor(100000 + Math.random() * 900000)}`;
      const workPayload = {
        title: `Payout Flow ${workSerial}`,
        description: 'Automated payout verification',
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

      const licenseeEmail = `licensee-${randomUUID()}@payout.test`;
      await createSession(licenseePage, licenseeEmail, 'licensee');

      const licenseRequestPayload = {
        workId,
        usage: 'Broadcast feature highlight',
        territory: 'JP',
        durationDays: 14,
        feeYen: 88000,
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

      const grossAmount = 120000;
      const grossCents = Math.round(grossAmount * 100);
      const creatorShare = 0.7;
      const platformShare = 0.3;
      const creatorExpectedCents = Math.round(grossCents * creatorShare);
      const platformFeeCents = Math.round(grossCents * platformShare);
      const expectedNet = grossCents - platformFeeCents;

      const receiptResponse = await creatorPage.request.post('/api/receipts', {
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          'content-type': 'application/json',
        },
        data: {
          agreementId,
          grossAmount,
          currency: 'JPY',
          creatorId,
          split: {
            creator: creatorShare,
            licensee: platformShare,
          },
          memo: 'E2E payout distribution',
        },
      });

      expect(receiptResponse.status()).toBe(201);

      await creatorPage.goto('/dashboard/payouts');
      await expect(creatorPage.getByTestId('payouts-table')).toBeVisible();

      const rows = await creatorPage.getByTestId('payout-row').all();
      expect(rows.length).toBeGreaterThan(0);

      const amountCents = await creatorPage.evaluate(() => {
        return Array.from(
          document.querySelectorAll<HTMLTableCellElement>('tr[data-testid="payout-row"] td[data-amount-cents]'),
        ).map((cell) => Number(cell.getAttribute('data-amount-cents')));
      });

      const summedCents = amountCents.reduce((sum, value) => sum + value, 0);
      expect(summedCents).toBeGreaterThan(0);
      expect(Math.abs(summedCents - expectedNet)).toBeLessThanOrEqual(1);
      expect(Math.abs(summedCents - creatorExpectedCents)).toBeLessThanOrEqual(1);

      const totalEntries = await creatorPage.evaluate(() => {
        return Array.from(document.querySelectorAll('[data-testid="payouts-total-row"]')).map((node) => ({
          currency: node.getAttribute('data-currency'),
          total: Number(node.getAttribute('data-total-cents')),
        }));
      });

      const jpyEntry = totalEntries.find((entry) => entry.currency === 'JPY');
      expect(jpyEntry).toBeDefined();
      expect(jpyEntry?.total ?? 0).toBeGreaterThanOrEqual(summedCents);
    } finally {
      await Promise.all([creatorContext.close(), licenseeContext.close()]);
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
