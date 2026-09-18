import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { ApiService } from '@core/api/api.service';
import { ApiResponse, PaginatedResponse } from '@core/models/api-response.model';
import { environment } from '../../../../environments/environment';
import { UpdateAdminOrderShippingRequest } from '../models/admin-order-shipping.model';
import {
  AdminPaymentDetailRecoveryResult,
  AdminPaymentDetailResult,
  AdminPaymentRecoveryResult,
  AdminPaymentResult,
  CorrectAdminPaymentRequest,
  RecordAdminPaymentRequest,
} from '../models/admin-order-payment.model';
import { AdminOperationKind } from '../enums/admin-operation.enum';
import { normalizeAdminOrderItem } from '../utils/admin-order-manufacturing.util';
import {
  AdminContactMessageRecord,
  AdminCustomOrderRecord,
  AdminDetailField,
  AdminOperationDetail,
  AdminOperationQuery,
  AdminOperationStatusRequest,
  AdminOperationSummary,
  AdminOrderRecord,
  AdminStatusHistory,
} from '../models/admin-operation.model';
import {
  ADMIN_CUSTOM_PRODUCT_LABELS,
  ADMIN_DESIGN_SOURCE_LABELS,
  ADMIN_STATUS_LABELS,
  adminStatusOption,
} from '../data/admin-operations.data';

@Injectable({ providedIn: 'root' })
export class AdminOperationsService {
  private api = inject(ApiService);
  private http = inject(HttpClient);

  recordPayment(
    id: string,
    request: RecordAdminPaymentRequest,
    key: string,
  ): Observable<ApiResponse<AdminPaymentDetailResult>> {
    return this.http
      .post<ApiResponse<AdminPaymentResult>>(
        `${environment.apiBaseUrl}/admin/orders/${encodeURIComponent(id)}/payments`,
        request,
        { headers: new HttpHeaders({ 'Idempotency-Key': key }) },
      )
      .pipe(
        map((response) => ({
          ...response,
          data: { ...response.data, order: this.orderDetail(response.data.order) },
        })),
      );
  }

  correctPayment(
    id: string,
    entryId: string,
    request: CorrectAdminPaymentRequest,
    key: string,
  ): Observable<ApiResponse<AdminPaymentDetailResult>> {
    return this.http
      .post<ApiResponse<AdminPaymentResult>>(
        `${environment.apiBaseUrl}/admin/orders/${encodeURIComponent(id)}/payments/${encodeURIComponent(entryId)}/correction`,
        request,
        { headers: new HttpHeaders({ 'Idempotency-Key': key }) },
      )
      .pipe(
        map((response) => ({
          ...response,
          data: { ...response.data, order: this.orderDetail(response.data.order) },
        })),
      );
  }

  recoverPayment(
    id: string,
    key: string,
  ): Observable<ApiResponse<AdminPaymentDetailRecoveryResult>> {
    return this.http
      .get<ApiResponse<AdminPaymentRecoveryResult>>(
        `${environment.apiBaseUrl}/admin/orders/${encodeURIComponent(id)}/payments/attempt`,
        { headers: new HttpHeaders({ 'Idempotency-Key': key }) },
      )
      .pipe(
        map((response) => ({
          ...response,
          data: { ...response.data, order: this.orderDetail(response.data.order) },
        })),
      );
  }

  updateShipping(
    id: string,
    request: UpdateAdminOrderShippingRequest,
    key: string,
  ): Observable<ApiResponse<AdminOperationDetail>> {
    return this.http
      .patch<ApiResponse<AdminOrderRecord>>(
        `${environment.apiBaseUrl}/admin/orders/${encodeURIComponent(id)}/shipping`,
        request,
        { headers: new HttpHeaders({ 'Idempotency-Key': key }) },
      )
      .pipe(map((response) => ({ ...response, data: this.orderDetail(response.data) })));
  }

