export function getSafeReturnUrl(value: string | null): string {
  const returnUrl = value?.trim() ?? '';
  if (!returnUrl.startsWith('/') || returnUrl.startsWith('//')) {
    return '';
  }

  if (
    returnUrl === '/login' ||
    returnUrl.startsWith('/login?') ||
    returnUrl === '/register' ||
    returnUrl.startsWith('/register?')
  ) {
    return '';
  }

  return returnUrl;
}
