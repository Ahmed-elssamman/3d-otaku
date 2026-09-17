import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { finalize, map } from 'rxjs';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { ApiErrorResponse } from '@core/models/api-response.model';
import { AdminProductRecord } from '../../models/admin-product-form.model';
import {
  ManufacturingQuoteResult,
  ManufacturingReview,
  ManufacturingReviewInputs,
} from '../../models/manufacturing-review.model';
import { ManufacturingReviewStatus } from '../../enums/manufacturing-review.enum';
import { AdminManufacturingService } from '../../services/admin-manufacturing.service';
import { AdminProductService } from '../../services/admin-product.service';
import {
  createManufacturingReviewForm,
  createManufacturingAttestationsForm,
  emptyManufacturingInputs,
  ManufacturingAction,
  MANUFACTURING_MEASUREMENT_FIELDS,
  MANUFACTURING_COST_FIELDS,
  MANUFACTURING_REFERENCE_FIELDS,
  MANUFACTURING_MATERIAL_OPTIONS,
  MANUFACTURING_ROUNDING_OPTIONS,
  MANUFACTURING_CONSUMPTION_OPTIONS,
  MANUFACTURING_BREAKDOWN_FIELDS,
  MANUFACTURING_EXCLUSION_LABELS,
  MANUFACTURING_HISTORY_LABELS,
  MANUFACTURING_ERROR_LABELS,
  ManufacturingBreakdownRow,
  ManufacturingHistoryRow,
} from './manufacturing-review.component.control';

@Component({
  selector: 'app-manufacturing-review',
  standalone: true,
  imports: [ReactiveFormsModule, InputText, Textarea, CurrencyPipe, DatePipe, DecimalPipe],
  templateUrl: './manufacturing-review.component.html',
  styleUrl: './manufacturing-review.component.scss',
})
export class ManufacturingReviewComponent {
  private builder = inject(FormBuilder);
  private manufacturingService = inject(AdminManufacturingService);
  private productService = inject(AdminProductService);
  private destroyRef = inject(DestroyRef);

  product = input.required<AdminProductRecord>();
  productEditorDirty = input(false);
  productEditorBusy = input(false);
  productUpdated = output<AdminProductRecord>();
  dirtyChanged = output<boolean>();
  busyChanged = output<boolean>();

  form = createManufacturingReviewForm(this.builder);
  attestations = createManufacturingAttestationsForm(this.builder);
  private formValue = toSignal(this.form.events.pipe(map(() => this.form.getRawValue())), {
    initialValue: this.form.getRawValue(),
  });
  private formStatus = toSignal(this.form.statusChanges, { initialValue: this.form.status });
  private attestationValue = toSignal(
    this.attestations.valueChanges.pipe(map(() => this.attestations.getRawValue())),
    { initialValue: this.attestations.getRawValue() },
  );
  private savedInputs = signal(JSON.stringify(emptyManufacturingInputs()));
  review = signal<ManufacturingReview | null>(null);
  quote = signal<ManufacturingQuoteResult | null>(null);
  action = signal(ManufacturingAction.Idle);
  errorMessage = signal('');
  fieldErrors = signal<string[]>([]);
  successMessage = signal('');
  conflict = signal(false);
  attemptedSave = signal(false);

