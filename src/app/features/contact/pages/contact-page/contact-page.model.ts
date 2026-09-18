import {
  ContactMode,
  CustomProductType,
  DesignSource,
  PrintMaterial,
} from '../../enums/contact.enum';
import { ContactMessageRequest } from '../../models/contact-message.model';
import { CreateCustomOrderRequest } from '../../models/custom-order.model';

export interface CustomFormDraft {
  fullName: string;
  phone: string;
  email: string;
  designSource: DesignSource;
  referenceUrl: string;
  productType: CustomProductType;
  dimensions: string;
  material: PrintMaterial;
  colorFinish: string;
  quantity: number | null;
  details: string;
  rightsConfirmed: boolean;
}

export interface ContactReceipt<TBody extends object> {
  reference: string;
  request: TBody;
  retainsDraft: boolean;
}

export interface ContactPageState {
  version: number;
  mode: ContactMode;
  custom: CustomFormDraft;
  message: ContactMessageRequest;
  customReceipt: ContactReceipt<CreateCustomOrderRequest> | null;
  messageReceipt: ContactReceipt<ContactMessageRequest> | null;
}

export interface ContactRequestSummary {
  fullName: string;
  contact: string;
  title: string;
  description: string;
  dimensions: string;
}
