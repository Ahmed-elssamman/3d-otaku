export interface GuestOrderTrackingCredentials {
  orderNumber: string;
  trackingToken: string;
}

export interface GuestOrderTrackingReference {
  orderNumber: string;
  trackingToken?: string;
}
