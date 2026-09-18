import { test, expect } from '@playwright/test';
import {
  IDENTITY_PRODUCTS,
  IDENTITY_QA,
  MALFORMED_IDENTITY_HEADERS,
} from './ssr-client-identity.data.mjs';
import {
  documentState,
  readDocument,
  startIdentityHarness,
} from './ssr-client-identity.fixture.mjs';

// These HTTP-only integration cases do not use the shared local API or launch a browser.
test.use({ trace: 'off', screenshot: 'off' });

function expectPrivateDataAbsent(document, extraIdentity = '') {
  for (const value of [
    IDENTITY_QA.credentialCanary,
    IDENTITY_QA.clientA,
    IDENTITY_QA.clientB,
    IDENTITY_QA.forgedClient,
    IDENTITY_QA.secondForgedClient,
    IDENTITY_QA.forgedPrefix,
    extraIdentity,
  ].filter(Boolean)) {
    expect(document.html).not.toContain(value);
  }
  expect(document.html.toLowerCase()).not.toContain('x-forwarded-for');
  expect(document.headers['cache-control']).toBe('no-store');
}

function expectProductDocument(document, product) {
  expect(document.status).toBe(200);
  expect(document.html).toContain(product.name);
  expect(document.html).toContain('product-structured-data');
  expectPrivateDataAbsent(document);
  const state = documentState(document.html);
  expect(state.canonical).toBe(`${IDENTITY_QA.publicOrigin}/products/${product.slug}`);
  expect(state.cacheUrls.sort()).toEqual(
    [
      `${IDENTITY_QA.publicOrigin}/api/products/${product.slug}`,
      `${IDENTITY_QA.publicOrigin}/api/settings/public`,
    ].sort(),
  );
}

function expectOnlyPublicAnonymousReads(observations) {
  expect(observations.length).toBeGreaterThan(0);
  for (const observation of observations) {
    expect(observation).toMatchObject({
      method: 'GET',
      isPublicRead: true,
      forwardedForCount: 1,
      authorization: false,
      cookie: false,
    });
  }
}

async function attachEvidence(testInfo, harness, label) {
  await testInfo.attach(label, {
    contentType: 'application/json',
    body: Buffer.from(
      JSON.stringify(
        {
          observations: harness.observations,
          edgeObservations: harness.edgeObservations,
          overlapCompleted: harness.overlapCompleted(),
          serverOutput: harness.serverOutput(),
        },
        null,
        2,
      ),
    ),
  });
}

test('the real SSR handler isolates concurrent sanitized client contexts without serializing identity', async ({}, testInfo) => {
  const harness = await startIdentityHarness(IDENTITY_QA.trustedLoopback, true);
  try {
    const documents = await Promise.all(
      IDENTITY_PRODUCTS.map((product) =>
        readDocument(harness.edgeOrigin, `/products/${product.slug}`, {
          forwardedForValues: [IDENTITY_QA.forgedClient, IDENTITY_QA.secondForgedClient],
        }),
      ),
    );
    expect(harness.overlapCompleted()).toBe(true);
    for (let index = 0; index < IDENTITY_PRODUCTS.length; index += 1) {
      expectProductDocument(documents[index], IDENTITY_PRODUCTS[index]);
    }
    expect(
      [...harness.edgeObservations].sort((a, b) => a.pathname.localeCompare(b.pathname)),
    ).toEqual(
      IDENTITY_PRODUCTS.map((product, index) => ({
        pathname: `/products/${product.slug}`,
        receivedForwardedForCount: 2,
        forwardedClientIp: index === 0 ? IDENTITY_QA.clientA : IDENTITY_QA.clientB,
      })),
    );
    expect(harness.observations).toHaveLength(4);
    expect(
      harness.observations
        .filter((entry) => entry.pathname === '/api/settings/public')
        .map((entry) => entry.forwardedFor)
        .sort(),
    ).toEqual([IDENTITY_QA.clientA, IDENTITY_QA.clientB].sort());
    for (const [index, product] of IDENTITY_PRODUCTS.entries()) {
      expect(
        harness.observations.find((entry) => entry.pathname === `/api/products/${product.slug}`)
          ?.forwardedFor,
      ).toBe(index === 0 ? IDENTITY_QA.clientA : IDENTITY_QA.clientB);
    }
    expectOnlyPublicAnonymousReads(harness.observations);

    const publicReadCount = harness.observations.length;
    for (const pathname of IDENTITY_QA.privatePaths) {
      const document = await readDocument(harness.edgeOrigin, pathname, {
        forwardedForValues: [IDENTITY_QA.forgedClient, IDENTITY_QA.secondForgedClient],
      });
      expect(document.status).toBe(200);
      expect(document.html.match(/<app-root\b[^>]*>([\s\S]*?)<\/app-root>/i)?.[1].trim()).toBe('');
      expectPrivateDataAbsent(document);
      expect(documentState(document.html).cacheUrls).toEqual([]);
    }
    expect(harness.observations).toHaveLength(publicReadCount);

    harness.setProductUnavailable();
    const failed = await readDocument(harness.edgeOrigin, `/products/${IDENTITY_PRODUCTS[0].slug}`);
    expect(failed.status).toBe(503);
    expect(failed.html).toContain('تفاصيل المنتج مش متاحة دلوقتي');
    expect(failed.html).not.toContain('product-structured-data');
    expectPrivateDataAbsent(failed);
    expectOnlyPublicAnonymousReads(harness.observations);
    expect(harness.observations).toHaveLength(publicReadCount + 2);
    expect(
      harness.observations
        .slice(publicReadCount)
        .every((entry) => entry.forwardedFor === IDENTITY_QA.clientA),
    ).toBe(true);
  } finally {
    try {
      await attachEvidence(testInfo, harness, 'trusted-edge-ssr-identity');
    } finally {
      await harness.close();
    }
  }
});

