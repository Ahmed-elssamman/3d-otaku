import { HttpClient, HttpContext } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import {
  EnvironmentInjector,
  PLATFORM_ID,
  REQUEST,
  REQUEST_CONTEXT,
  TransferState,
  createEnvironmentInjector,
  makeStateKey,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { appConfig } from '../../app.config';
import { API_ORIGIN } from '../api/api-origin.token';
import { GUEST_ORDER_TRACKING } from '../api/guest-order-tracking.context';
import { provideServerClientIp } from '../api/server-client-ip.provider';
import { STOREFRONT_CLIENT_IP } from '../api/storefront-client-ip.token';
import { ApiErrorResponse } from '../models/api-response.model';
import { StorefrontRequestContext } from '../models/storefront-request-context.model';
import { TokenStorageService } from '../services/token-storage.service';

const apiOrigin = 'http://127.0.0.1:4000';
const clientIp = '203.0.113.7';

function configure(context: StorefrontRequestContext | null, platform = 'server'): void {
  TestBed.configureTestingModule({
    providers: [
      appConfig.providers,
      provideServerClientIp(),
      { provide: API_ORIGIN, useValue: apiOrigin },
      { provide: PLATFORM_ID, useValue: platform },
      { provide: REQUEST_CONTEXT, useValue: context },
      {
        provide: REQUEST,
        useValue: new Request('https://shop.example/products', {
          headers: {
            'X-Forwarded-For': '198.51.100.99',
            Authorization: 'Bearer incoming-private-canary',
            Cookie: 'incoming-private-canary=1',
          },
        }),
      },
      provideHttpClientTesting(),
    ],
  });
}

describe('server public API client identity', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('uses the shared origin interceptor and forwards only the verified context without incoming credentials', () => {
    configure({ clientIp });
    const http = TestBed.inject(HttpTestingController);
    const client = TestBed.inject(HttpClient);
    for (const path of ['/api/products?search=lamp', '/api/products/one', '/api/settings/public']) {
      client.get(path, { headers: { 'X-Forwarded-For': '198.51.100.88' } }).subscribe();
      const request = http.expectOne(apiOrigin + path);
      expect(request.request.headers.get('X-Forwarded-For')).toBe(clientIp);
      expect(request.request.headers.has('Authorization')).toBe(false);
      expect(request.request.headers.has('Cookie')).toBe(false);
      expect(request.request.body).toBeNull();
      expect(request.request.url.includes(clientIp)).toBe(false);
      request.flush({ success: true, data: [] });
    }
    expect(TestBed.inject(TransferState).toJson().includes(clientIp)).toBe(false);
  });

  it('does not infer a context from request headers and removes caller-supplied forwarding', () => {
    configure(null);
    expect(TestBed.inject(STOREFRONT_CLIENT_IP)).toBeNull();
    TestBed.inject(HttpClient)
      .get('/api/products', { headers: { 'X-Forwarded-For': '198.51.100.88' } })
      .subscribe();
    const request = TestBed.inject(HttpTestingController).expectOne(apiOrigin + '/api/products');
    expect(request.request.headers.has('X-Forwarded-For')).toBe(false);
    request.flush({ success: true, data: [] });
  });

  it('excludes private endpoints, external origins and lookalike public paths', () => {
    configure({ clientIp });
    const client = TestBed.inject(HttpClient);
    const http = TestBed.inject(HttpTestingController);
    for (const url of [
      '/api/orders',
      '/api/admin/products',
      '/api/products/one/private',
      '/api/settings',
      '/api/settings/publicity',
      'http://127.0.0.1:4001/api/products',
      'https://127.0.0.1:4000/api/products',
      'https://external.example/api/products',
      'http://user:password@127.0.0.1:4000/api/products',
    ]) {
      client.get(url, { headers: { 'X-Forwarded-For': '198.51.100.88' } }).subscribe();
      const request = http.expectOne(new URL(url, apiOrigin).href);
      expect(request.request.headers.has('X-Forwarded-For')).toBe(false);
      request.flush({ success: true, data: [] });
    }
    client.post('/api/products', { name: 'not a public read' }).subscribe();
    const write = http.expectOne(apiOrigin + '/api/products');
    expect(write.request.headers.has('X-Forwarded-For')).toBe(false);
    write.flush({ success: true, data: {} });
  });

  it('does not forward an identity with authenticated or cookie-bearing public reads', () => {
    configure({ clientIp });
    const client = TestBed.inject(HttpClient);
    const http = TestBed.inject(HttpTestingController);
    const credentialHeaders: Record<string, string>[] = [
      { Authorization: 'Bearer explicit-private-canary' },
      { Cookie: 'explicit-private-canary=1' },
    ];
    for (const headers of credentialHeaders) {
      client.get('/api/products', { headers }).subscribe();
      const request = http.expectOne(apiOrigin + '/api/products');
      expect(request.request.headers.has('X-Forwarded-For')).toBe(false);
      request.flush({ success: true, data: [] });
    }
    client.get('/api/products', { withCredentials: true, credentials: 'include' }).subscribe();
    const request = http.expectOne(apiOrigin + '/api/products');
    expect(request.request.headers.has('X-Forwarded-For')).toBe(false);
    request.flush({ success: true, data: [] });
  });

  it('retains the existing authorization and private guest-credential interceptor behavior', () => {
    configure({ clientIp });
    const client = TestBed.inject(HttpClient);
    const http = TestBed.inject(HttpTestingController);
    TestBed.inject(TokenStorageService).saveAccessToken('existing-account-canary');
    client.get('/api/orders').subscribe();
    const account = http.expectOne(apiOrigin + '/api/orders');
    expect(account.request.headers.get('Authorization')).toBe('Bearer existing-account-canary');
    expect(account.request.headers.has('X-Forwarded-For')).toBe(false);
    account.flush({ success: true, data: [] });

    client
      .get('/api/orders/track/ORD-100', {
        context: new HttpContext().set(GUEST_ORDER_TRACKING, true),
        headers: { Authorization: 'Bearer unrelated-canary', 'X-Order-Token': 'guest-canary' },
        withCredentials: true,
        credentials: 'include',
      })
      .subscribe();
    const guest = http.expectOne(apiOrigin + '/api/orders/track/ORD-100');
    expect(guest.request.headers.has('Authorization')).toBe(false);
    expect(guest.request.headers.has('X-Forwarded-For')).toBe(false);
    expect(guest.request.headers.get('X-Order-Token')).toBe('guest-canary');
    expect(guest.request.credentials).toBe('omit');
    expect(guest.request.withCredentials).toBe(false);
    guest.flush({ success: true, data: {} });
  });

  it('retains normalized public error transfer without serializing client identity', () => {
    configure({ clientIp });
    const path = '/api/products/unavailable';
    const state = TestBed.inject(TransferState);
    let receivedError: ApiErrorResponse | null = null;
    TestBed.inject(HttpClient)
      .get(path)
      .subscribe({ error: (error: ApiErrorResponse) => (receivedError = error) });
    const request = TestBed.inject(HttpTestingController).expectOne(apiOrigin + path);
    expect(request.request.headers.get('X-Forwarded-For')).toBe(clientIp);
    request.flush({ message: 'Unavailable' }, { status: 503, statusText: 'Unavailable' });
    expect(receivedError).toMatchObject({ success: false, statusCode: 503, path });
    expect(
      state.get(makeStateKey<ApiErrorResponse | null>(`public-api-error:${path}`), null),
    ).toMatchObject({
      success: false,
      statusCode: 503,
      path,
    });
    expect(state.toJson().includes(clientIp)).toBe(false);
    expect(state.toJson().includes('incoming-private-canary')).toBe(false);
  });

  it('defaults the browser token to null without adding the server provider to shared configuration', () => {
    TestBed.configureTestingModule({
      providers: [
        appConfig.providers,
        { provide: API_ORIGIN, useValue: apiOrigin },
        { provide: REQUEST_CONTEXT, useValue: { clientIp } },
        provideHttpClientTesting(),
      ],
    });
    expect(TestBed.inject(STOREFRONT_CLIENT_IP)).toBeNull();
    TestBed.inject(HttpClient).get('/api/products').subscribe();
    const request = TestBed.inject(HttpTestingController).expectOne(apiOrigin + '/api/products');
    expect(request.request.headers.has('X-Forwarded-For')).toBe(false);
    request.flush({ success: true, data: [] });
  });

  it('never forwards on the browser even if server providers and a context are accidentally supplied', () => {
    configure({ clientIp }, 'browser');
    TestBed.inject(HttpClient)
      .get('/api/products', { headers: { 'X-Forwarded-For': '198.51.100.88' } })
      .subscribe();
    const request = TestBed.inject(HttpTestingController).expectOne(apiOrigin + '/api/products');
    expect(request.request.headers.has('X-Forwarded-For')).toBe(false);
    request.flush({ success: true, data: [] });
  });

  it('keeps simultaneous request injectors isolated instead of caching a previous client identity', () => {
    configure(null);
    const parent = TestBed.inject(EnvironmentInjector);
    const first = createEnvironmentInjector(
      [
        provideServerClientIp(),
        { provide: REQUEST_CONTEXT, useValue: { clientIp } },
        provideHttpClientTesting(),
      ],
      parent,
    );
    const secondIp = '2001:db8::7';
    const second = createEnvironmentInjector(
      [
        provideServerClientIp(),
        { provide: REQUEST_CONTEXT, useValue: { clientIp: secondIp } },
        provideHttpClientTesting(),
      ],
      parent,
    );
    try {
      first
        .get(HttpClient)
        .get(apiOrigin + '/api/products')
        .subscribe();
      second
        .get(HttpClient)
        .get(apiOrigin + '/api/products')
        .subscribe();
      const firstRequest = first.get(HttpTestingController).expectOne(apiOrigin + '/api/products');
      const secondRequest = second
        .get(HttpTestingController)
        .expectOne(apiOrigin + '/api/products');
      expect(firstRequest.request.headers.get('X-Forwarded-For')).toBe(clientIp);
      expect(secondRequest.request.headers.get('X-Forwarded-For')).toBe(secondIp);
      secondRequest.flush({ success: true, data: [] });
      firstRequest.flush({ success: true, data: [] });
      first.get(HttpTestingController).verify();
      second.get(HttpTestingController).verify();
    } finally {
      first.destroy();
      second.destroy();
    }
  });
});
