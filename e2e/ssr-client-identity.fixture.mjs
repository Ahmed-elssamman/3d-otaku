import { fork } from 'node:child_process';
import { createServer, request as httpRequest } from 'node:http';
import { fileURLToPath } from 'node:url';
import { IDENTITY_PRODUCTS, IDENTITY_QA, IDENTITY_SETTINGS } from './ssr-client-identity.data.mjs';

const workspace = fileURLToPath(new URL('../', import.meta.url));

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve(`http://127.0.0.1:${server.address().port}`);
    });
  });
}

function closeServer(server) {
  if (!server.listening) return Promise.resolve();
  server.closeAllConnections();
  return new Promise((resolve) => server.close(resolve));
}

function headerCount(rawHeaders, name) {
  let count = 0;
  for (let index = 0; index < rawHeaders.length; index += 2) {
    if (rawHeaders[index].toLowerCase() === name) count += 1;
  }
  return count;
}

function sendJson(response, status, data) {
  const headers = { 'Content-Type': 'application/json' };
  // Public success headers match the real API; no-store would suppress Angular transfer cache.
  if (status !== 200) headers['Cache-Control'] = 'no-store';
  response.writeHead(status, headers).end(JSON.stringify(data));
}

async function startRenderer(apiOrigin, trustedProxies) {
  const child = fork(fileURLToPath(new URL('./ssr-client-identity-server.mjs', import.meta.url)), {
    cwd: workspace,
    env: {
      ...process.env,
      SSR_IDENTITY_QA_CHILD: '1',
      STORE_API_ORIGIN: apiOrigin,
      STORE_PUBLIC_ORIGIN: IDENTITY_QA.publicOrigin,
      STORE_TRUSTED_PROXY_ADDRESSES: trustedProxies,
      NG_ALLOWED_HOSTS: 'localhost,127.0.0.1',
    },
    execArgv: [],
    silent: true,
    windowsHide: true,
  });
  let output = '';
  const collectOutput = (chunk) => {
    output = (output + chunk.toString()).slice(-20000);
  };
  child.stdout.on('data', collectOutput);
  child.stderr.on('data', collectOutput);
  child.on('error', (error) => collectOutput(error.message));
  const exited = new Promise((resolve) => child.once('exit', resolve));
  let stopped = false;
  const stop = async () => {
    if (stopped) return;
    stopped = true;
    if (child.exitCode !== null || child.signalCode !== null) return;
    if (child.connected) {
      child.send({ type: 'close' }, (error) => {
        if (error) collectOutput(error.message);
      });
    }
    const timer = setTimeout(() => child.kill(), 3000);
    try {
      await exited;
    } finally {
      clearTimeout(timer);
    }
  };
  try {
    const origin = await new Promise((resolve, reject) => {
      const finish = (error, origin = '') => {
        clearTimeout(timer);
        child.off('exit', onExit);
        child.off('error', onError);
        child.off('message', onMessage);
        if (error) reject(error);
        else resolve(origin);
      };
      const onExit = () => finish(new Error('Isolated SSR exited before becoming ready.'));
      const onError = (error) => finish(error);
      const onMessage = (message) => {
        if (
          message?.type === 'ready' &&
          Number.isInteger(message.port) &&
          message.port > 0 &&
          message.port <= 65535
        ) {
          finish(null, `http://127.0.0.1:${message.port}`);
        }
      };
      const timer = setTimeout(() => finish(new Error('Isolated SSR startup timed out.')), 20000);
      child.once('exit', onExit);
      child.once('error', onError);
      child.on('message', onMessage);
    });
    return { origin, stop, output: () => output };
  } catch (error) {
    await stop();
    throw new Error(`${error.message}\n${output}`);
  }
}

