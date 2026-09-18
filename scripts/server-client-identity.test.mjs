import assert from 'node:assert/strict';
import { IncomingMessage } from 'node:http';
import { Socket } from 'node:net';
import { test } from 'node:test';
import {
  createTrustedProxyBlockList,
  resolveStorefrontClientIp,
} from '../src/server-client-identity.ts';

function resolve(socketIp, rawHeaders = [], allowedProxies = '') {
  const socket = new Socket();
  Object.defineProperty(socket, 'remoteAddress', { value: socketIp });
  const request = new IncomingMessage(socket);
  request.rawHeaders = rawHeaders;
  return resolveStorefrontClientIp(request, createTrustedProxyBlockList(allowedProxies));
}

test('only valid explicit literal proxy addresses and CIDRs are accepted', () => {
  for (const value of [
    '',
    '  ',
    '192.0.2.7',
    '192.0.2.7/024,2001:DB8::/48',
    '::ffff:192.0.2.0/120',
  ]) {
    assert.doesNotThrow(() => createTrustedProxyBlockList(value));
  }
  for (const value of [
    'localhost',
    'loopback',
    'linklocal',
    'uniquelocal',
    '*',
    'true',
    '1',
    '127.1',
    '0127.0.0.1',
    '999.0.0.1',
    '192.0.2.1:443',
    '[::1]',
    '[::1]:443',
    'fe80::1%eth0',
    '192.0.2.0/0',
    '::/0',
    '192.0.2.0/33',
    '2001:db8::/129',
    '192.0.2.0/-1',
    '192.0.2.0/1.5',
    '192.0.2.0/255.255.255.0',
    '2001:db8::/',
    '192.0.2.1//24',
    '192.0.2.1,',
    ',192.0.2.1',
    '192.0.2.1,,2001:db8::1',
    '192.0.2.1 /24',
    '192.0.2.1/ 24',
  ]) {
    assert.throws(() => createTrustedProxyBlockList(value), /STORE_TRUSTED_PROXY_ADDRESSES/);
  }
});

test('an empty or nonmatching allowlist never trusts forwarded identities, including loopback', () => {
  for (const socketIp of ['127.0.0.1', '10.0.0.1', '192.0.2.8', '::1', '2001:db8::1']) {
    for (const allowedProxies of ['', '198.51.100.0/24']) {
      assert.equal(resolve(socketIp, ['X-Forwarded-For', '203.0.113.7'], allowedProxies), socketIp);
    }
  }
});

test('trusted sockets accept exactly one valid IPv4 or IPv6 identity and ignore unrelated headers', () => {
  const allowed = '192.0.2.0/24';
  assert.equal(
    resolve(
      '192.0.2.1',
      ['x-FoRwArDeD-fOr', ' 203.0.113.7 ', 'X-Real-IP', '198.51.100.7'],
      allowed,
    ),
    '203.0.113.7',
  );
  assert.equal(
    resolve('192.0.2.1', ['X-Forwarded-For', '2001:0DB8:0000:0000:0000:0000:0000:0001'], allowed),
    '2001:db8::1',
  );
  assert.equal(
    resolve('192.0.2.1', ['Forwarded', 'for=203.0.113.7', 'X-Real-IP', '203.0.113.7'], allowed),
    '192.0.2.1',
  );
});

test('malformed, repeated, chained or oversized headers fall back to the trusted socket', () => {
  for (const value of [
    '',
    ' ',
    '203.0.113.7, 198.51.100.7',
    '203.0.113.7,',
    '203.0.113.7:443',
    '[2001:db8::1]',
    '[2001:db8::1]:443',
    'fe80::1%eth0',
    'localhost',
    '127.1',
    '0127.0.0.1',
    '999.0.0.1',
    '203.0.113.7/32',
    '2001:db8::1/128',
    'for=203.0.113.7',
    '203.0.113.7' + ' '.repeat(64),
  ]) {
    assert.equal(resolve('192.0.2.1', ['X-Forwarded-For', value], '192.0.2.1'), '192.0.2.1');
  }
  assert.equal(
    resolve(
      '192.0.2.1',
      ['X-Forwarded-For', '203.0.113.7', 'x-forwarded-for', '203.0.113.7'],
      '192.0.2.1',
    ),
    '192.0.2.1',
  );
  assert.equal(resolve('192.0.2.1', [], '192.0.2.1'), '192.0.2.1');
});

test('socket and forwarded mapped IPv4 forms normalize to the same identity', () => {
  for (const socketIp of ['192.0.2.1', '::ffff:192.0.2.1', '0:0:0:0:0:FFFF:C000:0201']) {
    assert.equal(resolve(socketIp), '192.0.2.1');
    for (const allowedProxies of ['192.0.2.1', '::ffff:192.0.2.1', '::ffff:192.0.2.0/120']) {
      for (const forwardedIp of ['203.0.113.7', '::ffff:203.0.113.7', '::FFFF:CB00:7107']) {
        assert.equal(
          resolve(socketIp, ['X-Forwarded-For', forwardedIp], allowedProxies),
          '203.0.113.7',
        );
      }
    }
  }
});

test('IPv4 and IPv6 subnet boundaries select the correct proxy sockets', () => {
  for (const [allowed, inside, outside] of [
    ['192.0.2.7/24', '192.0.2.255', '192.0.3.0'],
    ['2001:db8:1234::/48', '2001:db8:1234:ffff::1', '2001:db8:1235::1'],
    ['::ffff:192.0.2.0/120', '::ffff:192.0.2.255', '192.0.3.0'],
  ]) {
    assert.equal(resolve(inside, ['X-Forwarded-For', '203.0.113.7'], allowed), '203.0.113.7');
    assert.equal(resolve(outside, ['X-Forwarded-For', '203.0.113.7'], allowed), outside);
  }
});

test('missing or invalid socket evidence cannot be replaced by a claimed header', () => {
  for (const socketIp of ['', null, 'localhost', '127.1', 'fe80::1%eth0', '[::1]']) {
    assert.equal(resolve(socketIp, ['X-Forwarded-For', '203.0.113.7'], '192.0.2.0/24'), null);
  }
});
