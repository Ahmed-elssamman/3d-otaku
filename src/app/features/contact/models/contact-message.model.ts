import { ContactMessageStatus } from '../enums/contact.enum';

export interface ContactMessageRequest {
  fullName: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

export interface ContactMessageResponse {
  id: string;
  messageNumber: string;
  createdAt: string;
}

export interface ContactMessageItem extends ContactMessageRequest {
  id: string;
  messageNumber: string;
  status: ContactMessageStatus;
  createdAt: string;
}

export interface ContactMessageQuery {
  page?: number;
  limit?: number;
  status?: ContactMessageStatus;
  search?: string;
}
