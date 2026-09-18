import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { ProductConfigurationVersion } from '@core/enums/product-configuration-version.enum';
import { ProductModelType } from '@core/enums/product-model-type.enum';
import { PaymentSummaryState } from '@core/enums/payment-summary-state.enum';
import { environment } from '../../../../../environments/environment';
import { AdminOperationKind, AdminOperationStatus } from '../../enums/admin-operation.enum';
import { AdminManufacturingSnapshotState } from '../../enums/admin-manufacturing-snapshot.enum';
import { ManufacturingReviewStatus } from '../../enums/manufacturing-review.enum';
import { AdminOperationDetail, AdminOrderRecord } from '../../models/admin-operation.model';
import {
  AdminOrderItemRecord,
  AdminOrderManufacturingSnapshot,
} from '../../models/admin-order-manufacturing.model';
import { AdminOperationsService } from '../../services/admin-operations.service';
import { AdminOperationsPageComponent } from '../../pages/operations/admin-operations-page.component';
import {
  normalizeAdminManufacturingSnapshot,
  normalizeAdminOrderItem,
  preserveAdminManufacturingDetail,
} from '../../utils/admin-order-manufacturing.util';
import { AdminOrderManufacturingComponent } from './admin-order-manufacturing.component';

function snapshot(): AdminOrderManufacturingSnapshot {
  return {
    version: ProductConfigurationVersion.Current,
    modelUrl: '/uploads/models/private-original.stl',
    modelType: ProductModelType.STL,
    gallery: ['/uploads/private-source.webp'],
    source: {
      manifestPath: 'private/source.json',
      manifestSha256: 'a'.repeat(64),
      provenanceUrl: 'https://example.test/private-source',
      attribution: 'نسبة التصميم الأصلية',
      previewLabel: 'عينة أصلية',
    },
    requiresManufacturingReview: true,
    reviewRevision: 3,
    reviewStatus: ManufacturingReviewStatus.Approved,
    approvedFingerprint: 'b'.repeat(64),
    approvedAt: '2026-09-17T00:00:00.000Z',
    approvedBy: 'c'.repeat(24),
    verifiedWeightGrams: 83,
    consumedFilamentGrams: 91.5,
    verifiedPrintHours: 3.25,
    measurementReference: 'مرجع القياسات الأصلي',
    sampleReference: 'مرجع العينة الأصلي',
    rightsReference: 'مرجع الإذن الأصلي',
  };
}

function item(): AdminOrderItemRecord {
  return {
    productId: 'original-product',
    slug: 'original-design',
    name: 'القطعة وقت الشراء',
    image: '/original.webp',
    quantity: 1,
    unitPrice: 150,
    discountPrice: null,
    lineTotal: 150,
    configurationFingerprint: 'd'.repeat(64),
    configuration: {
      version: ProductConfigurationVersion.Current,
      material: 'PLA+',
      finish: '',
      color: 'Blue',
      size: '10 cm',
      weight: '83 g',
      printTime: '3.25 hours',
      layerHeight: '0.2 mm',
      infill: '15%',
      isMadeToOrder: false,
      productionTimeMin: null,
      productionTimeMax: null,
      productionTimeUnit: null,
      safetyNote: 'قطعة للزينة فقط',
    },
    manufacturingSnapshot: snapshot(),
  };
}

function serverOrder(items = [item()]): AdminOrderRecord {
  return {
    id: 'manufacturing-unit-order',
    orderNumber: 'ORD-MANUFACTURING-UNIT',
    items,
    customer: { fullName: 'عميل اختبار', phone: '+201012345678', address: 'عنوان الاختبار' },
    subtotal: 150,
    deliveryFee: 0,
    deliveryFeeConfirmed: false,
    discount: 0,
    total: 150,
    currency: 'EGP',
    status: AdminOperationStatus.Pending,
    allowedNextStatuses: [AdminOperationStatus.Processing],
    statusHistory: [],
    createdAt: '2026-09-17T00:00:00Z',
    updatedAt: '2026-09-17T00:00:00Z',
    shippingRevision: 0,
    canConfirmShipping: true,
    shippingHistory: [],
    paymentRevision: 0,
    paymentHistory: [],
    paymentSummary: {
      state: PaymentSummaryState.NoRecords,
      recordedCollected: 0,
      recordedRefunded: 0,
      recordedNet: 0,
      balanceDue: null,
      credit: null,
      shippingConfirmed: false,
    },
  };
}

