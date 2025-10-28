import { expect, test } from '@playwright/test';
import { randomUUID } from 'crypto';

import type { APIRequestOptions, Page } from '@playwright/test';

type UserRole = 'creator' | 'licensee' | 'admin';

test.describe('Admin payout reconciliation', () => {
  test('marks payout as paid and reflects in CSV export', async ({ browser }, testInfo) => {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!isValidServiceRoleKey(serviceRoleKey)) {
      test.skip(true, 'SUPABASE_SERVICE_ROLE_KEY is required for reconciliation tests.');
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

    const adminContext = await browser.newContext({ baseURL });
    const adminPage = await adminContext.newPage();

    try {
      const creatorEmail = `creator-${randomUUID()}@payout-reconcile.test`;
      const creatorId = await createSession(creatorPage, creatorEmail, 'creator');

      const licenseeEmail = `licensee-${randomUUID()}@payout-reconcile.test`;
      await createSession(licenseePage, licenseeEmail, 'licensee');

      const adminEmail = getAdminEmail();
      await createSession(adminPage, adminEmail, 'admin');

      const workSerial = `${Math.floor(100000 + Math.random() * 900000)}`;
      const workPayload = {
        title: `Payout Reconcile ${workSerial}`,
        description: 'Admin reconciliation E2E',
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
        usage: 'Streaming package',
        territory: 'JP',
        durationDays: 14,
        feeYen: 96000,
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
        grossAmount: 88000,
        currency: 'JPY',
      });

      await createReceipt(creatorPage, serviceRoleKey, {
        agreementId,
        creatorId,
        grossAmount: 72000,
        currency: 'JPY',
      });

      await adminPage.waitForTimeout(1000);

      const now = new Date();
      const monthParam = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

      await adminPage.goto(`/admin/payouts?month=${monthParam}`);
      await expect(adminPage.getByTestId('admin-payouts-table')).toBeVisible();

      const firstRow = adminPage.getByTestId('admin-payout-row').first();
      await expect(firstRow).toBeVisible();
      const instructionId = (await firstRow.getAttribute('data-instruction-id')) ?? '';
      expect(instructionId).toBeTruthy();

      const receiptId = (await firstRow.locator('td').first().innerText()).trim();
      expect(receiptId.length).toBeGreaterThan(0);

      const csvBefore = await adminPage.request.get(
        `/api/admin/payouts/export.csv?month=${monthParam}`,
        {
          headers: {
            'x-service-role-key': serviceRoleKey,
          },
        },
      );
      expect(csvBefore.status()).toBe(200);
      const csvLines = (await csvBefore.text()).trim().split('\n');
      expect(csvLines.length).toBeGreaterThan(1);
      const header = csvLines[0];
      expect(header).toBe('receipt_id,party_user_id,currency,amount_cents,status,created_at,paid_at');
      const targetCsvRowBefore = csvLines.find((line) => line.startsWith(`${receiptId},`));
      expect(targetCsvRowBefore).toBeDefined();
      const statusBefore = targetCsvRowBefore!.split(',')[4];
      expect(statusBefore).toBe('pending');

      const targetRow = adminPage.locator(`[data-instruction-id="${instructionId}"]`);
      await expect(targetRow).toBeVisible();
      const markButton = targetRow.getByTestId('admin-mark-paid-button');
      await expect(markButton).toBeVisible();

      const patchResponsePromise = adminPage.waitForResponse((response) => {
        return (
          response.url().includes(`/api/admin/payouts/${instructionId}`) &&
          response.request().method() === 'PATCH'
        );
      });

      await markButton.click();
      const patchResponse = await patchResponsePromise;
      expect(patchResponse.status()).toBe(200);
      const patchJson = await patchResponse.json();
      expect(patchJson?.ok).toBe(true);

      const statusCell = adminPage.locator(
        `[data-instruction-id="${instructionId}"] [data-testid="admin-payout-status"]`,
      );
      await expect(statusCell).toHaveAttribute('data-status', 'paid');
      await expect(statusCell).toHaveText(/paid/i);

      const csvAfter = await adminPage.request.get(`/api/admin/payouts/export.csv?month=${monthParam}`, {
        headers: {
          'x-service-role-key': serviceRoleKey,
        },
      });
      expect(csvAfter.status()).toBe(200);
      const csvAfterLines = (await csvAfter.text()).trim().split('\n');
      const updatedRow = csvAfterLines.find((line) => line.startsWith(`${receiptId},`));
      expect(updatedRow).toBeDefined();
      const rowCells = updatedRow!.split(',');
      expect(rowCells[4]).toBe('paid');
      expect(rowCells[6]).not.toBe('');
    } finally {
      await Promise.all([creatorContext.close(), licenseeContext.close(), adminContext.close()]);
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
