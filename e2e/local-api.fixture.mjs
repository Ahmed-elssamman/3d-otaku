import { test as base, expect } from '@playwright/test';
import { setTimeout as delay } from 'node:timers/promises';
import { writeFile } from 'node:fs/promises';

const API_LIMIT = 300;
const API_WINDOW_SECONDS = 60;
const SCENARIO_RESERVE = 150;
const FIXTURE_TIMEOUT_MS = 90000;
const PREFLIGHT_DEADLINE_MS = 89000;
const ACTION_LIMIT = 30;
const ACTION_WINDOW_SECONDS = 900;

function localOrigin(value, ports) {
  const url = new URL(value);
  if (
    url.protocol !== 'http:' ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    !ports.includes(Number(url.port)) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error('API quota preflight requires the local frontend and disposable API.');
  }
  return url.origin;
}

function numericParameter(entry, name) {
  const match = entry.match(new RegExp(`(?:^|;)\\s*${name}=(\\d+)(?:\\s*;|\\s*$)`));
  return match ? Number(match[1]) : null;
}

function apiQuota(headers) {
  const policies = (headers['ratelimit-policy'] || '').split(',').map((entry) => entry.trim());
  const policy =
    policies.find(
      (entry) =>
        numericParameter(entry, 'q') === API_LIMIT &&
        numericParameter(entry, 'w') === API_WINDOW_SECONDS,
    ) || '';
  const identifier = policy.match(/^"[^"]+"/)?.[0] || '';
  const limits = (headers['ratelimit'] || '').split(',').map((entry) => entry.trim());
  const limit = limits.find((entry) => identifier && entry.startsWith(`${identifier};`)) || '';
  const remaining = numericParameter(limit, 'r');
  const resetSeconds = numericParameter(limit, 't');
  if (
    remaining === null ||
    resetSeconds === null ||
    !Number.isSafeInteger(remaining) ||
    !Number.isSafeInteger(resetSeconds) ||
    remaining < 0 ||
    remaining > API_LIMIT ||
    resetSeconds < 0
  ) {
    throw new Error('Local API health did not expose a valid draft-8 300/minute quota.');
  }
  return { remaining, resetSeconds };
}

function actionBucket(response, webOrigin, apiOrigin) {
  const request = response.request();
  const url = new URL(response.url());
  if (request.method() !== 'POST' || ![webOrigin, apiOrigin].includes(url.origin)) return null;
  if (['/api/auth/login', '/api/auth/register'].includes(url.pathname)) return 'auth';
  if (['/api/orders', '/api/custom-orders', '/api/contact-messages'].includes(url.pathname))
    return 'submission';
  return null;
}

function actionQuota(headers) {
  const policy = (headers['ratelimit-policy'] || '')
    .split(',')
    .map((entry) => entry.trim())
    .find(
      (entry) =>
        numericParameter(entry, 'q') === ACTION_LIMIT &&
        numericParameter(entry, 'w') === ACTION_WINDOW_SECONDS,
    );
  const identifier = policy?.match(/^"[^"]+"/)?.[0] || '';
  const limit = (headers['ratelimit'] || '')
    .split(',')
    .map((entry) => entry.trim())
    .find((entry) => identifier && entry.startsWith(`${identifier};`));
  const remaining = numericParameter(limit || '', 'r');
  const resetSeconds = numericParameter(limit || '', 't');
  if (
    remaining === null ||
    resetSeconds === null ||
    !Number.isSafeInteger(remaining) ||
    !Number.isSafeInteger(resetSeconds) ||
    remaining < 0 ||
    remaining > ACTION_LIMIT ||
    resetSeconds < 0 ||
    resetSeconds > ACTION_WINDOW_SECONDS
  ) {
    throw new Error('A local action response did not expose a valid draft-8 30/900 quota.');
  }
  return { limit: ACTION_LIMIT, windowSeconds: ACTION_WINDOW_SECONDS, remaining, resetSeconds };
}

