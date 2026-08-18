import { CustomOrderRequest } from '../models/custom-order-request.model';
import { Order } from '../models/order.model';

export function buildCustomRequestMessage(request: CustomOrderRequest, requestNumber: string = ''): string {
  const requestReference = requestNumber ? `Custom request: ${requestNumber}` : 'Custom design feasibility request';
  return [
    'Hello, I would like to continue a custom design review.',
    requestReference,
    `Design source: ${request.designSource}`,
    `Approximate size: ${request.dimensions || 'To be confirmed'}`,
    'I would like to confirm availability, price, and production time.'
  ].join('\n');
}

export function buildOrderSupportMessage(order: Order): string {
  return `Hello, I need help with order ${order.orderNumber}.\nCurrent status: ${order.status}.`;
}
