import { OrderStatus } from '@core/enums/order-status.enum';
import { orderHistoryViews } from './order-history.util';

describe('public order history presentation', () => {
  it('exposes only the public customer note with the existing Arabic status label', () => {
    const record = {
      status: OrderStatus.PROCESSING,
      createdAt: '2026-09-17T05:00:00Z',
      publicNote: '  راجع المقاس المكتوب في طلبك.  ',
      note: 'private-internal-note',
      actor: 'private-actor',
      shippingHistory: [{ note: 'private-shipping-note' }],
    };
    expect(orderHistoryViews([record])).toEqual([
      {
        id: `${record.createdAt}-0`,
        label: 'جاري التنفيذ',
        createdAt: record.createdAt,
        publicNote: 'راجع المقاس المكتوب في طلبك.',
      },
    ]);
  });

  it('does not display private notes as a fallback and safely handles unknown status or invalid dates', () => {
    const record = {
      status: 'constructor' as OrderStatus,
      createdAt: '2026-09-17T05:00:00Z',
      note: 'private-only-note',
    };
    expect(orderHistoryViews([record])[0]).toMatchObject({ label: 'تحديث حالة', publicNote: '' });
    expect(orderHistoryViews([{ ...record, createdAt: 'not-a-date' }])).toEqual([]);
    expect(orderHistoryViews([])).toEqual([]);
  });
});