async function reserveApiBudget(request, origin, testInfo) {
  const deadline = Date.now() + PREFLIGHT_DEADLINE_MS;
  while (Date.now() < deadline) {
    const response = await request.get(`${origin}/api/health`, {
      failOnStatusCode: false,
      maxRedirects: 0,
      maxRetries: 0,
      timeout: Math.min(10000, deadline - Date.now()),
    });
    let quota = null;
    const status = response.status();
    try {
      if (status !== 200 && status !== 429) {
        throw new Error(`Local API health failed with HTTP ${status}.`);
      }
      quota = apiQuota(response.headers());
    } finally {
      await response.dispose();
    }
    if (status === 200 && quota.remaining >= SCENARIO_RESERVE) return;

    const waitSeconds = quota.resetSeconds + 1;
    if (Date.now() + waitSeconds * 1000 >= deadline) {
      throw new Error('Local API quota cannot recover within the 90-second preflight timeout.');
    }
    process.stdout.write(
      `[local-api quota] ${testInfo.project.name} / ${testInfo.title}: remaining=${quota.remaining}; waitSeconds=${waitSeconds}\n`,
    );
    await delay(waitSeconds * 1000);
  }
  throw new Error('Local API quota preflight exceeded its 90-second timeout.');
}

export { expect };

export async function withCheckoutQuote(request, apiOrigin, payload) {
  const origin = localOrigin(apiOrigin, [4000]);
  const response = await request.post(`${origin}/api/orders/quote`, {
    data: { items: payload.items },
    maxRedirects: 0,
    maxRetries: 0,
  });
  expect(response.status(), 'Read the current local checkout quote').toBe(200);
  const { data: quote } = await response.json();
  expect(quote.quoteVersion).toBe(2);
  expect(quote.quoteFingerprint).toMatch(/^[a-f0-9]{64}$/);
  expect(quote.items).toHaveLength(payload.items.length);
  for (const item of quote.items) {
    expect(item.configuration.version).toBe(1);
    expect(item.configurationFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(item).not.toHaveProperty('manufacturingSnapshot');
  }
  return {
    ...payload,
    expectedQuoteFingerprint: quote.quoteFingerprint,
    expectedQuoteVersion: quote.quoteVersion,
  };
}

export const test = base.extend({
  _localApiBudget: [
    async ({ request, context, baseURL }, use, testInfo) => {
      const webOrigin = localOrigin(baseURL || 'http://127.0.0.1:4200', [4200, 4300]);
      const apiOrigin = localOrigin(
        process.env.STORE_API_ORIGIN || 'http://127.0.0.1:4000',
        [4000],
      );
      await reserveApiBudget(request, apiOrigin, testInfo);
      const evidence = [];
      const pendingReads = [];
      let readFailed = false;
      const observeResponse = (response) => {
        const bucket = actionBucket(response, webOrigin, apiOrigin);
        if (!bucket) return;
        const observedAtUtc = new Date().toISOString();
        pendingReads.push(
          response
            .allHeaders()
            .then((headers) => {
              evidence.push({
                observedAtUtc,
                bucket,
                status: response.status(),
                ...actionQuota(headers),
              });
            })
            .catch(() => {
              readFailed = true;
            }),
        );
      };
      context.on('response', observeResponse);
      try {
        await use(null);
      } finally {
        context.off('response', observeResponse);
        await Promise.all(pendingReads);
        evidence.sort((left, right) => left.observedAtUtc.localeCompare(right.observedAtUtc));
        await writeFile(
          testInfo.outputPath('quota-evidence.json'),
          JSON.stringify(evidence, null, 2),
        );
        if (readFailed)
          throw new Error('Local browser quota evidence was incomplete; no quota may be inferred.');
      }
    },
    { auto: true, timeout: FIXTURE_TIMEOUT_MS },
  ],
});
