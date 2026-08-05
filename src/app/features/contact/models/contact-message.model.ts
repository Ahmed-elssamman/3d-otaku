export interface ContactMessageRequest {
  fullName: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

export interface ContactMessageResponse {
  id: string;
  createdAt: string;
}

export interface ContactMessageItem extends ContactMessageRequest {
  id: string;
  status: 'unread' | 'read';
  createdAt: string;
}
