import { PublicRequestEndpoint } from '../enums/public-request-endpoint.enum';

export interface PendingPublicRequest<TBody extends object> {
  key: string;
  payload: TBody;
}

export interface StoredPublicRequest {
  endpoint: PublicRequestEndpoint;
  key: string;
  payload: string;
}

export interface PublicRequestReceipt {
  id: string;
  requestNumber?: string;
  messageNumber?: string;
}
