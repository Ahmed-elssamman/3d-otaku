import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { computed } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiErrorResponse } from '@core/models/api-response.model';
import { PublicRequestEndpoint } from '../enums/public-request-endpoint.enum';
import { PublicRequestReceipt } from '../models/pending-public-request.model';
import { PUBLIC_REQUEST_STORAGE_PREFIX } from './request-submission.data';
import { RequestSubmissionService } from './request-submission.service';

interface SubmissionPayload {
  message: string;
}

function acknowledge(request: TestRequest, id: string, endpoint: PublicRequestEndpoint): void {
  const data: PublicRequestReceipt = { id };
  if (endpoint === PublicRequestEndpoint.CustomOrders) data.requestNumber = `CUSTOM-${id}`;
  else data.messageNumber = `MESSAGE-${id}`;
  request.flush({ success: true, data, message: 'Received' });
}

describe('Public request retry protection', () => {
  let service: RequestSubmissionService;
  let http: HttpTestingController;
  const customEndpoint = PublicRequestEndpoint.CustomOrders;
  const messageEndpoint = PublicRequestEndpoint.ContactMessages;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RequestSubmissionService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it('replays the exact original request after failure and service recreation before allowing a new one', () => {
    const payload: SubmissionPayload = { message: 'A local request' };
    service
      .submit<PublicRequestReceipt, SubmissionPayload>(customEndpoint, payload)
      .subscribe({ error: () => {} });
    const first = http.expectOne('/api/custom-orders');
    const key = first.request.headers.get('Idempotency-Key');
    expect(key).toBeTruthy();
    first.flush('Unavailable', { status: 503, statusText: 'Service Unavailable' });
    const recreated = TestBed.runInInjectionContext(() => new RequestSubmissionService());
    expect(recreated.pendingSubmission<SubmissionPayload>(customEndpoint)?.payload).toEqual(
      payload,
    );
    recreated.replay<PublicRequestReceipt, SubmissionPayload>(customEndpoint).subscribe();
    const retry = http.expectOne('/api/custom-orders');
    expect(retry.request.headers.get('Idempotency-Key')).toBe(key);
    expect(retry.request.body).toEqual(payload);
    acknowledge(retry, 'persisted-record', customEndpoint);
    expect(recreated.hasPending(customEndpoint)).toBe(false);
    recreated.submit<PublicRequestReceipt, SubmissionPayload>(customEndpoint, payload).subscribe();
    const next = http.expectOne('/api/custom-orders');
    expect(next.request.headers.get('Idempotency-Key')).not.toBe(key);
    acknowledge(next, 'new-record', customEndpoint);
  });

  it('blocks edited uncertain content without HTTP and keeps endpoints independent', () => {
    service
      .submit<PublicRequestReceipt, SubmissionPayload>(customEndpoint, { message: 'First' })
      .subscribe({ error: () => {} });
    const first = http.expectOne('/api/custom-orders');
    const key = first.request.headers.get('Idempotency-Key');
    first.error(new ProgressEvent('error'));
    let conflict: ApiErrorResponse | null = null;
    service
      .submit<PublicRequestReceipt, SubmissionPayload>(customEndpoint, { message: 'Changed' })
      .subscribe({ error: (error: ApiErrorResponse) => (conflict = error) });
    http.expectNone('/api/custom-orders');
    expect(conflict).toMatchObject({
      statusCode: 409,
      errors: { requestDetails: expect.any(Array) },
    });
    expect(service.pendingSubmission<SubmissionPayload>(customEndpoint)?.payload.message).toBe(
      'First',
    );
    service
      .submit<PublicRequestReceipt, SubmissionPayload>(messageEndpoint, {
        message: 'A separate inquiry',
      })
      .subscribe();
    const separate = http.expectOne('/api/contact-messages');
    expect(separate.request.headers.get('Idempotency-Key')).not.toBe(key);
    acknowledge(separate, 'separate', messageEndpoint);
    expect(service.hasPending(customEndpoint)).toBe(true);
    expect(service.hasPending(messageEndpoint)).toBe(false);
  });

  it('allows corrected details under a new key after a first definite validation rejection', () => {
    service
      .submit<PublicRequestReceipt, SubmissionPayload>(customEndpoint, { message: '' })
      .subscribe({ error: () => {} });
    const first = http.expectOne('/api/custom-orders');
    const firstKey = first.request.headers.get('Idempotency-Key');
    first.flush(
      { errors: { message: ['Required'] } },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    expect(service.hasPending(customEndpoint)).toBe(false);
    expect(sessionStorage.getItem(`${PUBLIC_REQUEST_STORAGE_PREFIX}${customEndpoint}`)).toBeNull();
    service
      .submit<PublicRequestReceipt, SubmissionPayload>(customEndpoint, { message: 'Corrected' })
      .subscribe();
    const corrected = http.expectOne('/api/custom-orders');
    expect(corrected.request.headers.get('Idempotency-Key')).not.toBe(firstKey);
    expect(corrected.request.body).toEqual({ message: 'Corrected' });
    acknowledge(corrected, 'corrected', customEndpoint);
  });

  it.each([409, 422])('does not unlock an uncertain request after HTTP %s', (status) => {
    service
      .submit<PublicRequestReceipt, SubmissionPayload>(customEndpoint, { message: 'Original' })
      .subscribe({ error: () => {} });
    const first = http.expectOne('/api/custom-orders');
    const firstKey = first.request.headers.get('Idempotency-Key');
    first.error(new ProgressEvent('error'));
    service
      .replay<PublicRequestReceipt, SubmissionPayload>(customEndpoint)
      .subscribe({ error: () => {} });
    http.expectOne('/api/custom-orders').flush({}, { status, statusText: 'Rejected' });
    expect(service.pendingSubmission<SubmissionPayload>(customEndpoint)?.key).toBe(firstKey);
    const recreated = TestBed.runInInjectionContext(() => new RequestSubmissionService());
    recreated
      .submit<PublicRequestReceipt, SubmissionPayload>(customEndpoint, { message: 'Changed' })
      .subscribe({ error: () => {} });
    http.expectNone('/api/custom-orders');
    recreated.replay<PublicRequestReceipt, SubmissionPayload>(customEndpoint).subscribe();
    const replay = http.expectOne('/api/custom-orders');
    expect(replay.request.headers.get('Idempotency-Key')).toBe(firstKey);
    expect(replay.request.body).toEqual({ message: 'Original' });
    acknowledge(replay, 'recovered', customEndpoint);
  });

  it('keeps a newer retry uncertain when the first request later receives 422', () => {
    service
      .submit<PublicRequestReceipt, SubmissionPayload>(customEndpoint, { message: 'Original' })
      .subscribe({ error: () => {} });
    const first = http.expectOne('/api/custom-orders');
    const key = first.request.headers.get('Idempotency-Key');
    service
      .replay<PublicRequestReceipt, SubmissionPayload>(customEndpoint)
      .subscribe({ error: () => {} });
    const replay = http.expectOne('/api/custom-orders');
    first.flush({}, { status: 422, statusText: 'Unprocessable Entity' });
    expect(service.pendingSubmission<SubmissionPayload>(customEndpoint)?.key).toBe(key);
    replay.error(new ProgressEvent('error'));
    expect(service.hasPending(customEndpoint)).toBe(true);
  });

  it('does not let a late old acknowledgement clear a later submission', () => {
    service
      .submit<PublicRequestReceipt, SubmissionPayload>(customEndpoint, { message: 'Original' })
      .subscribe();
    const first = http.expectOne('/api/custom-orders');
    service.replay<PublicRequestReceipt, SubmissionPayload>(customEndpoint).subscribe();
    const oldReplay = http.expectOne('/api/custom-orders');
    acknowledge(first, 'first', customEndpoint);
    service
      .submit<PublicRequestReceipt, SubmissionPayload>(customEndpoint, { message: 'Later' })
      .subscribe({ error: () => {} });
    const later = http.expectOne('/api/custom-orders');
    const laterKey = later.request.headers.get('Idempotency-Key');
    acknowledge(oldReplay, 'first', customEndpoint);
    expect(service.pendingSubmission<SubmissionPayload>(customEndpoint)?.key).toBe(laterKey);
    expect(service.pendingSubmission<SubmissionPayload>(customEndpoint)?.payload.message).toBe(
      'Later',
    );
    later.error(new ProgressEvent('error'));
  });

  it('captures the body without reserving a key until subscription', () => {
    const payload: SubmissionPayload = { message: 'Captured' };
    const submission = service.submit<PublicRequestReceipt, SubmissionPayload>(
      customEndpoint,
      payload,
    );
    payload.message = 'Edited after preparing the request';
    expect(service.hasPending(customEndpoint)).toBe(false);
    submission.subscribe();
    const request = http.expectOne('/api/custom-orders');
    expect(request.request.body).toEqual({ message: 'Captured' });
    acknowledge(request, 'captured', customEndpoint);
  });

  it('retains a cancelled in-flight request for explicit replay', () => {
    const subscription = service
      .submit<PublicRequestReceipt, SubmissionPayload>(customEndpoint, { message: 'Original' })
      .subscribe();
    const request = http.expectOne('/api/custom-orders');
    const key = request.request.headers.get('Idempotency-Key');
    subscription.unsubscribe();
    expect(request.cancelled).toBe(true);
    expect(service.pendingSubmission<SubmissionPayload>(customEndpoint)?.key).toBe(key);
  });

  it('retains the key when HTTP success lacks a usable saved reference', () => {
    service
      .submit<PublicRequestReceipt, SubmissionPayload>(messageEndpoint, { message: 'Original' })
      .subscribe({ error: () => {} });
    const request = http.expectOne('/api/contact-messages');
    const key = request.request.headers.get('Idempotency-Key');
    request.flush({ success: true, data: { id: 'saved', messageNumber: '' }, message: 'Received' });
    expect(service.pendingSubmission<SubmissionPayload>(messageEndpoint)?.key).toBe(key);
    service.replay<PublicRequestReceipt, SubmissionPayload>(messageEndpoint).subscribe();
    acknowledge(http.expectOne('/api/contact-messages'), 'saved', messageEndpoint);
  });

  it('blocks a new request when nonempty stored recovery data cannot be read safely', () => {
    sessionStorage.setItem(`${PUBLIC_REQUEST_STORAGE_PREFIX}${customEndpoint}`, '{broken');
    const recreated = TestBed.runInInjectionContext(() => new RequestSubmissionService());
    expect(recreated.hasPending(customEndpoint)).toBe(true);
    expect(recreated.pendingSubmission<SubmissionPayload>(customEndpoint)).toBeNull();
    recreated
      .submit<PublicRequestReceipt, SubmissionPayload>(customEndpoint, { message: 'New' })
      .subscribe({ error: () => {} });
    http.expectNone('/api/custom-orders');
    expect(sessionStorage.getItem(`${PUBLIC_REQUEST_STORAGE_PREFIX}${customEndpoint}`)).toBe(
      '{broken',
    );
  });

  it('does not treat blocked browser storage as proof that no previous request exists', () => {
    const storageRead = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });
    const recreated = TestBed.runInInjectionContext(() => new RequestSubmissionService());
    expect(recreated.hasPending(customEndpoint)).toBe(true);
    recreated
      .submit<PublicRequestReceipt, SubmissionPayload>(customEndpoint, { message: 'New' })
      .subscribe({ error: () => {} });
    http.expectNone('/api/custom-orders');
    storageRead.mockRestore();
  });

  it('sends no new request unless its key and original body can be persisted first', () => {
    const storageWrite = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Full', 'QuotaExceededError');
    });
    let failure: ApiErrorResponse | null = null;
    service
      .submit<PublicRequestReceipt, SubmissionPayload>(customEndpoint, { message: 'First draft' })
      .subscribe({ error: (error: ApiErrorResponse) => (failure = error) });
    http.expectNone('/api/custom-orders');
    expect(failure).toMatchObject({
      statusCode: 503,
      errors: { requestStorage: expect.any(Array) },
    });
    expect(service.hasPending(customEndpoint)).toBe(false);
    storageWrite.mockRestore();
    service
      .submit<PublicRequestReceipt, SubmissionPayload>(customEndpoint, {
        message: 'Corrected before sending',
      })
      .subscribe();
    const request = http.expectOne('/api/custom-orders');
    expect(request.request.body).toEqual({ message: 'Corrected before sending' });
    acknowledge(request, 'saved', customEndpoint);
  });

  it('can replay an already persisted attempt without writing its storage again', () => {
    service
      .submit<PublicRequestReceipt, SubmissionPayload>(customEndpoint, { message: 'Original' })
      .subscribe({ error: () => {} });
    const first = http.expectOne('/api/custom-orders');
    const key = first.request.headers.get('Idempotency-Key');
    first.error(new ProgressEvent('error'));
    const storageWrite = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });
    service.replay<PublicRequestReceipt, SubmissionPayload>(customEndpoint).subscribe();
    const replay = http.expectOne('/api/custom-orders');
    expect(replay.request.headers.get('Idempotency-Key')).toBe(key);
    expect(replay.request.body).toEqual({ message: 'Original' });
    acknowledge(replay, 'saved', customEndpoint);
    expect(storageWrite).not.toHaveBeenCalled();
  });

  it('publishes pending changes to reactive consumers without a page reload', () => {
    const pending = computed(() => service.pendingSubmission<SubmissionPayload>(customEndpoint));
    expect(pending()).toBeNull();
    service
      .submit<PublicRequestReceipt, SubmissionPayload>(customEndpoint, { message: 'Saved body' })
      .subscribe();
    expect(pending()?.payload.message).toBe('Saved body');
    acknowledge(http.expectOne('/api/custom-orders'), 'saved', customEndpoint);
    expect(pending()).toBeNull();
  });
});
