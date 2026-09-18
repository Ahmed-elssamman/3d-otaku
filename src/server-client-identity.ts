import { IncomingMessage } from 'node:http';
import { BlockList, isIP } from 'node:net';

function invalidProxyConfiguration(): never {
  throw new Error(
    'STORE_TRUSTED_PROXY_ADDRESSES must contain only comma-separated literal IPv4/IPv6 addresses or CIDRs (IPv4 /1-/32, IPv6 /1-/128). Hostnames, named ranges, ports and zone identifiers are not allowed. Leave it empty to trust no proxy.',
  );
}

export function createTrustedProxyBlockList(value: string): BlockList {
  const proxies = new BlockList();
  if (!value.trim()) return proxies;

  for (const entry of value.split(',')) {
    const parts = entry.trim().split('/');
    const address = parts[0];
    const family = isIP(address);
    if (!family || address.includes('%') || parts.length > 2) invalidProxyConfiguration();
    if (parts.length === 1) {
      proxies.addAddress(address, family === 4 ? 'ipv4' : 'ipv6');
      continue;
    }
    const prefix = parts[1];
    const length = Number(prefix);
    if (
      !/^\d+$/.test(prefix) ||
      !Number.isInteger(length) ||
      length < 1 ||
      length > (family === 4 ? 32 : 128)
    ) {
      invalidProxyConfiguration();
    }
    proxies.addSubnet(address, length, family === 4 ? 'ipv4' : 'ipv6');
  }
  return proxies;
}

function canonicalIp(address: string): string | null {
  if (address.length > 45 || address.includes('%')) return null;
  const family = isIP(address);
  if (family === 4) return address;
  if (family !== 6) return null;

  const normalized = new URL(`http://[${address}]/`).hostname.slice(1, -1);
  const mapped = /^::ffff:([\da-f]{1,4}):([\da-f]{1,4})$/.exec(normalized);
  if (!mapped) return normalized;
  const high = Number.parseInt(mapped[1], 16);
  const low = Number.parseInt(mapped[2], 16);
  return `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
}

export function resolveStorefrontClientIp(
  request: IncomingMessage,
  trustedProxies: BlockList,
): string | null {
  const socketIp = canonicalIp(request.socket.remoteAddress || '');
  if (!socketIp) return null;
  if (!trustedProxies.check(socketIp, isIP(socketIp) === 4 ? 'ipv4' : 'ipv6')) return socketIp;

  let forwardedIp: string | null = null;
  let forwardedHeaders = 0;
  for (let index = 0; index < request.rawHeaders.length; index += 2) {
    if (request.rawHeaders[index].toLowerCase() !== 'x-forwarded-for') continue;
    forwardedHeaders += 1;
    const value = request.rawHeaders[index + 1];
    if (value.length <= 64) forwardedIp = canonicalIp(value.trim());
  }
  return forwardedHeaders === 1 && forwardedIp ? forwardedIp : socketIp;
}
