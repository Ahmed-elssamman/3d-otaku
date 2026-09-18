import { OrderStatusHistoryItem } from '@core/models/order.model';
import {
  ORDER_STATUS_PRESENTATIONS,
  UNRECOGNIZED_ORDER_STATUS,
  OrderHistoryViewItem,
} from './orders.control';

export function orderHistoryViews(history: OrderStatusHistoryItem[]): OrderHistoryViewItem[] {
  if (!Array.isArray(history)) return [];
  return history.flatMap((entry, index) => {
    if (
      !entry ||
      typeof entry.status !== 'string' ||
      typeof entry.createdAt !== 'string' ||
      !Number.isFinite(Date.parse(entry.createdAt))
    )
      return [];
    const presentation = Object.hasOwn(ORDER_STATUS_PRESENTATIONS, entry.status)
      ? ORDER_STATUS_PRESENTATIONS[entry.status]
      : UNRECOGNIZED_ORDER_STATUS;
    return [
      {
        id: `${entry.createdAt}-${index}`,
        label: presentation.labelAr,
        createdAt: entry.createdAt,
        publicNote: typeof entry.publicNote === 'string' ? entry.publicNote.trim() : '',
      },
    ];
  });
}