describe('Stored administrator manufacturing evidence', () => {
  let http: HttpTestingController;
  let service: AdminOperationsService;
  const orderUrl = `${environment.apiBaseUrl}/admin/orders/manufacturing-unit-order`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AdminOrderManufacturingComponent, AdminOperationsPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: { operationKind: AdminOperationKind.Orders } } },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(AdminOperationsService);
  });
  afterEach(() => http.verify());

  function readDetail(record = serverOrder()): AdminOperationDetail {
    let result: AdminOperationDetail | null = null;
    service.getDetail(AdminOperationKind.Orders, record.id).subscribe((response) => {
      result = response.data;
    });
    http
      .expectOne(`${environment.apiBaseUrl}/admin/orders/${record.id}`)
      .flush({ success: true, message: '', data: record });
    if (!result) throw new Error('The synthetic detail response was not mapped.');
    return result;
  }

  function openPage(): ComponentFixture<AdminOperationsPageComponent> {
    const fixture = TestBed.createComponent(AdminOperationsPageComponent);
    fixture.detectChanges();
    http
      .expectOne((request) => request.url === `${environment.apiBaseUrl}/admin/orders`)
      .flush({
        success: true,
        message: '',
        data: [],
        meta: {
          page: 1,
          limit: 10,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });
    fixture.componentInstance.openDetail('manufacturing-unit-order');
    http.expectOne(orderUrl).flush({ success: true, message: '', data: serverOrder() });
    fixture.detectChanges();
    return fixture;
  }

  it('whitelists stored evidence and distinguishes omitted detail, explicit legacy null and malformed data', () => {
    const original = {
      ...snapshot(),
      privateUnexpected: 'do not copy',
      source: {
        ...snapshot().source,
        manifestPath: 'private/source.json',
        manifestSha256: 'a'.repeat(64),
        provenanceUrl: '',
        attribution: '',
        previewLabel: '',
        sourceDraftJson: 'do not copy',
      },
    };
    const normalized = normalizeAdminManufacturingSnapshot(original);
    expect(normalized?.consumedFilamentGrams).toBe(91.5);
    expect(JSON.stringify(normalized)).not.toContain('do not copy');
    const { manufacturingSnapshot, ...omitted } = item();
    expect(normalizeAdminOrderItem(omitted).manufacturingSnapshotState).toBe(
      AdminManufacturingSnapshotState.NotLoaded,
    );
    expect(
      normalizeAdminOrderItem({
        ...item(),
        configuration: null,
        configurationFingerprint: null,
        manufacturingSnapshot: null,
      }).manufacturingSnapshotState,
    ).toBe(AdminManufacturingSnapshotState.Missing);
    expect(
      normalizeAdminOrderItem({ ...item(), manufacturingSnapshot: null })
        .manufacturingSnapshotState,
    ).toBe(AdminManufacturingSnapshotState.Unavailable);
    expect(
      normalizeAdminOrderItem({
        ...item(),
        manufacturingSnapshot: { ...snapshot(), modelUrl: 'x'.repeat(2001) },
      }).manufacturingSnapshotState,
    ).toBe(AdminManufacturingSnapshotState.Unavailable);
    expect(
      normalizeAdminManufacturingSnapshot({ ...snapshot(), verifiedPrintHours: -1 }),
    ).toBeNull();
    expect(
      normalizeAdminManufacturingSnapshot({ ...snapshot(), approvedBy: 'invalid' }),
    ).toBeNull();
  });

  it('renders purchased specifications and private references as escaped text without fetching model or source URLs', async () => {
    const fixture = openPage();
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.textContent).toContain('PLA+');
    expect(root.textContent).toContain('قطعة للزينة فقط');
    expect(root.textContent).toContain('مرجع القياسات الأصلي');
    expect(root.textContent).toContain('/uploads/models/private-original.stl');
    expect(
      root.querySelectorAll(
        '.manufacturing-snapshot a, .manufacturing-snapshot img, .manufacturing-snapshot iframe',
      ).length,
    ).toBe(0);
    http.expectNone(
      (request) =>
        request.url.includes('private-original') || request.url.includes('private-source'),
    );
  });

  it('retains loaded manufacturing evidence through shipping and payment partial responses without retaining old invoice totals', () => {
    const fixture = openPage();
    const { manufacturingSnapshot, ...withoutEvidence } = item();
    const partial = readDetail({
      ...serverOrder([withoutEvidence]),
      total: 170,
      deliveryFee: 20,
      deliveryFeeConfirmed: true,
      shippingRevision: 1,
    });
    expect(partial.items[0].manufacturingSnapshotState).toBe(
      AdminManufacturingSnapshotState.NotLoaded,
    );
    fixture.componentInstance.orderUpdated(partial);
    http
      .expectOne((request) => request.url === `${environment.apiBaseUrl}/admin/orders`)
      .flush({
        success: true,
        message: '',
        data: [],
        meta: {
          page: 1,
          limit: 10,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });
    expect(fixture.componentInstance.selected()?.items[0].manufacturingSnapshot).toEqual(
      snapshot(),
    );
    expect(fixture.componentInstance.selected()?.totals?.total).toBe(170);
    fixture.componentInstance.orderUpdated({ ...partial, payments: null });
    http
      .expectOne((request) => request.url === `${environment.apiBaseUrl}/admin/orders`)
      .flush({
        success: true,
        message: '',
        data: [],
        meta: {
          page: 1,
          limit: 10,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });
    expect(fixture.componentInstance.selected()?.items[0].manufacturingSnapshotState).toBe(
      AdminManufacturingSnapshotState.Available,
    );
  });

  it('preserves private evidence when the status mutation returns the ordinary record projection', () => {
    const fixture = openPage();
    const component = fixture.componentInstance;
    component.nextStatusControl.setValue(AdminOperationStatus.Processing);
    fixture.detectChanges();
    component.requestConfirmation();
    component.saveStatus();
    const { manufacturingSnapshot, ...withoutEvidence } = item();
    http
      .expectOne(`${orderUrl}/status`)
      .flush({
        success: true,
        message: '',
        data: { ...serverOrder([withoutEvidence]), status: AdminOperationStatus.Processing },
      });
    http
      .expectOne((request) => request.url === `${environment.apiBaseUrl}/admin/orders`)
      .flush({
        success: true,
        message: '',
        data: [],
        meta: {
          page: 1,
          limit: 10,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });
    expect(component.selected()?.status).toBe(AdminOperationStatus.Processing);
    expect(component.selected()?.items[0].manufacturingSnapshot).toEqual(snapshot());
  });

  it('never carries evidence into another order, a changed line or an explicit fresh legacy response', () => {
    const original = readDetail();
    const { manufacturingSnapshot, ...withoutEvidence } = item();
    for (const record of [
      { ...serverOrder([withoutEvidence]), id: 'different-order' },
      serverOrder([{ ...withoutEvidence, productId: 'different-product' }]),
      serverOrder([{ ...withoutEvidence, configurationFingerprint: 'e'.repeat(64) }]),
      serverOrder([{ ...withoutEvidence, quantity: 2 }]),
    ]) {
      const merged = preserveAdminManufacturingDetail(original, readDetail(record));
      expect(merged.items[0].manufacturingSnapshot).toBeNull();
      expect(merged.items[0].manufacturingSnapshotState).toBe(
        AdminManufacturingSnapshotState.NotLoaded,
      );
    }
    const legacy = preserveAdminManufacturingDetail(
      original,
      readDetail(serverOrder([{ ...item(), manufacturingSnapshot: null }])),
    );
    expect(legacy.items[0].manufacturingSnapshotState).toBe(
      AdminManufacturingSnapshotState.Unavailable,
    );
    expect(legacy.items[0].manufacturingSnapshot).toBeNull();
  });

  it('renders different truthful messages for missing historical evidence and an unloaded projection', () => {
    const fixture = TestBed.createComponent(AdminOrderManufacturingComponent);
    fixture.componentRef.setInput('snapshot', null);
    fixture.componentRef.setInput('state', AdminManufacturingSnapshotState.Missing);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('لا تتوفر مراجع تصنيع محفوظة');
    fixture.componentRef.setInput('state', AdminManufacturingSnapshotState.NotLoaded);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('لم تُحمّل مراجع تصنيع');
    expect(fixture.nativeElement.textContent).not.toContain('لا تتوفر مراجع تصنيع محفوظة');
  });
});
