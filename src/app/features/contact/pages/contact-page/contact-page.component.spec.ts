import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiErrorInterceptor } from '@core/interceptors/api-error.interceptor';
import { CustomOrderRequest } from '@core/models/custom-order-request.model';
import { WhatsAppService } from '@core/services/whatsapp.service';
import { ContactMode, CustomOrderStatus, DesignSource } from '../../enums/contact.enum';
import { PublicRequestEndpoint } from '../../enums/public-request-endpoint.enum';
import { ContactMessageRequest, ContactMessageResponse } from '../../models/contact-message.model';
import { CreateCustomOrderRequest, CustomOrder } from '../../models/custom-order.model';
import { PUBLIC_REQUEST_STORAGE_PREFIX } from '../../services/request-submission.data';
import { CONTACT_PAGE_STORAGE, CONTACT_RECOVERY_TEXT } from './contact-page.control';
import { ContactPageComponent } from './contact-page.component';

describe('Contact page saved request recovery', () => {
  let fixture: ComponentFixture<ContactPageComponent>;
  let component: ContactPageComponent;
  let http: HttpTestingController;
  const customUrl = '/api/custom-orders';
  const messageUrl = '/api/contact-messages';
  const customWhatsApp = vi.fn(
    (request: CustomOrderRequest, reference: string) =>
      `https://wa.me/201012345678?text=${encodeURIComponent(`${reference}: ${request.dimensions}`)}`,
  );

  function configure(): void {
    TestBed.configureTestingModule({
      imports: [ContactPageComponent],
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: WhatsAppService,
          useValue: { getCustomOrderUrl: customWhatsApp, getDirectChatUrl: () => '' },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  }

  async function createPage(): Promise<void> {
    fixture = TestBed.createComponent(ContactPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function reloadPage(): Promise<void> {
    fixture.destroy();
    http.verify();
    TestBed.resetTestingModule();
    configure();
    await createPage();
  }

  function fillCustom(): void {
    component.customForm.patchValue({
      fullName: 'عميل اختبار',
      phone: '٠١٠١٢٣٤٥٦٧٨',
      details: 'منظم مكتب أخضر للمراجعة',
      dimensions: '8 × 12 × 5',
      quantity: 2,
      rightsConfirmed: true,
    });
  }

  function fillMessage(): void {
    component.selectMode(ContactMode.Message);
    component.messageForm.patchValue({
      fullName: 'عميل الاستفسار',
      email: 'original@example.com',
      phone: '',
      subject: 'سؤال عن المقاس',
      message: 'محتاج أعرف المقاس قبل الشراء',
    });
  }

  function acknowledgeCustom(request: TestRequest): void {
    const payload: CreateCustomOrderRequest = request.request.body;
    const data: CustomOrder = {
      ...payload,
      id: 'saved-custom',
      requestNumber: 'CUSTOM-SAVED',
      status: CustomOrderStatus.Pending,
      createdAt: '2026-09-17T04:30:00.000Z',
    };
    request.flush({ success: true, message: 'Received', data });
  }

  function acknowledgeMessage(request: TestRequest): void {
    const data: ContactMessageResponse = {
      id: 'saved-message',
      messageNumber: 'MESSAGE-SAVED',
      createdAt: '2026-09-17T04:30:00.000Z',
    };
    request.flush({ success: true, message: 'Received', data });
  }

  function pageText(): string {
    const element: HTMLElement = fixture.nativeElement;
    return element.textContent ?? '';
  }

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    customWhatsApp.mockClear();
    vi.spyOn(window, 'scrollTo').mockImplementation(() => null);
    configure();
  });

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
    sessionStorage.clear();
    localStorage.clear();
  });

  it('replays the original custom body after reload and invalid edits, preserving the draft and original WhatsApp details', async () => {
    await createPage();
    fillCustom();
    component.onSubmit();
    const first = http.expectOne(customUrl);
    const key = first.request.headers.get('Idempotency-Key');
    const payload: CreateCustomOrderRequest = first.request.body;
    first.error(new ProgressEvent('error'));
    await fixture.whenStable();
    component.customForm.patchValue({ details: '', dimensions: '22 × 18', quantity: null });
    component.onSubmit();
    await fixture.whenStable();
    expect(component.customForm.invalid).toBe(true);
    expect(component.submitError()).toBe(CONTACT_RECOVERY_TEXT.changed);
    expect(component.invalidCustomSubmission()).toBe(false);
    expect(pageText()).not.toContain('راجع الحقول الموضحة عشان نقدر نستلم فكرتك.');
    expect(pageText()).toContain(CONTACT_RECOVERY_TEXT.changed);
    http.expectNone(customUrl);
    await reloadPage();
    http.expectNone(customUrl);
    expect(component.customForm.controls.quantity.value).toBeNull();
    expect(component.customForm.controls.dimensions.value).toBe('22 × 18');
    expect(component.canReplayCustom()).toBe(true);
    expect(pageText()).toContain(CONTACT_RECOVERY_TEXT.pendingCustom);
    component.retryCustomRequest();
    const replay = http.expectOne(customUrl);
    expect(replay.request.headers.get('Idempotency-Key')).toBe(key);
    expect(replay.request.body).toEqual(payload);
    acknowledgeCustom(replay);
    await fixture.whenStable();
    expect(pageText()).toContain('CUSTOM-SAVED');
    expect(pageText()).toContain('منظم مكتب أخضر للمراجعة');
    expect(pageText()).not.toContain('22 × 18');
    expect(customWhatsApp).toHaveBeenLastCalledWith(
      expect.objectContaining({ dimensions: '8 × 12 × 5', quantity: 2 }),
      'CUSTOM-SAVED',
    );
    expect(component.retainsCustomDraft()).toBe(true);
    await reloadPage();
    http.expectNone(customUrl);
    expect(component.requestNumber()).toBe('CUSTOM-SAVED');
    component.resetCustomForm();
    await fixture.whenStable();
    expect(component.customForm.controls.details.value).toBe('');
    expect(component.customForm.controls.quantity.value).toBeNull();
    expect(component.customForm.controls.dimensions.value).toBe('22 × 18');
    expect(component.hasPendingCustom()).toBe(false);
  });

  it('recovers a message independently of an invalid edited email and keeps changes made while recovery is in flight', async () => {
    await createPage();
    fillMessage();
    component.sendMessage();
    const first = http.expectOne(messageUrl);
    const key = first.request.headers.get('Idempotency-Key');
    const payload: ContactMessageRequest = first.request.body;
    first.error(new ProgressEvent('error'));
    await fixture.whenStable();
    component.messageForm.controls.email.setValue('invalid');
    component.sendMessage();
    await fixture.whenStable();
    expect(component.messageForm.invalid).toBe(true);
    expect(component.invalidMessageSubmission()).toBe(false);
    expect(pageText()).not.toContain('راجع الحقول الموضحة قبل إرسال الرسالة.');
    expect(pageText()).toContain(CONTACT_RECOVERY_TEXT.changed);
    http.expectNone(messageUrl);
    await reloadPage();
    expect(component.mode()).toBe(ContactMode.Message);
    expect(component.messageForm.controls.email.value).toBe('invalid');
    component.retryMessage();
    const replay = http.expectOne(messageUrl);
    expect(replay.request.headers.get('Idempotency-Key')).toBe(key);
    expect(replay.request.body).toEqual(payload);
    component.messageForm.controls.message.setValue('مسودة جديدة أثناء وصول التأكيد');
    acknowledgeMessage(replay);
    await fixture.whenStable();
    expect(pageText()).toContain('original@example.com');
    expect(pageText()).toContain(payload.message);
    expect(pageText()).not.toContain('مسودة جديدة أثناء وصول التأكيد');
    expect(component.retainsMessageDraft()).toBe(true);
    component.resetMessageForm();
    await fixture.whenStable();
    expect(component.messageForm.controls.email.value).toBe('invalid');
    expect(component.messageForm.controls.message.value).toBe('مسودة جديدة أثناء وصول التأكيد');
  });

  it('allows a corrected form after the first confirmed 422 and resets an unchanged successful form', async () => {
    await createPage();
    fillCustom();
    component.onSubmit();
    const first = http.expectOne(customUrl);
    const firstKey = first.request.headers.get('Idempotency-Key');
    first.flush(
      { errors: { description: ['Review details'] } },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    await fixture.whenStable();
    expect(component.hasPendingCustom()).toBe(false);
    expect(pageText()).toContain(CONTACT_RECOVERY_TEXT.rejected);
    expect(component.customForm.controls.details.value).toBe('منظم مكتب أخضر للمراجعة');
    component.customForm.controls.details.setValue('تفاصيل مصححة ومنظم مكتب صغير');
    component.onSubmit();
    const corrected = http.expectOne(customUrl);
    expect(corrected.request.headers.get('Idempotency-Key')).not.toBe(firstKey);
    expect(corrected.request.body.description).toBe('تفاصيل مصححة ومنظم مكتب صغير');
    acknowledgeCustom(corrected);
    await fixture.whenStable();
    expect(component.retainsCustomDraft()).toBe(false);
    component.resetCustomForm();
    await fixture.whenStable();
    expect(component.customForm.controls.fullName.value).toBe('');
    expect(component.customForm.controls.quantity.value).toBe(1);
  });

  it.each([409, 422])(
    'keeps the original message and key after uncertain recovery returns HTTP %s',
    async (status) => {
      await createPage();
      fillMessage();
      component.sendMessage();
      const first = http.expectOne(messageUrl);
      const key = first.request.headers.get('Idempotency-Key');
      const payload: ContactMessageRequest = first.request.body;
      first.error(new ProgressEvent('error'));
      await fixture.whenStable();
      component.retryMessage();
      http
        .expectOne(messageUrl)
        .flush(
          { errors: { requestDetails: ['Original request required'] } },
          { status, statusText: 'Rejected' },
        );
      await fixture.whenStable();
      expect(component.hasPendingMessage()).toBe(true);
      expect(component.messageNumber()).toBe('');
      component.messageForm.controls.message.setValue('رسالة مختلفة لكنها صالحة للإرسال');
      component.sendMessage();
      http.expectNone(messageUrl);
      component.retryMessage();
      const replay = http.expectOne(messageUrl);
      expect(replay.request.body).toEqual(payload);
      expect(replay.request.headers.get('Idempotency-Key')).toBe(key);
      acknowledgeMessage(replay);
      await fixture.whenStable();
      expect(component.messageNumber()).toBe('MESSAGE-SAVED');
    },
  );

  it('does not expose saved pending UI before the first client render and fails closed on unreadable recovery data', async () => {
    sessionStorage.setItem(
      `${PUBLIC_REQUEST_STORAGE_PREFIX}${PublicRequestEndpoint.CustomOrders}`,
      '{broken',
    );
    fixture = TestBed.createComponent(ContactPageComponent);
    component = fixture.componentInstance;
    expect(component.hasPendingCustom()).toBe(false);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.hasPendingCustom()).toBe(true);
    expect(component.canReplayCustom()).toBe(false);
    expect(pageText()).toContain(CONTACT_RECOVERY_TEXT.unreadable);
    fillCustom();
    component.onSubmit();
    component.retryCustomRequest();
    http.expectNone(customUrl);
    expect(
      sessionStorage.getItem(
        `${PUBLIC_REQUEST_STORAGE_PREFIX}${PublicRequestEndpoint.CustomOrders}`,
      ),
    ).toBe('{broken');
    fillMessage();
    component.sendMessage();
    acknowledgeMessage(http.expectOne(messageUrl));
    await fixture.whenStable();
    expect(component.messageNumber()).toBe('MESSAGE-SAVED');
    expect(component.hasPendingCustom()).toBe(true);
  });

  it('restores invalid reference drafts reactively without submitting them or revealing a receipt from malformed storage', async () => {
    await createPage();
    fillCustom();
    component.customForm.patchValue({
      designSource: DesignSource.Model,
      referenceUrl: 'http://invalid.example/model',
    });
    await reloadPage();
    expect(component.referenceRequired()).toBe(true);
    expect(component.customForm.controls.referenceUrl.value).toBe('http://invalid.example/model');
    expect(component.customForm.invalid).toBe(true);
    http.expectNone(customUrl);
    sessionStorage.setItem(
      CONTACT_PAGE_STORAGE.key,
      '{"version":1,"customReceipt":{"reference":"fake"}}',
    );
    await reloadPage();
    expect(component.requestNumber()).toBe('');
    expect(component.customForm.controls.fullName.value).toBe('');
    http.expectNone(customUrl);
  });

  it('warns when edited drafts cannot be persisted without losing the original pending request, then clears only after a successful save', async () => {
    await createPage();
    fillCustom();
    component.onSubmit();
    const first = http.expectOne(customUrl);
    const key = first.request.headers.get('Idempotency-Key');
    first.error(new ProgressEvent('error'));
    await fixture.whenStable();
    const originalSetItem = Storage.prototype.setItem;
    const storageFailure = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      storageKey: string,
      value: string,
    ): void {
      if (storageKey === CONTACT_PAGE_STORAGE.key)
        throw new DOMException('Storage full', 'QuotaExceededError');
      originalSetItem.call(this, storageKey, value);
    });
    component.customForm.controls.details.setValue('مسودة معدلة لم يتم حفظها بعد');
    await fixture.whenStable();
    expect(component.draftStorageUnavailable()).toBe(true);
    expect(pageText()).toContain(CONTACT_RECOVERY_TEXT.draftStorageUnavailable);
    expect(pageText()).not.toContain(CONTACT_RECOVERY_TEXT.pendingStorage);
    expect(component.customForm.controls.details.value).toBe('مسودة معدلة لم يتم حفظها بعد');
    expect(component.hasPendingCustom()).toBe(true);
    expect(
      sessionStorage.getItem(
        `${PUBLIC_REQUEST_STORAGE_PREFIX}${PublicRequestEndpoint.CustomOrders}`,
      ),
    ).toContain(key);
    component.onSubmit();
    http.expectNone(customUrl);
    storageFailure.mockRestore();
    await fixture.whenStable();
    expect(component.draftStorageUnavailable()).toBe(true);
    component.customForm.controls.details.setValue('مسودة معدلة تم حفظها بعد استعادة التخزين');
    await fixture.whenStable();
    expect(component.draftStorageUnavailable()).toBe(false);
    expect(pageText()).not.toContain(CONTACT_RECOVERY_TEXT.draftStorageUnavailable);
    await reloadPage();
    expect(component.customForm.controls.details.value).toBe(
      'مسودة معدلة تم حفظها بعد استعادة التخزين',
    );
    expect(component.hasPendingCustom()).toBe(true);
    http.expectNone(customUrl);
  });
});
