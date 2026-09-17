import {
  HttpClient,
  HttpContext,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ApiErrorResponse } from '../models/api-response.model';
import { User } from '../models/user.model';
import { UserRole } from '../enums/user-role.enum';
import { AuthService } from '../services/auth.service';
import { TokenStorageService } from '../services/token-storage.service';
import { authTokenInterceptor } from './auth-token.interceptor';
import { apiErrorInterceptor } from './api-error.interceptor';
import { GUEST_ORDER_TRACKING } from '../api/guest-order-tracking.context';

const customer: User = {
  id: 'test-customer',
  fullName: 'Test Customer',
  email: 'customer@example.test',
  role: UserRole.CUSTOMER,
  createdAt: '2026-09-16T00:00:00.000Z',
};

describe('authenticated HTTP session recovery', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let storage: TokenStorageService;
  let auth: AuthService;
  let router: Router;
  const base = environment.apiBaseUrl;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authTokenInterceptor, apiErrorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    storage = TestBed.inject(TokenStorageService);
    storage.saveAccessToken('expired-access');
    storage.saveRefreshToken('valid-refresh');
    storage.saveUser(customer);
    auth = TestBed.inject(AuthService);
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  function rejectAccess(url: string): void {
    const request = http.expectOne(url);
    expect(request.request.headers.get('Authorization')).toBe('Bearer expired-access');
    request.flush({ message: 'Expired' }, { status: 401, statusText: 'Unauthorized' });
  }

  function completeRefresh(): void {
    const request = http.expectOne(base + '/auth/refresh-token');
    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(request.request.body).toEqual({ refreshToken: 'valid-refresh' });
    request.flush({
      success: true,
      data: { accessToken: 'fresh-access', refreshToken: 'rotated-refresh' },
    });
  }

  it('sends private guest tracking without unrelated bearer or cookie credentials', () => {
    const token = 'a'.repeat(64);
    client
      .get(base + '/orders/track/ORD-100', {
        context: new HttpContext().set(GUEST_ORDER_TRACKING, true),
        headers: { Authorization: 'Bearer unrelated-token', 'X-Order-Token': token },
        withCredentials: true,
        credentials: 'include',
      })
      .subscribe();
    const request = http.expectOne(base + '/orders/track/ORD-100');
    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(request.request.headers.get('X-Order-Token')).toBe(token);
    expect(request.request.withCredentials).toBe(false);
    expect(request.request.credentials).toBe('omit');
    request.flush({ success: true, data: {} });
    expect(storage.getAccessToken()).toBe('expired-access');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('reports a denied guest capability without refreshing, redirecting or clearing the account', () => {
    let status = 0;
    client
      .get(base + '/orders/track/ORD-100', {
        context: new HttpContext().set(GUEST_ORDER_TRACKING, true),
        headers: { 'X-Order-Token': 'b'.repeat(64) },
      })
      .subscribe({ error: (error: ApiErrorResponse) => (status = error.statusCode) });
    http
      .expectOne(base + '/orders/track/ORD-100')
      .flush({ message: 'Not available' }, { status: 401, statusText: 'Unauthorized' });
    expect(status).toBe(401);
    http.expectNone(base + '/auth/refresh-token');
    expect(storage.getAccessToken()).toBe('expired-access');
    expect(storage.getRefreshToken()).toBe('valid-refresh');
    expect(auth.currentUser()).toEqual(customer);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('shares one rotating refresh across concurrent 401s and retries each request once', () => {
    let completed = 0;
    client.get(base + '/orders').subscribe(() => completed++);
    client.get(base + '/cart').subscribe(() => completed++);
    rejectAccess(base + '/orders');
    rejectAccess(base + '/cart');
    completeRefresh();
    for (const path of ['/orders', '/cart']) {
      const retry = http.expectOne(base + path);
      expect(retry.request.headers.get('Authorization')).toBe('Bearer fresh-access');
      retry.flush({ success: true, data: [] });
    }
    expect(completed).toBe(2);
    expect(storage.getRefreshToken()).toBe('rotated-refresh');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('uses the new token for a late 401 instead of rotating the refresh token again', () => {
    client.get(base + '/orders').subscribe();
    client.get(base + '/cart').subscribe();
    const late = http.expectOne(base + '/cart');
    rejectAccess(base + '/orders');
    completeRefresh();
    http.expectOne(base + '/orders').flush({ data: [] });
    late.flush({}, { status: 401, statusText: 'Unauthorized' });
    const retry = http.expectOne(base + '/cart');
    expect(retry.request.headers.get('Authorization')).toBe('Bearer fresh-access');
    retry.flush({ data: [] });
    http.expectNone(base + '/auth/refresh-token');
  });

  it('clears an invalid session when refresh is rejected without retrying forever', () => {
    let status = 0;
    client
      .get(base + '/orders')
      .subscribe({ error: (error: ApiErrorResponse) => (status = error.statusCode) });
    rejectAccess(base + '/orders');
    http
      .expectOne(base + '/auth/refresh-token')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(status).toBe(401);
    expect(storage.getAccessToken()).toBeNull();
    expect(storage.getRefreshToken()).toBeNull();
    expect(auth.currentUser()).toBeNull();
    expect(router.navigate).toHaveBeenCalledTimes(1);
  });

  it('preserves the session on a temporary refresh failure', () => {
    let status = 0;
    client
      .get(base + '/orders')
      .subscribe({ error: (error: ApiErrorResponse) => (status = error.statusCode) });
    rejectAccess(base + '/orders');
    http
      .expectOne(base + '/auth/refresh-token')
      .flush({}, { status: 503, statusText: 'Unavailable' });
    expect(status).toBe(503);
    expect(storage.getRefreshToken()).toBe('valid-refresh');
    expect(auth.currentUser()).toEqual(customer);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('stops after one retry if the refreshed access token is also rejected', () => {
    client.get(base + '/orders').subscribe({ error: () => null });
    rejectAccess(base + '/orders');
    completeRefresh();
    http.expectOne(base + '/orders').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(storage.getAccessToken()).toBeNull();
    expect(router.navigate).toHaveBeenCalledTimes(1);
    http.expectNone(base + '/auth/refresh-token');
  });

  it('never attaches tokens or session handling to external or lookalike API URLs', () => {
    for (const url of ['https://example.test/api/orders', '/api-elsewhere/orders']) {
      let status = 0;
      client.get(url).subscribe({ error: (error: HttpErrorResponse) => (status = error.status) });
      const request = http.expectOne(url);
      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush({}, { status: 401, statusText: 'Unauthorized' });
      expect(status).toBe(401);
    }
    expect(storage.getRefreshToken()).toBe('valid-refresh');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('keeps invalid login errors in the form without attempting refresh', () => {
    client
      .post(base + '/auth/login', { email: customer.email, password: 'invalid' })
      .subscribe({ error: () => null });
    const request = http.expectOne(base + '/auth/login');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectNone(base + '/auth/refresh-token');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('restores a session from a refresh token and validates the user on startup', () => {
    storage.clearStorage();
    storage.saveRefreshToken('valid-refresh');
    let restored: User | null = null;
    auth.loadCurrentUser().subscribe((user) => (restored = user));
    completeRefresh();
    const me = http.expectOne(base + '/auth/me');
    expect(me.request.headers.get('Authorization')).toBe('Bearer fresh-access');
    me.flush({ success: true, data: customer });
    expect(restored).toEqual(customer);
    expect(auth.currentUser()).toEqual(customer);
  });

  it('shares startup validation and preserves cached identity through a temporary API outage', () => {
    auth.loadCurrentUser().subscribe();
    auth.loadCurrentUser().subscribe();
    http.expectOne(base + '/auth/me').flush({}, { status: 503, statusText: 'Unavailable' });
    expect(auth.currentUser()).toEqual(customer);
    expect(storage.getRefreshToken()).toBe('valid-refresh');
  });

  it('does not restore authentication when refresh finishes after logout', () => {
    let failed = false;
    auth.refreshToken().subscribe({ error: () => (failed = true) });
    auth.logout().subscribe();
    http.expectOne(base + '/auth/logout').flush({ success: true, data: null });
    completeRefresh();
    expect(failed).toBe(true);
    expect(storage.getAccessToken()).toBeNull();
    expect(storage.getRefreshToken()).toBeNull();
    expect(auth.currentUser()).toBeNull();
  });
});