export async function startIdentityHarness(trustedProxies, overlapSettings = false) {
  const observations = [];
  const edgeObservations = [];
  const heldSettings = [];
  let overlapCompleted = false;
  let unavailableProduct = false;
  let gateTimer = null;
  let renderer = null;
  let edge = null;
  const releaseSettings = () => {
    if (gateTimer) clearTimeout(gateTimer);
    gateTimer = null;
    for (const response of heldSettings.splice(0)) {
      if (!response.destroyed) {
        sendJson(response, 200, { success: true, message: '', data: IDENTITY_SETTINGS });
      }
    }
  };
  const api = createServer((request, response) => {
    const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
    const isPublicRead =
      request.method === 'GET' &&
      /^\/api\/(?:products(?:\/[^/]+)?|settings\/public)\/?$/.test(pathname);
    observations.push({
      method: request.method,
      pathname,
      isPublicRead,
      forwardedFor: request.headers['x-forwarded-for'] || '',
      forwardedForCount: headerCount(request.rawHeaders, 'x-forwarded-for'),
      authorization: Boolean(request.headers.authorization),
      cookie: Boolean(request.headers.cookie),
    });
    if (!isPublicRead) {
      sendJson(response, 403, { success: false });
      return;
    }
    if (pathname === '/api/settings/public') {
      if (overlapSettings && !overlapCompleted) {
        heldSettings.push(response);
        if (heldSettings.length === 2) {
          overlapCompleted = true;
          releaseSettings();
        } else {
          gateTimer = setTimeout(() => {
            for (const held of heldSettings.splice(0)) {
              if (!held.destroyed) sendJson(held, 503, { success: false });
            }
          }, 10000);
        }
      } else {
        sendJson(response, 200, { success: true, message: '', data: IDENTITY_SETTINGS });
      }
      return;
    }
    const product = IDENTITY_PRODUCTS.find((entry) => pathname === `/api/products/${entry.slug}`);
    if (product) {
      sendJson(
        response,
        unavailableProduct ? 503 : 200,
        unavailableProduct
          ? { success: false, message: 'Controlled isolated product outage.' }
          : { success: true, message: '', data: product },
      );
      return;
    }
    sendJson(response, 404, { success: false });
  });

  const close = async () => {
    if (gateTimer) clearTimeout(gateTimer);
    gateTimer = null;
    for (const response of heldSettings.splice(0)) response.destroy();
    if (edge) await closeServer(edge);
    if (renderer) await renderer.stop();
    await closeServer(api);
  };

  try {
    const apiOrigin = await listen(api);
    renderer = await startRenderer(apiOrigin, trustedProxies);
    edge = createServer((request, response) => {
      const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
      const clientIp =
        pathname === `/products/${IDENTITY_PRODUCTS[1].slug}`
          ? IDENTITY_QA.clientB
          : IDENTITY_QA.clientA;
      edgeObservations.push({
        pathname,
        receivedForwardedForCount: headerCount(request.rawHeaders, 'x-forwarded-for'),
        forwardedClientIp: clientIp,
      });
      // The edge's identity is fixture-controlled, never copied from supplied forwarding headers.
      const headers = { ...request.headers, host: new URL(renderer.origin).host };
      delete headers.forwarded;
      delete headers['x-real-ip'];
      delete headers['x-forwarded-host'];
      delete headers['x-forwarded-proto'];
      delete headers['x-forwarded-port'];
      headers['x-forwarded-for'] = clientIp;
      const upstream = httpRequest(new URL(request.url, renderer.origin), {
        method: 'GET',
        headers,
      });
      upstream.setTimeout(20000, () => upstream.destroy(new Error('Isolated edge timed out.')));
      upstream.on('response', (upstreamResponse) => {
        response.writeHead(upstreamResponse.statusCode, upstreamResponse.headers);
        upstreamResponse.pipe(response);
      });
      upstream.on('error', () => {
        if (!response.headersSent) response.writeHead(502, { 'Content-Type': 'text/plain' });
        response.end('Isolated edge could not render.');
      });
      upstream.end();
    });
    const edgeOrigin = await listen(edge);
    return {
      origin: renderer.origin,
      apiOrigin,
      edgeOrigin,
      observations,
      edgeObservations,
      overlapCompleted: () => overlapCompleted,
      setProductUnavailable: () => {
        unavailableProduct = true;
      },
      serverOutput: renderer.output,
      close,
    };
  } catch (error) {
    await close();
    throw error;
  }
}

export function readDocument(origin, pathname, options = {}) {
  const url = new URL(pathname, origin);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || !url.port) {
    throw new Error('SSR identity QA document requests must remain on loopback.');
  }
  const headers = [
    'Host',
    url.host,
    'Accept',
    'text/html',
    'Cookie',
    `qa=${IDENTITY_QA.credentialCanary}`,
    'Authorization',
    `Bearer ${IDENTITY_QA.credentialCanary}`,
    'Forwarded',
    `for=${IDENTITY_QA.forgedClient};host=forged.example.test;proto=https`,
    'X-Forwarded-Host',
    'forged.example.test',
    'X-Forwarded-Proto',
    'https',
    'X-Forwarded-Prefix',
    IDENTITY_QA.forgedPrefix,
  ];
  for (const value of options.forwardedForValues ?? [IDENTITY_QA.forgedClient]) {
    headers.push('X-Forwarded-For', value);
  }
  return new Promise((resolve, reject) => {
    const request = httpRequest(url, { method: 'GET', headers }, (response) => {
      let html = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        html += chunk;
      });
      response.on('error', reject);
      response.on('end', () =>
        resolve({ status: response.statusCode, headers: response.headers, html }),
      );
    });
    request.setTimeout(25000, () => request.destroy(new Error('Isolated SSR document timed out.')));
    request.on('error', reject);
    request.end();
  });
}

export function documentState(html) {
  const match = html.match(/<script[^>]+id="ng-state"[^>]*>([\s\S]*?)<\/script>/);
  const state = match ? JSON.parse(match[1]) : {};
  return {
    state,
    canonical: html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/)?.[1] || '',
    cacheUrls: Object.values(state)
      .filter((value) => value && typeof value === 'object' && typeof value.u === 'string')
      .map((value) => value.u),
  };
}
