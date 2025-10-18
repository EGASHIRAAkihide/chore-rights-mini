import { expect, test } from '@playwright/test';
import { randomUUID } from 'crypto';

import type { APIRequestOptions, Page } from '@playwright/test';

type UserRole = 'creator' | 'licensee' | 'admin';

const LOG_LIMIT = 50;

test.describe('MVP happy path', () => {
  let restLogs: string[] = [];

  test.beforeEach(() => {
    restLogs = [];
  });

  test.afterEach(async ({}, testInfo) => {
    if (testInfo.status !== 'passed') {
      const tail = restLogs.slice(-10);
      if (tail.length > 0) {
        console.warn('Recent REST calls (latest last):');
        tail.forEach((line) => console.warn(line));
      }
    }
  });

  test('register -> request -> approve -> export CSV', async ({ browser }, testInfo) => {
    const baseURL =
      testInfo.project.use.baseURL ??
      process.env.E2E_BASE_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      'http://127.0.0.1:3000';

    const creatorContext = await browser.newContext({ baseURL });
    const creatorPage = await creatorContext.newPage();

    const creatorEmail = `creator-${randomUUID()}@test.local`;
    await createSession(creatorPage, creatorEmail, 'creator');

    const workSerial = `${Math.floor(100000 + Math.random() * 900000)}`;
    const workPayload = {
      title: `Wave Motion ${workSerial}`,
      description: 'Playwright E2E registration',
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
    expect(workResponse.json?.id).toBeTruthy();

    const workId = workResponse.json?.id as string;

    const workFetch = await apiCall(creatorPage, 'GET', `/api/works/${workId}`);
    expect(workFetch.response.status()).toBe(200);
    expect(workFetch.json?.icc).toBe(workResponse.json?.icc);

    const licenseeContext = await browser.newContext({ baseURL });
    const licenseePage = await licenseeContext.newPage();

    const licenseeEmail = `licensee-${randomUUID()}@test.local`;
    await createSession(licenseePage, licenseeEmail, 'licensee');

    const licenseRequestPayload = {
      workId,
      usage: 'Broadcast highlight reel',
      territory: 'JP',
      durationDays: 14,
      feeYen: 75000,
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
    expect(licenseRequestResponse.json?.status).toBe('pending');
    const requestId = licenseRequestResponse.json?.id as string;
    expect(requestId).toBeTruthy();

    await licenseeContext.close();

    const approveResponse = await apiCall(creatorPage, 'POST', '/api/license/approve', {
      data: { requestId },
    });
    expect(approveResponse.response.status()).toBe(200);
    expect(approveResponse.json?.status).toBe('approved');
    expect(approveResponse.json?.agreementId).toBeTruthy();

    const adminContext = await browser.newContext({ baseURL });
    const adminPage = await adminContext.newPage();
    const adminEmail = `admin-${randomUUID()}@test.local`;
    await createSession(adminPage, adminEmail, 'admin');

    await adminPage.goto('/admin/kpi');
    await expect(adminPage.getByTestId('kpi-table')).toBeVisible();

    const aggregateResponse = await apiCall(adminPage, 'POST', '/api/test/aggregate-kpi', {
      data: {},
    });
    expect(aggregateResponse.response.status()).toBe(200);

    const today = new Date().toISOString().slice(0, 10);
    const csvExport = await apiCall(
      adminPage,
      'GET',
      `/api/admin/kpi/export.csv?from=${today}&to=${today}`,
    );

    expect(csvExport.response.status()).toBe(200);
    expect(csvExport.response.headers()['content-type'] ?? '').toContain('text/csv');

    const csvBody = csvExport.raw.trim();
    const rows = csvBody.split('\n');
    expect(rows.length).toBeGreaterThan(1);
    expect(rows[0]).toBe('day,works,requests,approvals');
    expect(rows[1].split(',').length).toBe(4);

    await adminContext.close();
    await creatorContext.close();
  });

  async function createSession(page: Page, email: string, role: UserRole) {
    const response = await apiCall(page, 'POST', '/api/test/set-auth', {
      data: { email, role },
    });
    expect(response.response.ok()).toBeTruthy();
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
    logRestCall(method, url, response.status(), raw);

    let json: any = null;
    try {
      json = raw ? JSON.parse(raw) : null;
    } catch {
      json = null;
    }

    return { response, raw, json };
  }

  function logRestCall(method: string, url: string, status: number, body: string) {
    const collapsed = body.replace(/\s+/g, ' ').trim();
    const truncated =
      collapsed.length > 200 ? `${collapsed.slice(0, 200)}…` : collapsed;
    restLogs.push(`${method} ${url} -> ${status}${truncated ? ` ${truncated}` : ''}`);
    if (restLogs.length > LOG_LIMIT) {
      restLogs.shift();
    }
  }
});