  getList(
    kind: AdminOperationKind,
    query: AdminOperationQuery,
  ): Observable<PaginatedResponse<AdminOperationSummary>> {
    const endpoint = `/admin/${kind}`;
    switch (kind) {
      case AdminOperationKind.Orders:
        return this.api.getPaginated<AdminOrderRecord>(endpoint, query).pipe(
          map((response) => ({
            ...response,
            data: response.data.map((record) => this.orderSummary(record)),
          })),
        );
      case AdminOperationKind.CustomOrders:
        return this.api.getPaginated<AdminCustomOrderRecord>(endpoint, query).pipe(
          map((response) => ({
            ...response,
            data: response.data.map((record) => this.customSummary(record)),
          })),
        );
      case AdminOperationKind.Messages:
        return this.api.getPaginated<AdminContactMessageRecord>(endpoint, query).pipe(
          map((response) => ({
            ...response,
            data: response.data.map((record) => this.messageSummary(record)),
          })),
        );
    }
  }

  getDetail(kind: AdminOperationKind, id: string): Observable<ApiResponse<AdminOperationDetail>> {
    const endpoint = `/admin/${kind}/${encodeURIComponent(id)}`;
    switch (kind) {
      case AdminOperationKind.Orders:
        return this.api
          .get<AdminOrderRecord>(endpoint)
          .pipe(map((response) => ({ ...response, data: this.orderDetail(response.data) })));
      case AdminOperationKind.CustomOrders:
        return this.api
          .get<AdminCustomOrderRecord>(endpoint)
          .pipe(map((response) => ({ ...response, data: this.customDetail(response.data) })));
      case AdminOperationKind.Messages:
        return this.api
          .get<AdminContactMessageRecord>(endpoint)
          .pipe(map((response) => ({ ...response, data: this.messageDetail(response.data) })));
    }
  }

  updateStatus(
    kind: AdminOperationKind,
    id: string,
    request: AdminOperationStatusRequest,
  ): Observable<ApiResponse<AdminOperationDetail>> {
    const endpoint = `/admin/${kind}/${encodeURIComponent(id)}/status`;
    switch (kind) {
      case AdminOperationKind.Orders:
        return this.api
          .patch<AdminOrderRecord, AdminOperationStatusRequest>(endpoint, request)
          .pipe(map((response) => ({ ...response, data: this.orderDetail(response.data) })));
      case AdminOperationKind.CustomOrders:
        return this.api
          .patch<AdminCustomOrderRecord, AdminOperationStatusRequest>(endpoint, request)
          .pipe(map((response) => ({ ...response, data: this.customDetail(response.data) })));
      case AdminOperationKind.Messages:
        return this.api
          .patch<AdminContactMessageRecord, AdminOperationStatusRequest>(endpoint, request)
          .pipe(map((response) => ({ ...response, data: this.messageDetail(response.data) })));
    }
  }

  private orderSummary(record: AdminOrderRecord): AdminOperationSummary {
    return {
      id: record.id,
      reference: record.orderNumber,
      customerName: record.customer.fullName,
      summary: record.customer.city || '',
      status: record.status,
      statusLabel: ADMIN_STATUS_LABELS[record.status] || record.status,
      createdAt: record.createdAt,
    };
  }

  private customSummary(record: AdminCustomOrderRecord): AdminOperationSummary {
    return {
      id: record.id,
      reference: record.requestNumber || 'طلب تصميم',
      customerName: record.fullName,
      summary: ADMIN_CUSTOM_PRODUCT_LABELS[record.productIdea] || record.productIdea,
      status: record.status,
      statusLabel: ADMIN_STATUS_LABELS[record.status] || record.status,
      createdAt: record.createdAt,
    };
  }

  private messageSummary(record: AdminContactMessageRecord): AdminOperationSummary {
    return {
      id: record.id,
      reference: record.messageNumber || 'رسالة عميل',
      customerName: record.fullName,
      summary: record.subject,
      status: record.status,
      statusLabel: ADMIN_STATUS_LABELS[record.status] || record.status,
      createdAt: record.createdAt,
    };
  }

