import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { brotliCompress, gzip, constants } from 'node:zlib';

const directory = path.resolve(
  fileURLToPath(new URL('../dist/3d-otaku/browser/', import.meta.url)),
);
const port = Number(process.env.STORE_PREVIEW_PORT || 4300);
const apiOrigin = new URL(process.env.STORE_API_ORIGIN || 'http://127.0.0.1:4000');
const localHosts = new Set(['127.0.0.1', 'localhost', '[::1]']);
const compressBrotli = promisify(brotliCompress);
const compressGzip = promisify(gzip);
const compressedFiles = new Map();
const styleActivationHash = createHash('sha256').update("this.media='all'").digest('base64');
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.stl': 'model/stl',
};

if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error('STORE_PREVIEW_PORT must be an integer between 1024 and 65535.');
if (apiOrigin.protocol !== 'http:' || !localHosts.has(apiOrigin.hostname))
  throw new Error('The preview API origin must be a local HTTP server.');
const localApiOrigins = [...localHosts]
  .filter((hostname) => !hostname.startsWith('['))
  .map((hostname) => {
    const origin = new URL(apiOrigin);
    origin.hostname = hostname;
    return origin.origin;
  })
  .join(' ');
await stat(path.join(directory, 'index.csr.html')).catch(() => {
  throw new Error('Production build missing. Run npm run build first.');
});
process.env.STORE_API_ORIGIN = apiOrigin.origin;
// This loopback-only preview receives browsers directly, never through a trusted edge.
process.env.STORE_TRUSTED_PROXY_ADDRESSES = '';
const { renderStorefrontFromNodeRequest } = await import('../dist/3d-otaku/server/server.mjs');

function securityHeaders(response, html = '') {
  const scriptHashes = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
    .filter((match) => match[1].trim())
    .map((match) => `'sha256-${createHash('sha256').update(match[1]).digest('base64')}'`);
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.setHeader(
    'Content-Security-Policy',
    `default-src 'self'; script-src 'self' 'unsafe-hashes' 'sha256-${styleActivationHash}' ${scriptHashes.join(' ')}; style-src 'self' 'unsafe-inline'; img-src 'self' ${localApiOrigins} https: data: blob:; font-src 'self'; connect-src 'self' ${localApiOrigins} https:; media-src 'self' ${localApiOrigins} https: blob:; worker-src 'self' blob:; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'`,
  );
}

function proxy(request, response) {
  const requestedUrl = new URL(request.url, apiOrigin);
  const destination = new URL(apiOrigin);
  destination.pathname = requestedUrl.pathname;
  destination.search = requestedUrl.search;
  const headers = { ...request.headers };
  for (const name of Object.keys(headers)) {
    if (name.startsWith('x-forwarded-') || name === 'forwarded' || name === 'x-real-ip') {
      delete headers[name];
    }
  }
  headers.host = apiOrigin.host;
  headers['x-forwarded-host'] = request.headers.host;
  headers['x-forwarded-proto'] = 'http';
  const upstream = http.request(
    destination,
    {
      method: request.method,
      headers,
    },
    (upstreamResponse) => {
      const headers = { ...upstreamResponse.headers };
      if (request.url.startsWith('/api')) headers['cache-control'] = 'no-store';
      response.writeHead(upstreamResponse.statusCode || 502, headers);
      upstreamResponse.pipe(response);
    },
  );
  upstream.setTimeout(30000, () => upstream.destroy(new Error('Local API timeout.')));
  upstream.on('error', () => {
    if (!response.headersSent)
      response.writeHead(502, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      });
    response.end(JSON.stringify({ success: false, message: 'Local API unavailable.' }));
  });
  request.on('aborted', () => upstream.destroy());
  request.pipe(upstream);
}

function acceptsEncoding(header, encoding) {
  return header.split(',').some((value) => {
    const [name, ...parameters] = value.trim().split(';');
    return (
      name === encoding && !parameters.some((parameter) => /^\s*q=0(?:\.0*)?\s*$/.test(parameter))
    );
  });
}

async function serveDocument(request, response) {
  const rendered = await renderStorefrontFromNodeRequest(request);
  if (!rendered) {
    response.writeHead(404, { 'Cache-Control': 'no-store' }).end('Page not found.');
    return;
  }
  const html = await rendered.text();
  rendered.headers.forEach((value, key) => response.setHeader(key, value));
  securityHeaders(response, html);
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Vary', 'Accept-Encoding');
  let body = Buffer.from(html);
  const accepted = request.headers['accept-encoding'] || '';
  if (acceptsEncoding(accepted, 'br')) {
    body = await compressBrotli(body, { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } });
    response.setHeader('Content-Encoding', 'br');
  } else if (acceptsEncoding(accepted, 'gzip')) {
    body = await compressGzip(body, { level: 6 });
    response.setHeader('Content-Encoding', 'gzip');
  }
  response.setHeader('Content-Length', body.length);
  response.writeHead(rendered.status);
  response.end(request.method === 'HEAD' ? null : body);
}

