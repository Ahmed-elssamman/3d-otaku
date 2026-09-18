export function getServerApiOrigin(): string {
  const url = new URL(process.env['STORE_API_ORIGIN'] || 'http://127.0.0.1:4000');
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  )
    throw new Error('STORE_API_ORIGIN must be an HTTP(S) origin without credentials or a path.');
  return url.origin;
}

export function getSiteOrigin(requestUrl: string): string {
  const configured = process.env['STORE_PUBLIC_ORIGIN'];
  const url = new URL(configured || new URL(requestUrl).origin);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error('STORE_PUBLIC_ORIGIN must be an HTTP(S) origin without credentials or a path.');
  }
  return url.origin;
}