  private orderDetail(record: AdminOrderRecord): AdminOperationDetail {
    return {
      ...this.orderSummary(record),
      fields: this.presentFields([
        { label: 'الاسم', value: record.customer.fullName },
        {
          label: 'الهاتف',
          value: record.customer.phone || record.customer.whatsappNumber || '',
          ltr: true,
        },
        { label: 'البريد الإلكتروني', value: record.customer.email || '', ltr: true },
        { label: 'المحافظة', value: record.customer.governorate || '' },
        { label: 'المدينة أو المنطقة', value: record.customer.city || '' },
        { label: 'عنوان التوصيل', value: record.customer.address },
        { label: 'ملاحظات العميل', value: record.customer.notes || '' },
      ]),
      items: record.items.map(normalizeAdminOrderItem),
      totals: {
        subtotal: record.subtotal,
        deliveryFee: record.deliveryFee,
        deliveryFeeConfirmed: record.deliveryFeeConfirmed,
        discount: record.discount,
        total: record.total,
      },
      history: this.history(record.statusHistory),
      nextStatuses: (record.allowedNextStatuses || []).map(adminStatusOption),
      referenceUrl: '',
      payments: record.paymentSummary
        ? {
            orderId: record.id,
            paymentRevision: record.paymentRevision ?? 0,
            shippingRevision: record.shippingRevision ?? 0,
            status: record.status,
            total: record.total,
            deliveryFeeConfirmed: record.deliveryFeeConfirmed,
            summary: record.paymentSummary,
            history: record.paymentHistory || [],
          }
        : null,
      shipping: {
        orderId: record.id,
        status: record.status,
        shippingRevision: record.shippingRevision ?? 0,
        canConfirmShipping: record.canConfirmShipping === true,
        deliveryFee: record.deliveryFee,
        deliveryFeeConfirmed: record.deliveryFeeConfirmed,
        subtotal: record.subtotal,
        discount: record.discount,
        total: record.total,
        history: record.shippingHistory || [],
      },
    };
  }

  private customDetail(record: AdminCustomOrderRecord): AdminOperationDetail {
    return {
      ...this.customSummary(record),
      fields: this.presentFields([
        { label: 'الاسم', value: record.fullName },
        { label: 'الهاتف', value: record.phone || record.whatsappNumber, ltr: true },
        { label: 'البريد الإلكتروني', value: record.email, ltr: true },
        {
          label: 'الفكرة',
          value: ADMIN_CUSTOM_PRODUCT_LABELS[record.productIdea] || record.productIdea,
        },
        { label: 'وصف التصميم', value: record.description },
        { label: 'اللون', value: record.preferredColor },
        { label: 'المقاس التقريبي', value: record.estimatedSize },
        { label: 'الخامة المطلوبة', value: record.preferredMaterial },
        { label: 'الكمية', value: String(record.quantity) },
        {
          label: 'مصدر التصميم',
          value: ADMIN_DESIGN_SOURCE_LABELS[record.designSource] || record.designSource,
        },
        {
          label: 'إقرار استخدام التصميم',
          value: record.rightsConfirmed ? 'أكد العميل امتلاكه إذن الاستخدام' : 'لم يتم التأكيد',
        },
        { label: 'ملاحظات العميل', value: record.notes },
      ]),
      items: [],
      totals: null,
      history: this.history(record.statusHistory),
      nextStatuses: (record.allowedNextStatuses || []).map(adminStatusOption),
      referenceUrl: this.safeReference(record.referenceImageUrl),
      shipping: null,
      payments: null,
    };
  }

  private messageDetail(record: AdminContactMessageRecord): AdminOperationDetail {
    return {
      ...this.messageSummary(record),
      fields: this.presentFields([
        { label: 'الاسم', value: record.fullName },
        { label: 'البريد الإلكتروني', value: record.email, ltr: true },
        { label: 'الهاتف', value: record.phone, ltr: true },
        { label: 'الموضوع', value: record.subject },
        { label: 'الرسالة', value: record.message },
      ]),
      items: [],
      totals: null,
      history: this.history(record.statusHistory),
      nextStatuses: (record.allowedNextStatuses || []).map(adminStatusOption),
      referenceUrl: '',
      shipping: null,
      payments: null,
    };
  }

  private history(history: AdminStatusHistory[]) {
    return (history || []).map((item) => ({
      statusLabel: ADMIN_STATUS_LABELS[item.status] || item.status,
      createdAt: item.createdAt,
      note: item.publicNote || item.note || '',
    }));
  }

  private presentFields(fields: AdminDetailField[]): AdminDetailField[] {
    return fields.filter((field) => Boolean(field.value));
  }

  private safeReference(value: string | null): string {
    if (!value) return '';
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
    } catch {
      return '';
    }
  }
}
