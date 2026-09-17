import {
  GuestOrderTrackingCredentials,
  GuestOrderTrackingReference,
} from '../models/guest-order-tracking.model';
import { GUEST_ORDER_TRACKING_LINK } from './guest-order-tracking.data';

export function parseGuestOrderTrackingFragment(
  fragment: string,
): GuestOrderTrackingCredentials | null {
  if (!fragment || fragment.length > GUEST_ORDER_TRACKING_LINK.maximumFragmentLength) return null;
  const parameters = new URLSearchParams(fragment.startsWith('#') ? fragment.slice(1) : fragment);
  if (parameters.size !== 2 || !parameters.has('order') || !parameters.has('token')) return null;
  const orderNumber = parameters.get('order') ?? '';
  const trackingToken = parameters.get('token') ?? '';
  if (
    !GUEST_ORDER_TRACKING_LINK.orderNumberPattern.test(orderNumber) ||
    !GUEST_ORDER_TRACKING_LINK.tokenPattern.test(trackingToken)
  )
    return null;
  return { orderNumber, trackingToken };
}

export function createGuestOrderTrackingUrl(
  order: GuestOrderTrackingReference,
  origin: string,
): string {
  const parameters = new URLSearchParams({
    order: order.orderNumber,
    token: order.trackingToken ?? '',
  });
  if (!parseGuestOrderTrackingFragment(parameters.toString())) return '';
  try {
    const url = new URL(origin);
    if ((url.protocol !== 'http:' && url.protocol !== 'https:') || url.username || url.password)
      return '';
    url.pathname = GUEST_ORDER_TRACKING_LINK.path;
    url.search = '';
    url.hash = parameters.toString();
    return url.href;
  } catch {
    return '';
  }
}
