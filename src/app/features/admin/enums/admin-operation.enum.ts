export enum AdminOperationKind {
  Orders = 'orders',
  CustomOrders = 'custom-orders',
  Messages = 'contact-messages',
}

export enum AdminOperationSort {
  Newest = 'newest',
  Oldest = 'oldest',
}

export enum AdminOperationStatus {
  Pending = 'pending',
  Processing = 'processing',
  Printed = 'printed',
  Shipped = 'shipped',
  Delivered = 'delivered',
  Cancelled = 'cancelled',
  Contacted = 'contacted',
  InProgress = 'in_progress',
  Completed = 'completed',
  Unread = 'unread',
  Read = 'read',
}
