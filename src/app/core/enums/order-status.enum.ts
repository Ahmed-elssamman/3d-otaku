export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PRINTED = 'printed',
  CONFIRMED = 'confirmed',
  AWAITING_PAYMENT = 'awaiting_payment',
  IN_PRODUCTION = 'in_production',
  QUALITY_CHECK = 'quality_check',
  READY_TO_SHIP = 'ready_to_ship',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
  REQUIRES_CUSTOMER_ACTION = 'requires_customer_action'
}
