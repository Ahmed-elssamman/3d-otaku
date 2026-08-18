import { describe, expect, it } from 'vitest';
import { OrderStatus } from '../enums/order-status.enum';
import { CustomOrderRequest } from '../models/custom-order-request.model';
import { Order } from '../models/order.model';
import { buildCustomRequestMessage, buildOrderSupportMessage } from './whatsapp-message.util';

describe('WhatsApp message privacy', () => {
  it('does not include custom-request contact details or private reference URLs', () => {
    const request: CustomOrderRequest = {
      fullName: 'Private Name',
      phone: '+201000000000',
      email: 'private@example.com',
      designSource: 'makerworld-url',
      productType: 'display-model',
      referenceUrl: 'https://private.example/file.stl',
      dimensions: '12 cm',
      colorFinish: 'Blue',
      quantity: 1,
      details: 'Private notes',
      rightsConfirmed: true
    };
    const message = buildCustomRequestMessage(request, 'REQ-10');
    expect(message).toContain('REQ-10');
    expect(message).not.toContain(request.fullName);
    expect(message).not.toContain(request.phone);
    expect(message).not.toContain(request.email);
    expect(message).not.toContain(request.referenceUrl);
    expect(message).not.toContain(request.details);
  });

  it('includes only safe order support context', () => {
    const order: Order = {
      id: 'internal-id', orderNumber: 'ORD-10', items: [],
      customer: { fullName: 'Private Name', phone: '01000000000', address: 'Private address' },
      subtotal: 10, deliveryFee: 2, discount: 0, total: 12, currency: 'SAR',
      status: OrderStatus.PENDING, paymentMethod: 'whatsapp', createdAt: '2026-08-11T00:00:00Z', updatedAt: '2026-08-11T00:00:00Z'
    };
    const message = buildOrderSupportMessage(order);
    expect(message).toContain('ORD-10');
    expect(message).toContain('pending');
    expect(message).not.toContain(order.customer.fullName);
    expect(message).not.toContain(order.customer.phone);
    expect(message).not.toContain(order.customer.address);
    expect(message).not.toContain(order.id);
  });
});