  measurementFields = MANUFACTURING_MEASUREMENT_FIELDS;
  costFields = MANUFACTURING_COST_FIELDS;
  referenceFields = MANUFACTURING_REFERENCE_FIELDS;
  materialOptions = MANUFACTURING_MATERIAL_OPTIONS;
  roundingOptions = MANUFACTURING_ROUNDING_OPTIONS;
  consumptionOptions = MANUFACTURING_CONSUMPTION_OPTIONS;
  busy = computed(() => this.action() !== ManufacturingAction.Idle);
  dirty = computed(() => JSON.stringify(this.formValue()) !== this.savedInputs());
  approved = computed(() => this.review()?.status === ManufacturingReviewStatus.Approved);
  revision = computed(() => this.review()?.revision ?? 0);
  statusLabel = computed(() => (this.approved() ? 'مراجعة معتمدة' : 'قيد المراجعة'));
  locked = computed(
    () =>
      this.busy() ||
      this.productEditorBusy() ||
      this.productEditorDirty() ||
      this.product().isActive ||
      this.conflict(),
  );
  canSave = computed(() => !this.locked() && this.dirty());
  canQuote = computed(() => !this.locked() && !this.dirty() && this.review() !== null);
  canUnpublish = computed(
    () =>
      this.product().isActive &&
      !this.busy() &&
      !this.productEditorBusy() &&
      !this.productEditorDirty() &&
      !this.dirty() &&
      !this.conflict(),
  );
  materialMatches = computed(() => {
    const material = this.review()?.costing.material ?? null;
    return material !== null && String(material) === String(this.product().material);
  });
  referencesComplete = computed(() => {
    const review = this.review();
    return (
      !!review?.measurementReference.trim() &&
      !!review.sampleReference.trim() &&
      !!review.rightsReference.trim()
    );
  });
  canApprove = computed(() => {
    const attestations = this.attestationValue();
    return (
      this.canQuote() &&
      !this.approved() &&
      this.quote()?.meetsQuoteTarget === true &&
      this.materialMatches() &&
      this.referencesComplete() &&
      attestations.sampleApproved &&
      attestations.rightsReviewed &&
      attestations.pricingApproved
    );
  });
  localErrors = computed(() => {
    this.formValue();
    this.formStatus();
    if (!this.attemptedSave()) return [];
    const errors: string[] = [];
    for (const field of this.measurementFields)
      if (this.form.controls[field.key].invalid)
        errors.push(`${field.label}: أدخل قيمة موجبة بحد أقصى 3 منازل عشرية، أو اتركها فارغة.`);
    for (const field of this.costFields)
      if (this.form.controls.costing.controls[field.key].invalid)
        errors.push(
          `${field.label}: أدخل قيمة غير سالبة بمنزلتين عشريتين كحد أقصى${field.percent ? ' وأقل من 100%' : ''}، أو اتركها فارغة.`,
        );
    for (const field of this.referenceFields)
      if (this.form.controls[field.key].invalid)
        errors.push(`${field.label}: الحد الأقصى 1000 حرف.`);
    return errors;
  });
  breakdownRows = computed<ManufacturingBreakdownRow[]>(() => {
    const quote = this.quote();
    return quote
      ? MANUFACTURING_BREAKDOWN_FIELDS.map((field) => ({
          ...field,
          amountEgp: quote.quote.breakdownPiastres[field.key] / 100,
        }))
      : [];
  });
  excludedCosts = computed(
    () =>
      this.quote()?.quote.excludedCosts.map((key) => MANUFACTURING_EXCLUSION_LABELS[key] || key) ??
      [],
  );
  achievedMargin = computed(() => (this.quote()?.quote.achievedMarginBasisPoints ?? 0) / 100);
  targetMargin = computed(() => (this.quote()?.quote.targetMarginBasisPoints ?? 0) / 100);
  materialPrice = computed(() => (this.quote()?.quote.materialPiastresPerGram ?? 0) / 100);
  historyRows = computed<ManufacturingHistoryRow[]>(() =>
    (this.review()?.history ?? [])
      .slice()
      .reverse()
      .map((entry, index) => ({
        key: `${entry.revision}-${entry.action}-${index}`,
        label: MANUFACTURING_HISTORY_LABELS[entry.action],
        revision: entry.revision,
        createdAt: entry.createdAt,
      })),
  );

  constructor() {
    effect(() => this.populate(this.product()));
    effect(() => {
      const dirty = this.dirty();
      this.dirtyChanged.emit(dirty);
      if (dirty) {
        this.quote.set(null);
        this.attestations.reset();
        this.successMessage.set('');
      }
    });
    effect(() => this.busyChanged.emit(this.busy()));
  }

  saveReview(): void {
    if (!this.canSave()) return;
    this.attemptedSave.set(true);
    if (this.form.invalid) return;
    this.begin(ManufacturingAction.Saving);
    this.manufacturingService
      .saveReview(this.product().id, {
        ...this.form.getRawValue(),
        expectedRevision: this.revision(),
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.action.set(ManufacturingAction.Idle)),
      )
      .subscribe({
        next: (response) => {
          this.acceptProduct(response.data);
          this.successMessage.set(
            'حُفظت بيانات المراجعة. احسب التسعير من هذه النسخة قبل الاعتماد.',
          );
        },
        error: (error: ApiErrorResponse) => this.handleError(error),
      });
  }

