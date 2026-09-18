import { spawn } from 'node:child_process';
import { createServer, request as httpRequest } from 'node:http';
import { fileURLToPath } from 'node:url';
import { brotliDecompressSync, gunzipSync } from 'node:zlib';
import { IDENTITY_PRODUCTS, IDENTITY_SETTINGS } from './ssr-client-identity.data.mjs';

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

function sendJson(response, data) {
  response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(data));
}

export async function startPreviewIdentityHarness() {
  const observations = [];
  const api = createServer((request, response) => {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
      const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
      const forwardingHeaders = Object.fromEntries(
        Object.entries(request.headers).filter(
          ([name]) =>
            name.startsWith('x-forwarded-') || name === 'forwarded' || name === 'x-real-ip',
        ),
      );
      observations.push({
        method: request.method,
        pathname,
        forwardingHeaders,
        host: request.headers.host,
        authorizationPreserved: request.headers.authorization === 'Bearer preview-only-canary',
        cookiePreserved: request.headers.cookie === 'preview-only-canary=1',
        bodyPreserved: Buffer.concat(chunks).toString() === '{"probe":"preview-only"}',
      });
      if (pathname === '/api/preview-identity-echo') {
        sendJson(response, { success: true, data: { acknowledged: true } });
      } else if (request.method === 'GET' && pathname === '/api/settings/public') {
        sendJson(response, { success: true, data: IDENTITY_SETTINGS });
      } else if (
        request.method === 'GET' &&
        pathname === `/api/products/${IDENTITY_PRODUCTS[0].slug}`
      ) {
        sendJson(response, { success: true, data: IDENTITY_PRODUCTS[0] });
      } else {
        response.writeHead(404, { 'Content-Type': 'application/json' }).end('{"success":false}');
      }
    });
  });
  let child = null;
  let output = '';
  let exited = Promise.resolve();
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    if (child && child.exitCode === null && child.signalCode === null) {
      child.kill();
      const timer = setTimeout(() => child.kill('SIGKILL'), 3000);
      try {
        await exited;
      } finally {
        clearTimeout(timer);
      }
    }
    await closeServer(api);
  };
  try {
    const apiOrigin = await listen(api);
    const reservation = createServer();
    const origin = await listen(reservation);
    const previewPort = Number(new URL(origin).port);
    await closeServer(reservation);
    if (
      [4000, 4200, 4300].includes(previewPort) ||
      [4000, 4200, 4300].includes(Number(new URL(apiOrigin).port))
    ) {
      throw new Error('Isolated preview fixture may not bind shared runtime ports.');
    }
    child = spawn(process.execPath, ['scripts/serve-production.mjs'], {
      cwd: workspace,
      env: {
        ...process.env,
        STORE_PREVIEW_PORT: String(previewPort),
        STORE_API_ORIGIN: apiOrigin,
        STORE_PUBLIC_ORIGIN: 'https://preview-identity.example.test',
        STORE_TRUSTED_PROXY_ADDRESSES: '127.0.0.1/32',
        NG_ALLOWED_HOSTS: 'localhost,127.0.0.1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    const collectOutput = (chunk) => {
      output = (output + chunk.toString()).slice(-12000);
    };
    child.stdout.on('data', collectOutput);
    child.stderr.on('data', collectOutput);
    exited = new Promise((resolve) => {
      child.once('exit', resolve);
      child.once('error', resolve);
    });
    await new Promise((resolve, reject) => {
      const finish = (error = null) => {
        clearTimeout(timer);
        child.stdout.off('data', ready);
        child.off('error', fail);
        child.off('exit', earlyExit);
        if (error) reject(error);
        else resolve();
      };
      const ready = () => {
        if (output.includes(`Production preview: ${origin};`)) finish();
      };
      const fail = () => finish(new Error('Isolated preview process could not start.'));
      const earlyExit = () => finish(new Error('Isolated preview exited before listening.'));
      const timer = setTimeout(
        () => finish(new Error('Isolated preview startup timed out.')),
        20000,
      );
      child.stdout.on('data', ready);
      child.once('error', fail);
      child.once('exit', earlyExit);
      ready();
    });
    return { origin, apiOrigin, observations, output: () => output, close };
  } catch (error) {
    await close();
    throw new Error(`${error.message}\n${output}`);
  }
}

export function previewRequest(origin, target, { method = 'GET', headers = {}, body = '' } = {}) {
  const url = new URL(origin);
  if (
    url.protocol !== 'http:' ||
    url.hostname !== '127.0.0.1' ||
    !url.port ||
    [4000, 4200, 4300].includes(Number(url.port)) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error('Preview fixture requests must remain on explicit loopback HTTP ports.');
  }
  return new Promise((resolve, reject) => {
    const request = httpRequest(
      {
        hostname: url.hostname,
        port: url.port,
        method,
        path: target,
        headers: { host: url.host, ...headers },
      },
      (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('error', reject);
        response.on('end', () => {
          try {
            const encoded = Buffer.concat(chunks);
            let decoded = encoded;
            if (encoded.length && response.headers['content-encoding'] === 'br') {
              decoded = brotliDecompressSync(encoded);
            } else if (encoded.length && response.headers['content-encoding'] === 'gzip') {
              decoded = gunzipSync(encoded);
            }
            resolve({
              status: response.statusCode,
              headers: response.headers,
              body: decoded.toString(),
              bytes: encoded.length,
            });
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    request.setTimeout(20000, () =>
      request.destroy(new Error('Isolated preview request timed out.')),
    );
    request.on('error', reject);
    request.end(body);
  });
}