test('direct sockets ignore forged forwarding with no trusted edge and a nonmatching allowlist', async ({}, testInfo) => {
  for (const trustedProxies of ['', IDENTITY_QA.unrelatedProxies]) {
    const harness = await startIdentityHarness(trustedProxies);
    try {
      for (const repeatedForwardedFor of [false, true]) {
        const document = await readDocument(
          harness.origin,
          `/products/${IDENTITY_PRODUCTS[0].slug}`,
          {
            forwardedForValues: repeatedForwardedFor
              ? [IDENTITY_QA.forgedClient, IDENTITY_QA.secondForgedClient]
              : [IDENTITY_QA.forgedClient],
          },
        );
        expectProductDocument(document, IDENTITY_PRODUCTS[0]);
        expectPrivateDataAbsent(document, '127.0.0.1');
      }
      expect(harness.observations).toHaveLength(4);
      expectOnlyPublicAnonymousReads(harness.observations);
      expect(harness.observations.every((entry) => entry.forwardedFor === '127.0.0.1')).toBe(true);
      expect(harness.edgeObservations).toEqual([]);
    } finally {
      try {
        await attachEvidence(
          testInfo,
          harness,
          trustedProxies ? 'untrusted-edge-ssr-identity' : 'default-direct-ssr-identity',
        );
      } finally {
        await harness.close();
      }
    }
  }
});

test('a trusted socket falls back to its own address for missing, repeated or malformed forwarding', async ({}, testInfo) => {
  const harness = await startIdentityHarness(IDENTITY_QA.trustedLoopback);
  try {
    for (const example of MALFORMED_IDENTITY_HEADERS) {
      await test.step(example.label, async () => {
        const offset = harness.observations.length;
        const document = await readDocument(
          harness.origin,
          `/products/${IDENTITY_PRODUCTS[0].slug}`,
          { forwardedForValues: example.values },
        );
        expectProductDocument(document, IDENTITY_PRODUCTS[0]);
        expectPrivateDataAbsent(document, '127.0.0.1');
        const reads = harness.observations.slice(offset);
        expect(reads).toHaveLength(2);
        expectOnlyPublicAnonymousReads(reads);
        expect(reads.every((entry) => entry.forwardedFor === '127.0.0.1')).toBe(true);
      });
    }
    expect(harness.edgeObservations).toEqual([]);
  } finally {
    try {
      await attachEvidence(testInfo, harness, 'malformed-trusted-edge-ssr-identity');
    } finally {
      await harness.close();
    }
  }
});
