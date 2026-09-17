import { environment } from '../../../environments/environment';

export function isApiUrl(value: string, origin: string): boolean {
  const base = new URL(environment.apiBaseUrl, origin);
  const url = new URL(value, origin);
  const basePath = base.pathname.replace(/\/$/, '');
  return (
    url.origin === base.origin &&
    (url.pathname === basePath || url.pathname.startsWith(basePath + '/'))
  );
}

export function isCredentialUrl(value: string, origin: string): boolean {
  const path = new URL(value, origin).pathname;
  return /\/auth\/(login|register|refresh-token|logout)\/?$/.test(path);
}

export function isPublicCatalogUrl(value: string): boolean {
  const path = new URL(value, 'http://localhost').pathname;
  return /^\/api\/(?:products(?:\/[^/]+)?|settings\/public)\/?$/.test(path);
}
