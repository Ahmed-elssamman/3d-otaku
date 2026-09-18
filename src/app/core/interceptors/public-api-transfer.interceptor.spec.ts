import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID, TransferState, makeStateKey } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ApiErrorResponse } from '../models/api-response.model';
import { apiErrorInterceptor } from './api-error.interceptor';

const productUrl = '/api/products/unavailable-product';
const productErrorKey = makeStateKey<ApiErrorResponse | null>(`public-api-error:${productUrl}`);

function configure(platform: string): void {
  TestBed.configureTestingModule({
    providers: [
      { provide: PLATFORM_ID, useValue: platform },
      provideHttpClient(withInterceptors([apiErrorInterceptor])),
      provideHttpClientTesting(),
      provideRouter([]),
    ],
  });
}

describe('public API errors during hydration', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('transfers an anonymous product error so the browser can hydrate the same error page', () => {
    configure('server');
    const http = TestBed.inject(HttpTestingController);
    TestBed.inject(HttpClient)
      .get(productUrl)
      .subscribe({ error: () => {} });
    http
      .expectOne(productUrl)
      .flush({ message: 'Product not found.' }, { status: 404, statusText: 'Not Found' });
    expect(TestBed.inject(TransferState).get(productErrorKey, null)?.statusCode).toBe(404);
  });

  it('consumes the transferred error once and lets a user retry reach the real API', () => {
    configure('browser');
    const http = TestBed.inject(HttpTestingController);
    const client = TestBed.inject(HttpClient);
    const state = TestBed.inject(TransferState);
    state.set(productErrorKey, {
      success: false,
      statusCode: 503,
      message: 'Unavailable',
      path: productUrl,
      timestamp: '2026-09-17T00:00:00.000Z',
    });
    let status = 0;
    client.get(productUrl).subscribe({
      error: (error: ApiErrorResponse) => {
        status = error.statusCode;
      },
    });
    expect(status).toBe(503);
    http.expectNone(productUrl);
    expect(state.hasKey(productErrorKey)).toBe(false);
    client.get(productUrl).subscribe();
    http.expectOne(productUrl).flush({ success: true, data: { id: 'restored' } });
  });

  it('never transfers private, authenticated or cookie-bearing errors', () => {
    configure('server');
    const http = TestBed.inject(HttpTestingController);
    const client = TestBed.inject(HttpClient);
    const state = TestBed.inject(TransferState);
    const privateHeaders: Record<string, string>[] = [
      { Authorization: 'Bearer private-test' },
      { Cookie: 'session=private-test' },
    ];
    for (const headers of privateHeaders) {
      client.get(productUrl, { headers }).subscribe({ error: () => {} });
      http.expectOne(productUrl).flush({}, { status: 503, statusText: 'Unavailable' });
      expect(state.hasKey(productErrorKey)).toBe(false);
    }
    const privateUrl = '/api/orders/track/private-order';
    client.get(privateUrl).subscribe({ error: () => {} });
    http.expectOne(privateUrl).flush({}, { status: 404, statusText: 'Not Found' });
    expect(state.hasKey(makeStateKey(`public-api-error:${privateUrl}`))).toBe(false);
  });
});
