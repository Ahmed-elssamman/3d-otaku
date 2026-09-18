export function normalizeEgyptMobile(value: string): string {
  const digits = value
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 1776))
    .replace(/[\s()-]/g, '');
  if (/^01[0125]\d{8}$/.test(digits)) return `+2${digits}`;
  if (/^\+201[0125]\d{8}$/.test(digits)) return digits;
  if (/^00201[0125]\d{8}$/.test(digits)) return `+${digits.slice(2)}`;
  if (/^201[0125]\d{8}$/.test(digits)) return `+${digits}`;
  return '';
}