  calculateQuote(): void {
    if (!this.canQuote()) return;
    this.begin(ManufacturingAction.Quoting);
    this.quote.set(null);
    this.attestations.reset();
    this.manufacturingService
      .quoteReview(this.product().id, { expectedRevision: this.revision() })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.action.set(ManufacturingAction.Idle)),
      )
      .subscribe({
        next: (response) => {
          this.quote.set(response.data);
          this.successMessage.set(
            'وصل التسعير من الخادم. راجع التفاصيل والاستثناءات قبل أي اعتماد.',
          );
        },
        error: (error: ApiErrorResponse) => this.handleError(error),
      });
  }

  approveReview(): void {
    const quote = this.quote();
    if (!this.canApprove() || !quote) return;
    this.begin(ManufacturingAction.Approving);
    this.manufacturingService
      .approveReview(this.product().id, {
        expectedRevision: quote.revision,
        quoteFingerprint: quote.quoteFingerprint,
        ...this.attestations.getRawValue(),
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.action.set(ManufacturingAction.Idle)),
      )
      .subscribe({
        next: (response) => {
          this.acceptProduct(response.data);
          this.successMessage.set(
            'اعتُمدت المراجعة. المنتج ما زال غير منشور؛ النشر خطوة مستقلة من محرر المنتج.',
          );
        },
        error: (error: ApiErrorResponse) => this.handleError(error),
      });
  }

  reloadProduct(): void {
    if (this.busy() || this.productEditorBusy() || this.productEditorDirty()) return;
    this.begin(ManufacturingAction.Reloading);
    this.productService
      .getProductById(this.product().id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.action.set(ManufacturingAction.Idle)),
      )
      .subscribe({
        next: (response) => {
          this.acceptProduct(response.data);
          this.successMessage.set(
            'حُمّلت النسخة الحالية من الخادم، وتُركت التعديلات غير المحفوظة.',
          );
        },
        error: (error: ApiErrorResponse) => this.handleError(error),
      });
  }

  discardLocalChanges(): void {
    if (!this.dirty() || this.busy() || this.productEditorBusy()) return;
    const hadConflict = this.conflict();
    const conflictMessage = this.errorMessage();
    this.populate(this.product());
    if (hadConflict) {
      this.conflict.set(true);
      this.errorMessage.set(conflictMessage);
      this.quote.set(null);
    }
    this.successMessage.set('تُركت تعديلات المراجعة المحلية. بيانات محرر المنتج لم تتغير.');
  }

  unpublishProduct(): void {
    if (!this.canUnpublish()) return;
    this.begin(ManufacturingAction.Unpublishing);
    this.manufacturingService
      .unpublishProduct(this.product().id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.action.set(ManufacturingAction.Idle)),
      )
      .subscribe({
        next: (response) => {
          this.acceptProduct(response.data);
          this.successMessage.set(
            'أُلغي نشر المنتج. يمكنك الآن تعديل المراجعة أو بيانات التصنيع، ثم إعادة التسعير والاعتماد.',
          );
        },
        error: (error: ApiErrorResponse) => this.handleError(error),
      });
  }

  private begin(action: ManufacturingAction): void {
    this.action.set(action);
    this.errorMessage.set('');
    this.fieldErrors.set([]);
    this.successMessage.set('');
  }

  private acceptProduct(product: AdminProductRecord): void {
    this.populate(product);
    this.productUpdated.emit(product);
  }

  private populate(product: AdminProductRecord): void {
    const review = product.manufacturingReview ?? null;
    const inputs: ManufacturingReviewInputs = review
      ? {
          consumedFilamentGrams: review.consumedFilamentGrams,
          verifiedWeightGrams: review.verifiedWeightGrams,
          verifiedPrintHours: review.verifiedPrintHours,
          measurementReference: review.measurementReference,
          sampleReference: review.sampleReference,
          rightsReference: review.rightsReference,
          costing: { ...review.costing },
        }
      : emptyManufacturingInputs();
    this.review.set(review);
    this.form.reset(inputs);
    this.savedInputs.set(JSON.stringify(this.form.getRawValue()));
    this.quote.set(review?.approvedQuote ?? null);
    this.attestations.reset();
    this.conflict.set(false);
    this.attemptedSave.set(false);
    this.errorMessage.set('');
    this.fieldErrors.set([]);
  }

  private handleError(error: ApiErrorResponse): void {
    if (error.statusCode === 409) {
      this.conflict.set(true);
      this.quote.set(null);
      this.attestations.reset();
      this.errorMessage.set(
        'تغيّرت نسخة المراجعة أو حالة المنتج. راجع النسخة الحالية من الخادم قبل المحاولة؛ إعادة التحميل تتجاهل تعديلات المراجعة غير المحفوظة.',
      );
    } else if (error.statusCode === 422) {
      this.errorMessage.set(
        'البيانات غير مكتملة أو غير صالحة لهذه الخطوة. راجع الحقول المحددة؛ يلزم استهلاك شامل للدعامات والهدر، وكل التكاليف والنسب. مجموع الهامش ورسوم الدفع واحتياطي المرتجعات يجب أن يقل عن 100%.',
      );
      this.fieldErrors.set([
        ...new Set(
          Object.keys(error.errors ?? {}).map(
            (key) =>
              MANUFACTURING_ERROR_LABELS[key.replace(/^costing\./, '')] ||
              'بيانات المراجعة أو السعر الحالي',
          ),
        ),
      ]);
    } else if (error.statusCode === 401 || error.statusCode === 403) {
      this.errorMessage.set(
        'انتهت الجلسة أو لا تتوفر صلاحية مراجعة التصنيع. سجّل الدخول بحساب مسؤول.',
      );
    } else {
      this.errorMessage.set(
        'لم تتأكد نتيجة العملية. أعد تحميل النسخة الحالية قبل تكرار الحفظ أو الاعتماد.',
      );
      this.conflict.set(true);
    }
  }
}
