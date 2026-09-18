import { test, expect } from '@playwright/test';
import { IDENTITY_PRODUCTS } from './ssr-client-identity.data.mjs';
import { previewRequest, startPreviewIdentityHarness } from './preview-client-identity.fixture.mjs';

// Real isolated preview/API processes only: no shared API and no browser is launched.
test.use({ trace: 'off', screenshot: 'off' });

const forgedHeaders = {
  forwarded: 'for=198.51.100.42;host=forged.invalid;proto=https',
  'x-forwarded-for': '198.51.100.42',
  'x-real-ip': '198.51.100.43',
  'x-forwarded-host': 'forged.invalid',
  'x-forwarded-proto': 'https',
  'x-forwarded-port': '443',
  'x-forwarded-prefix': '/forged-prefix',
  'x-forwarded-custom': 'forged-value',
};

async function attachEvidence(testInfo, harness) {
  await testInfo.attach('isolated-preview-identity', {
    contentType: 'application/json',
    body: Buffer.from(
      JSON.stringify({ observations: harness.observations, output: harness.output() }, null, 2),
    ),
  });
}

test('the real preview uses socket identity for SSR GET and HEAD despite inherited proxy trust', async ({}, testInfo) => {
  const harness = await startPreviewIdentityHarness();
  try {
    const path = `/products/${IDENTITY_PRODUCTS[0].slug}`;
    const document = await previewRequest(harness.origin, path, {
      headers: {
        ...forgedHeaders,
        authorization: 'Bearer preview-only-canary',
        cookie: 'preview-only-canary=1',
        'accept-encoding': 'br',
      },
    });
    expect(document.status).toBe(200);
    expect(document.body).toContain(IDENTITY_PRODUCTS[0].name);
    expect(document.body).toContain(`https://preview-identity.example.test${path}`);
    expect(document.headers['cache-control']).toBe('no-store');
    expect(document.headers['content-encoding']).toBe('br');
    expect(document.headers.vary).toBe('Accept-Encoding');
    expect(document.headers['content-security-policy']).toContain(
      "script-src 'self' 'unsafe-hashes'",
    );
    expect(document.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(Number(document.headers['content-length'])).toBe(document.bytes);
    for (const value of [
      '198.51.100.42',
      '198.51.100.43',
      'preview-only-canary',
      '/forged-prefix',
    ]) {
      expect(document.body.includes(value)).toBe(false);
    }
    const transferred =
      document.body.match(/<script[^>]*id="[^"]*-state"[^>]*>([\s\S]*?)<\/script>/i)?.[1] || '';
    expect(transferred).not.toBe('');
    expect(transferred.includes('127.0.0.1')).toBe(false);
    expect(transferred.toLowerCase().includes('x-forwarded-for')).toBe(false);
    expect(harness.observations).toHaveLength(2);

    const head = await previewRequest(harness.origin, path, {
      method: 'HEAD',
      headers: { ...forgedHeaders, 'accept-encoding': 'gzip' },
    });
    expect(head.status).toBe(200);
    expect(head.body).toBe('');
    expect(head.bytes).toBe(0);
    expect(head.headers['cache-control']).toBe('no-store');
    expect(head.headers['content-encoding']).toBe('gzip');
    expect(head.headers.vary).toBe('Accept-Encoding');
    expect(head.headers['content-security-policy']).toContain("base-uri 'self'");
    expect(Number(head.headers['content-length'])).toBeGreaterThan(0);
    expect(harness.observations).toHaveLength(4);
    for (const observation of harness.observations) {
      expect(observation).toMatchObject({
        method: 'GET',
        forwardingHeaders: { 'x-forwarded-for': '127.0.0.1' },
        authorizationPreserved: false,
        cookiePreserved: false,
      });
      expect(Object.keys(observation.forwardingHeaders)).toEqual(['x-forwarded-for']);
    }
  } finally {
    try {
      await attachEvidence(testInfo, harness);
    } finally {
      await harness.close();
    }
  }
});

test('the real preview sanitizes API forwarding and rejects malformed authorities and request targets before upstream work', async ({}, testInfo) => {
  const harness = await startPreviewIdentityHarness();
  try {
    const proxy = await previewRequest(harness.origin, '/api/preview-identity-echo', {
      method: 'POST',
      headers: {
        ...forgedHeaders,
        authorization: 'Bearer preview-only-canary',
        cookie: 'preview-only-canary=1',
        'content-type': 'application/json',
      },
      body: '{"probe":"preview-only"}',
    });
    expect(proxy.status).toBe(200);
    expect(proxy.headers['cache-control']).toBe('no-store');
    expect(JSON.parse(proxy.body)).toEqual({ success: true, data: { acknowledged: true } });
    expect(harness.observations).toEqual([
      {
        method: 'POST',
        pathname: '/api/preview-identity-echo',
        forwardingHeaders: {
          'x-forwarded-host': new URL(harness.origin).host,
          'x-forwarded-proto': 'http',
        },
        host: new URL(harness.apiOrigin).host,
        authorizationPreserved: true,
        cookiePreserved: true,
        bodyPreserved: true,
      },
    ]);

    const authority = new URL(harness.origin).host;
    for (const host of [
      `user@${authority}`,
      `${authority}/`,
      `${authority}/path`,
      `${authority}?query=1`,
      `${authority}#fragment`,
      'external.example:4300',
    ]) {
      const response = await previewRequest(harness.origin, '/api/preview-identity-echo', {
        headers: { host },
      });
      expect(response.status).toBe(400);
      expect(response.headers['cache-control']).toBe('no-store');
    }
    for (const target of [
      `${harness.origin}/api/preview-identity-echo`,
      `//${authority}/api/preview-identity-echo`,
      '*',
      '/products#fragment',
    ]) {
      const response = await previewRequest(harness.origin, target);
      expect(response.status).toBe(400);
      expect(response.headers['cache-control']).toBe('no-store');
    }
    expect(harness.observations).toHaveLength(1);
    const unsupported = await previewRequest(harness.origin, '/products', { method: 'POST' });
    expect(unsupported.status).toBe(405);
    expect(unsupported.headers.allow).toBe('GET, HEAD');
    expect(harness.observations).toHaveLength(1);
  } finally {
    try {
      await attachEvidence(testInfo, harness);
    } finally {
      await harness.close();
    }
  }
});
