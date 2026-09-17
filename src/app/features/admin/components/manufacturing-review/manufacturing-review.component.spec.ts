import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProductCategory } from '@core/enums/product-category.enum';
import { ProductMaterial } from '@core/enums/product-material.enum';
import { apiErrorInterceptor } from '@core/interceptors/api-error.interceptor';
import { environment } from '../../../../../environments/environment';
import { AdminProductRecord } from '../../models/admin-product-form.model';
import {
  ManufacturingQuoteResult,
  ManufacturingReview,
} from '../../models/manufacturing-review.model';
import {
  ManufacturingMaterial,
  ManufacturingReviewStatus,
  ManufacturingRounding,
} from '../../enums/manufacturing-review.enum';
import { ManufacturingReviewComponent } from './manufacturing-review.component';
import { emptyManufacturingInputs } from './manufacturing-review.component.control';

function pendingReview(): ManufacturingReview {
  return {
    ...emptyManufacturingInputs(),
    revision: 0,
    status: ManufacturingReviewStatus.Pending,
    sampleApproved: false,
    pricingApproved: false,
    rightsReviewed: false,
    approvedAt: null,
    approvedBy: null,
    approvedFingerprint: null,
    approvedQuote: null,
    history: [],
  };
}

function measuredReview(): ManufacturingReview {
  return {
    ...pendingReview(),
    revision: 3,
    consumedFilamentGrams: 40,
    verifiedWeightGrams: 35,
    verifiedPrintHours: 2,
    measurementReference: 'Local measurement record',
    sampleReference: 'Local sample record',
    rightsReference: 'Local rights record',
    costing: {
      material: ManufacturingMaterial.PLAPlus,
      consumptionIncludesSupportAndWaste: true,
      machineCostPerHourEgp: 10,
      electricityCostPerHourEgp: 2,
      laborCostEgp: 20,
      packagingCostEgp: 5,
      hardwareCostEgp: 0,
      overheadCostEgp: 5,
      fixedPaymentFeeEgp: 0,
      failureRatePercent: 5,
      targetGrossMarginPercent: 30,
      variablePaymentFeePercent: 0,
      returnReservePercent: 0,
      retailRounding: ManufacturingRounding.Piastre,
    },
  };
}

function draftProduct(review = pendingReview()): AdminProductRecord {
  return {
    id: 'manufacturing-test-product',
    name: 'Local manufacturing unit fixture',
    slug: 'local-manufacturing',
    category: ProductCategory.DESK_MODELS,
    material: ProductMaterial.PLA_PLUS,
    shortDescription: '',
    description: '',
    price: 300,
    image: '',
    gallery: [],
    tags: [],
    finish: '',
    color: '',
    size: '',
    weight: '',
    printTime: '',
    isActive: false,
    isFeatured: false,
    safetyNote: '',
    createdAt: '',
    updatedAt: '',
    requiresManufacturingReview: true,
    manufacturingReview: review,
  };
}

function serverQuote(): ManufacturingQuoteResult {
  return {
    revision: 3,
    quoteFingerprint: 'server-generated-fixture-fingerprint',
    effectiveSellingPriceEgp: 300,
    meetsQuoteTarget: true,
    quote: {
      currency: 'EGP',
      material: ManufacturingMaterial.PLAPlus,
      consumedFilamentGrams: 40,
      materialPiastresPerGram: 250,
      retailPriceEgp: 229.33,
      achievedMarginBasisPoints: 3000,
      targetMarginBasisPoints: 3000,
      retailRounding: ManufacturingRounding.Piastre,
      excludedCosts: ['shipping', 'taxes'],
      shippingIncluded: false,
      taxesCalculated: false,
      manufacturingApprovalGranted: false,
      breakdownPiastres: {
        material: 10000,
        machine: 2000,
        electricity: 400,
        failureAllowance: 653,
        expectedPrint: 13053,
        labor: 2000,
        packaging: 500,
        hardware: 0,
        overhead: 500,
        fixedPaymentFee: 0,
        costBeforeSalesFees: 16053,
        variablePaymentFee: 0,
        returnReserve: 0,
        expectedProfit: 6880,
        minimumPrice: 22933,
        roundingIncrease: 0,
        retailPrice: 22933,
      },
    },
  };
}

