export function getSafeReturnUrl(value: string | null): string {
  if (value && /[\u0000-\u001f\u007f]/.test(value)) return '';
  const returnUrl = value?.trim() ?? '';
  if (
    !returnUrl.startsWith('/') ||
    returnUrl.startsWith('//') ||
    /[\\\u0000-\u001f\u007f]/.test(returnUrl)
  )
    return '';
  try {
    const url = new URL(returnUrl, 'https://internal.invalid');
    const path = decodeURIComponent(url.pathname);
    if (
      url.origin !== 'https://internal.invalid' ||
      /[%\\:();\u0000-\u001f\u007f]/.test(path) ||
      path.startsWith('//')
    )
      return '';
    if (/^\/(login|register)(\/|$)/i.test(path)) return '';
    return url.pathname + url.search + url.hash;
  } catch {
    return '';
  }
}

export function getAccountDestination(value: string | null, isAdmin: boolean): string {
  const safeUrl = getSafeReturnUrl(value);
  const path = decodeURIComponent(safeUrl.split(/[?#]/)[0]);
  const adminRequested = /^\/admin(\/|$)/i.test(path);
  if (safeUrl && (!adminRequested || isAdmin)) return safeUrl;
  return isAdmin ? '/admin/dashboard' : '/products';
}
