import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  createWebRequestFromNodeRequest,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import { IncomingMessage } from 'node:http';
import { StorefrontRequestContext } from './app/core/models/storefront-request-context.model';
import { createTrustedProxyBlockList, resolveStorefrontClientIp } from './server-client-identity';

const angularApp = new AngularNodeAppEngine({ trustProxyHeaders: false });
const trustedProxies = createTrustedProxyBlockList(
  process.env['STORE_TRUSTED_PROXY_ADDRESSES'] || '',
);

function withoutForwardingHeaders(request: Request): Request {
  const headers = new Headers(request.headers);
  for (const name of [...headers.keys()]) {
    if (name.startsWith('x-forwarded-') || name === 'forwarded' || name === 'x-real-ip') {
      headers.delete(name);
    }
  }
  return new Request(request, { headers });
}

export function renderStorefront(request: Request): Promise<Response | null> {
  return angularApp.handle(withoutForwardingHeaders(request));
}

export function renderStorefrontFromNodeRequest(
  request: IncomingMessage,
): Promise<Response | null> {
  const context: StorefrontRequestContext = {
    clientIp: resolveStorefrontClientIp(request, trustedProxies),
  };
  const webRequest = createWebRequestFromNodeRequest(request, false);
  return angularApp.handle(withoutForwardingHeaders(webRequest), context);
}

export const reqHandler = createNodeRequestHandler(async (request, response, next) => {
  try {
    const rendered = await renderStorefrontFromNodeRequest(request);
    if (rendered) {
      rendered.headers.set('Cache-Control', 'no-store');
      await writeResponseToNodeResponse(rendered, response);
    } else next();
  } catch (error) {
    next(error);
  }
});