describe('Manufacturing review panel', () => {
  let fixture: ComponentFixture<ManufacturingReviewComponent>;
  let component: ManufacturingReviewComponent;
  let http: HttpTestingController;
  const productUrl = `${environment.apiBaseUrl}/admin/products/manufacturing-test-product`;
  const reviewUrl = `${productUrl}/manufacturing-review`;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [ManufacturingReviewComponent],
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    fixture = TestBed.createComponent(ManufacturingReviewComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('product', draftProduct());
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function loadMeasuredProduct(): void {
    fixture.componentRef.setInput('product', draftProduct(measuredReview()));
    fixture.detectChanges();
  }

  async function requestQuote(result = serverQuote()): Promise<void> {
    component.calculateQuote();
    const request = http.expectOne(`${reviewUrl}/quote`);
    expect(request.request.body).toEqual({ expectedRevision: 3 });
    request.flush({ success: true, message: 'Calculated', data: result });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('تسعير النسخة المحفوظة');
  }

  it('preserves explicit missing inputs and saves an incomplete draft without price or publication writes', async () => {
    expect(component.form.getRawValue()).toEqual(emptyManufacturingInputs());
    expect(component.dirty()).toBe(false);
    expect(component.canSave()).toBe(false);
    component.form.controls.measurementReference.setValue('Measurement pending');
    component.saveReview();
    const request = http.expectOne(reviewUrl);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      ...emptyManufacturingInputs(),
      measurementReference: 'Measurement pending',
      expectedRevision: 0,
    });
    const saved = { ...pendingReview(), revision: 1, measurementReference: 'Measurement pending' };
    request.flush({ success: true, message: 'Saved', data: draftProduct(saved) });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('حُفظت بيانات المراجعة');
    expect(component.revision()).toBe(1);
    expect(component.dirty()).toBe(false);
    expect(component.quote()).toBeNull();
    expect(component.approved()).toBe(false);
    expect(component.form.controls.costing.controls.laborCostEgp.value).toBeNull();
  });

  it('rejects invalid supplied measurements locally while allowing explicit zero costs', () => {
    component.form.controls.consumedFilamentGrams.setValue(-2);
    component.form.controls.costing.controls.laborCostEgp.setValue(0);
    component.saveReview();
    expect(component.localErrors().join(' ')).toContain('الخامة المستهلكة');
    expect(component.form.controls.costing.controls.laborCostEgp.valid).toBe(true);
    http.expectNone(reviewUrl);
    component.form.controls.consumedFilamentGrams.setValue(2.1234);
    expect(component.form.controls.consumedFilamentGrams.invalid).toBe(true);
  });

  it('discards the previous quote and attestations as soon as saved measurements change', async () => {
    loadMeasuredProduct();
    await requestQuote();
    component.attestations.setValue({
      sampleApproved: true,
      rightsReviewed: true,
      pricingApproved: true,
    });
    expect(component.canApprove()).toBe(true);
    component.form.controls.verifiedWeightGrams.setValue(36);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('تعديلات المراجعة غير محفوظة');
    expect(component.quote()).toBeNull();
    expect(component.canQuote()).toBe(false);
    expect(component.canApprove()).toBe(false);
    expect(component.attestations.getRawValue()).toEqual({
      sampleApproved: false,
      rightsReviewed: false,
      pricingApproved: false,
    });
    component.approveReview();
    http.expectNone(`${reviewUrl}/approve`);
  });

  it('requires every attestation and submits only the current server revision and fingerprint', async () => {
    loadMeasuredProduct();
    await requestQuote();
    expect(component.breakdownRows().find((row) => row.key === 'material')?.amountEgp).toBe(100);
    expect(component.excludedCosts()).toEqual(['الشحن', 'الضرائب']);
    expect(component.canApprove()).toBe(false);
    component.attestations.patchValue({ sampleApproved: true, rightsReviewed: true });
    expect(component.canApprove()).toBe(false);
    component.attestations.controls.pricingApproved.setValue(true);
    expect(component.canApprove()).toBe(true);
    component.approveReview();
    const request = http.expectOne(`${reviewUrl}/approve`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      expectedRevision: 3,
      quoteFingerprint: serverQuote().quoteFingerprint,
      sampleApproved: true,
      rightsReviewed: true,
      pricingApproved: true,
    });
    const approved = {
      ...measuredReview(),
      status: ManufacturingReviewStatus.Approved,
      sampleApproved: true,
      rightsReviewed: true,
      pricingApproved: true,
      approvedAt: '2026-09-17T00:00:00Z',
      approvedBy: 'test-administrator',
      approvedFingerprint: serverQuote().quoteFingerprint,
      approvedQuote: serverQuote(),
    };
    request.flush({ success: true, message: 'Approved', data: draftProduct(approved) });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('مراجعة معتمدة');
    expect(component.approved()).toBe(true);
    expect(component.product().isActive).toBe(false);
    expect(component.product().price).toBe(300);
    expect(component.canApprove()).toBe(false);
  });

  it('blocks approval when the effective selling price does not meet the quoted target', async () => {
    loadMeasuredProduct();
    await requestQuote({ ...serverQuote(), effectiveSellingPriceEgp: 10, meetsQuoteTarget: false });
    component.attestations.setValue({
      sampleApproved: true,
      rightsReviewed: true,
      pricingApproved: true,
    });
    expect(component.canApprove()).toBe(false);
    component.approveReview();
    http.expectNone(`${reviewUrl}/approve`);
    expect(fixture.nativeElement.textContent).toContain('سعر البيع الحالي أقل من السعر المستهدف');
  });

  it('retains unsaved input after a normalized 409 and requires an explicit reload before another write', async () => {
    loadMeasuredProduct();
    component.form.controls.sampleReference.setValue('Unsaved local sample');
    component.saveReview();
    http
      .expectOne(reviewUrl)
      .flush({ success: false, message: 'Changed' }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('تغيّرت نسخة المراجعة');
    expect(component.conflict()).toBe(true);
    expect(component.form.controls.sampleReference.value).toBe('Unsaved local sample');
    expect(component.canSave()).toBe(false);
    component.saveReview();
    http.expectNone(reviewUrl);
    component.reloadProduct();
    const reload = http.expectOne(productUrl);
    expect(reload.request.method).toBe('GET');
    reload.flush({
      success: true,
      message: 'Loaded',
      data: draftProduct({
        ...measuredReview(),
        revision: 4,
        sampleReference: 'Winning server sample',
      }),
    });
    await fixture.whenStable();
    expect(component.revision()).toBe(4);
    expect(component.form.controls.sampleReference.value).toBe('Winning server sample');
    expect(component.conflict()).toBe(false);
    expect(component.dirty()).toBe(false);
  });

  it('shows translated field guidance for real interceptor-normalized validation errors', async () => {
    component.calculateQuote();
    http.expectOne(`${reviewUrl}/quote`).flush(
      {
        success: false,
        message: 'Incomplete',
        errors: { consumedFilamentGrams: ['Required'], 'costing.material': ['Required'] },
      },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('البيانات غير مكتملة');
    expect(component.fieldErrors()).toEqual([
      'الخامة المستهلكة (جرام)',
      'خامة المنتج وخامة التسعير',
    ]);
    expect(component.conflict()).toBe(false);
    expect(component.busy()).toBe(false);
  });

  it('allows discarding only local review changes when both editors have unsaved inputs', async () => {
    loadMeasuredProduct();
    component.form.controls.sampleReference.setValue('Unsaved sample');
    fixture.componentRef.setInput('productEditorDirty', true);
    await fixture.whenStable();
    expect(component.canSave()).toBe(false);
    expect(component.canQuote()).toBe(false);
    component.reloadProduct();
    http.expectNone(productUrl);
    component.discardLocalChanges();
    await fixture.whenStable();
    expect(component.dirty()).toBe(false);
    expect(component.form.controls.sampleReference.value).toBe('Local sample record');
    expect(component.productEditorDirty()).toBe(true);
  });

  it('unpublishes an active product with a minimal explicit request before review edits', async () => {
    fixture.componentRef.setInput('product', { ...draftProduct(measuredReview()), isActive: true });
    await fixture.whenStable();
    expect(component.canQuote()).toBe(false);
    expect(component.canUnpublish()).toBe(true);
    component.unpublishProduct();
    const request = http.expectOne(productUrl);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ isActive: false });
    request.flush({ success: true, message: 'Unpublished', data: draftProduct(measuredReview()) });
    await fixture.whenStable();
    expect(component.successMessage()).toContain('أُلغي نشر المنتج');
  });
});
