import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OrderStatus } from '@core/enums/order-status.enum';
import { Order } from '@core/models/order.model';
import { PrivateOrderLinkComponent } from './private-order-link.component';
import { firstValueFrom, Subject } from 'rxjs';

describe('private order link copy action', () => {
  const order: Order = {
    id: 'private-link-order',
    orderNumber: 'ORD-100',
    trackingToken: 'a'.repeat(64),
    items: [],
    customer: { fullName: 'Test Customer', phone: '+201012345678', address: 'Test address' },
    subtotal: 100,
    deliveryFee: 0,
    discount: 0,
    total: 100,
    currency: 'EGP',
    status: OrderStatus.PENDING,
    paymentMethod: 'manual',
    createdAt: '',
    updatedAt: '',
  };
  const previousClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard') ?? null;
  const writeText = vi.fn<(value: string) => Promise<void>>();
  let fixture: ComponentFixture<PrivateOrderLinkComponent>;

  beforeEach(() => {
    writeText.mockReset();
    writeText.mockResolvedValue();
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    fixture = TestBed.createComponent(PrivateOrderLinkComponent);
    fixture.componentRef.setInput('order', order);
    fixture.detectChanges();
  });

  afterEach(() => {
    if (previousClipboard) Object.defineProperty(navigator, 'clipboard', previousClipboard);
    else Reflect.deleteProperty(navigator, 'clipboard');
  });

  it('copies the fragment link only on the explicit action without displaying the credential', async () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(writeText).not.toHaveBeenCalled();
    expect(element.innerHTML).not.toContain(order.trackingToken);
    await fixture.componentInstance.copyLink();
    await fixture.whenStable();
    expect(writeText).toHaveBeenCalledWith(fixture.componentInstance.link());
    expect(element.textContent).toContain('تم نسخ رابط المتابعة');
    expect(element.querySelector('textarea')).toBeNull();
  });

  it('offers a selectable private link when automatic copying fails', async () => {
    writeText.mockRejectedValueOnce(new Error('Clipboard unavailable'));
    await fixture.componentInstance.copyLink();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const fallback = element.querySelector('textarea');
    expect(fallback?.value).toBe(fixture.componentInstance.link());
    expect(fallback?.readOnly).toBe(true);
    expect(element.textContent).toContain('انسخه يدويًا');
    expect(element.textContent).toContain('بيانات التوصيل');
  });

  it('does not report an old copied link as belonging to a replacement receipt', async () => {
    const copying = new Subject<void>();
    writeText.mockReturnValueOnce(firstValueFrom(copying));
    const copy = fixture.componentInstance.copyLink();
    fixture.componentRef.setInput('order', {
      ...order,
      orderNumber: 'ORD-200',
      trackingToken: 'b'.repeat(64),
    });
    copying.next();
    copying.complete();
    await copy;
    await fixture.whenStable();
    expect(fixture.componentInstance.isCopied()).toBe(false);
    expect(fixture.componentInstance.manualLink()).toBe('');
    expect(fixture.componentInstance.link()).toContain('order=ORD-200');
  });

  it('hides the action when the receipt has no usable guest credential', async () => {
    fixture.componentRef.setInput('order', { ...order, trackingToken: '' });
    await fixture.whenStable();
    await fixture.componentInstance.copyLink();
    expect((fixture.nativeElement as HTMLElement).querySelector('button')).toBeNull();
    expect(writeText).not.toHaveBeenCalled();
  });
});