function validatedRequestUrl(request) {
  const authority = request.headers.host;
  const target = request.url || '';
  if (
    typeof authority !== 'string' ||
    !authority ||
    /[\s/\\?#@]/.test(authority) ||
    !target.startsWith('/') ||
    target.startsWith('//') ||
    target.includes('\\') ||
    target.includes('#')
  )
    return null;
  try {
    const origin = new URL(`http://${authority}`);
    if (
      !localHosts.has(origin.hostname) ||
      origin.port !== String(port) ||
      origin.username ||
      origin.password ||
      origin.pathname !== '/' ||
      origin.search ||
      origin.hash
    )
      return null;
    const url = new URL(target, origin);
    return url.origin === origin.origin ? url : null;
  } catch {
    return null;
  }
}

const server = http.createServer(async (request, response) => {
  securityHeaders(response);
  try {
    const url = validatedRequestUrl(request);
    if (!url) {
      response
        .writeHead(400, { 'Cache-Control': 'no-store' })
        .end('Invalid request authority or target.');
      return;
    }
    const pathname = decodeURIComponent(url.pathname);
    if (pathname === '/api' || pathname.startsWith('/api/') || pathname.startsWith('/uploads/')) {
      proxy(request, response);
      return;
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }
    let filename = path.resolve(directory, '.' + pathname);
    if (filename !== directory && !filename.startsWith(directory + path.sep)) {
      response.writeHead(403).end();
      return;
    }
    let metadata = await stat(filename).catch(() => null);
    if (!metadata?.isFile()) {
      const isAsset = pathname.startsWith('/assets/') || path.extname(pathname) !== '';
      if (isAsset) {
        response.writeHead(404, { 'Cache-Control': 'no-store' }).end('Asset not found.');
        return;
      }
      await serveDocument(request, response);
      return;
    }
    const extension = path.extname(filename);
    const mimeType = mimeTypes[extension] || 'application/octet-stream';
    const isDocument = extension === '.html';
    const isStorefrontFingerprint =
      /^\/assets\/(?:fonts\/noto-sans-arabic-(?:400|700)\.[a-f0-9]{64}\.woff2|storefront\/knight-phone-holder\.[a-f0-9]{64}\.webp)$/.test(
        pathname,
      );
    const isHashed =
      /-[A-Z0-9]{8,}\.(?:js|css|woff|woff2)$/.test(path.basename(filename)) ||
      isStorefrontFingerprint;
    const etag = `W/"${metadata.size.toString(16)}-${Math.trunc(metadata.mtimeMs).toString(16)}"`;
    response.setHeader('Content-Type', mimeType);
    response.setHeader('ETag', etag);
    response.setHeader(
      'Cache-Control',
      isDocument
        ? 'no-cache'
        : isHashed
          ? 'public, max-age=31536000, immutable'
          : 'public, max-age=3600',
    );
    const compressible = /^(?:text\/|application\/(?:json|xml)|image\/svg)/.test(mimeType);
    if (compressible) response.setHeader('Vary', 'Accept-Encoding');
    if (request.headers['if-none-match'] === etag) {
      response.writeHead(304).end();
      return;
    }
    let body = await readFile(filename);
    const acceptedEncodings = request.headers['accept-encoding'] || '';
    const encoding =
      compressible && body.length > 1024
        ? acceptsEncoding(acceptedEncodings, 'br')
          ? 'br'
          : acceptsEncoding(acceptedEncodings, 'gzip')
            ? 'gzip'
            : ''
        : '';
    if (encoding) {
      const cacheKey = `${filename}:${etag}:${encoding}`;
      if (!compressedFiles.has(cacheKey)) {
        const compressed =
          encoding === 'br'
            ? await compressBrotli(body, { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } })
            : await compressGzip(body, { level: 6 });
        compressedFiles.set(cacheKey, compressed);
      }
      body = compressedFiles.get(cacheKey);
      response.setHeader('Content-Encoding', encoding);
    }
    response.setHeader('Content-Length', body.length);
    response.writeHead(200);
    response.end(request.method === 'HEAD' ? null : body);
  } catch (error) {
    if (!response.headersSent)
      response.writeHead(error instanceof URIError ? 400 : 500, { 'Cache-Control': 'no-store' });
    response.end('Preview server could not serve this request.');
  }
});

server.listen(port, '127.0.0.1', () =>
  process.stdout.write(
    `Production preview: http://127.0.0.1:${port}; API proxy: ${apiOrigin.origin}\n`,
  ),
);
server.on('error', (error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => server.close(() => process.exit(0)));
