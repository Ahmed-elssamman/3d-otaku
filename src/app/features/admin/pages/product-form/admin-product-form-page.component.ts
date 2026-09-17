import {
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
  OnInit,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { catchError, finalize, forkJoin, map, of } from 'rxjs';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductBadge } from '@core/enums/product-badge.enum';
import { ProductModelType } from '@core/enums/product-model-type.enum';
import { Product } from '@core/models/product.model';
import {
  getModelTypeFromPath,
  MAX_MODEL_UPLOAD_SIZE_BYTES,
  MODEL_FILE_ACCEPT,
} from '@core/constants/model-file.constants';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { AdminProductService } from '../../services/admin-product.service';
import { UploadService } from '@core/services/upload.service';
import {
  ADMIN_CATEGORY_TEXT,
  adminCategoryOptions,
  PRODUCT_BADGE_OPTIONS,
  PRODUCT_MATERIAL_OPTIONS,
  PRODUCT_MODEL_TYPE_OPTIONS,
  MODEL_UPLOAD_HELP_TEXT,
  PRODUCTION_TIME_UNIT_OPTIONS,
} from '../../data/admin-products.data';
import { AdminFilePreviewComponent } from '../../components/admin-file-preview.component';
import {
  AdminImageField,
  ADMIN_IMAGE_ACCEPT,
  ADMIN_IMAGE_TYPES,
  MAX_ADMIN_IMAGE_SIZE,
  ADMIN_PRODUCT_SPEC_FIELDS,
  ADMIN_PRODUCT_VALIDATION_FIELDS,
  ADMIN_PRODUCT_META_FIELDS,
  ADMIN_PRODUCT_REVIEW_TEXT,
  ADMIN_PRODUCT_SAVE_TEXT,
  ADMIN_PRODUCT_LIMIT_TEXT,
  ADMIN_PRODUCT_LIMITS,
  ADMIN_PRODUCT_FORM_LABELS,
  adminProductFormValue,
  adminProductComparisonValue,
  mergeAdminProductDraft,
  adminProductListValues,
  adminProductServerFieldErrors,
  adminProductGalleryCapacityMessage,
  AdminProductServerFieldError,
  createAdminProductForm,
  FormValidationError,
} from './admin-product-form-page.control';
import {
  AdminManufacturingReviewStatus,
  AdminProductRecord,
  AdminProductFormValue,
  AdminProductConflictField,
} from '../../models/admin-product-form.model';
import { ApiErrorResponse } from '@core/models/api-response.model';
import { ManufacturingReviewComponent } from '../../components/manufacturing-review/manufacturing-review.component';
import { AdminManufacturingService } from '../../services/admin-manufacturing.service';
import { AdminProductCategory } from '../../models/admin-product-category.model';

@Component({
  selector: 'app-admin-product-form-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    Button,
    InputNumber,
    InputText,
    Select,
    Textarea,
    ToggleSwitch,
    AdminFilePreviewComponent,
    ManufacturingReviewComponent,
  ],
  templateUrl: './admin-product-form-page.component.html',
  styleUrl: './admin-product-form-page.component.scss',
})
export class AdminProductFormPageComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private adminProductService = inject(AdminProductService);
  private manufacturingService = inject(AdminManufacturingService);
  private uploadService = inject(UploadService);
  private messageService = inject(MessageService);
  private destroyRef = inject(DestroyRef);

  categories = signal<AdminProductCategory[]>([]);
  categoriesLoading = signal(false);
  categoryLoadError = signal('');
  categoryText = ADMIN_CATEGORY_TEXT;
  reviewText = ADMIN_PRODUCT_REVIEW_TEXT;
  saveText = ADMIN_PRODUCT_SAVE_TEXT;
  limitText = ADMIN_PRODUCT_LIMIT_TEXT;
  badgeOptions = PRODUCT_BADGE_OPTIONS;
  materialOptions = PRODUCT_MATERIAL_OPTIONS;
  modelTypeOptions = PRODUCT_MODEL_TYPE_OPTIONS;
  productionTimeUnitOptions = PRODUCTION_TIME_UNIT_OPTIONS;

  productId = signal(this.route.snapshot.paramMap.get('id'));
  isLoadingProduct = signal(this.productId() !== null);
  productLoadError = signal('');
  existingProduct = signal<AdminProductRecord | null>(null);
  isEditMode = signal<boolean>(false);
  slugEditedManually = signal<boolean>(false);
  isUploadingImage = signal<boolean>(false);
  isUploadingModel = signal<boolean>(false);
  isUploadingGallery = signal<boolean>(false);
  isUploadingPoster = signal<boolean>(false);
  isUploadingSocial = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  attemptedSubmit = signal<boolean>(false);
  selectedModelFileName = signal<string>('');
  galleryUploadProgress = signal<string>('');
  gallerySelectionError = signal('');
  galleryPreviewUrls = signal<string[]>([]);
  reviewUnsaved = signal(false);
  reviewBusy = signal(false);
  isStartingReview = signal(false);
  reviewStartError = signal('');
  reviewStartConflict = signal(false);
  productSaveConflict = signal(false);
  saveError = signal('');
  private serverFieldErrors = signal<AdminProductServerFieldError[]>([]);
  isLoadingConflict = signal(false);
  conflictProduct = signal<AdminProductRecord | null>(null);
  conflictLoadError = signal('');
  private savedProductValues = signal<AdminProductFormValue | null>(null);
  private savedProductForm = signal('');
  productRevisionUnavailable = computed(
    () => this.isEditMode() && this.existingProduct()?.revision === null,
  );
  needsProductReview = computed(
    () => this.productSaveConflict() || this.productRevisionUnavailable(),
  );
  canAcceptProductReview = computed(
    () =>
      this.conflictProduct()?.revision !== null &&
      this.conflictProduct() !== null &&
      !this.productEditorBusy(),
  );
  manufacturingEditorBlocked = computed(
    () => this.productEditorBusy() || this.needsProductReview(),
  );
  productEditorBusy = computed(
    () =>
      this.isSubmitting() ||
      this.isStartingReview() ||
      this.isLoadingProduct() ||
      this.isLoadingConflict() ||
      this.isUploadingImage() ||
      this.isUploadingModel() ||
      this.isUploadingGallery() ||
      this.isUploadingPoster() ||
      this.isUploadingSocial(),
  );
  uploadDisabled = computed(() => this.productEditorBusy() || this.reviewBusy());
  canSaveProduct = computed(
    () =>
      !this.isSubmitting() &&
      !this.isStartingReview() &&
      !this.reviewStartConflict() &&
      !this.needsProductReview() &&
      !this.isLoadingConflict() &&
      !this.isLoadingProduct() &&
      !this.productLoadError() &&
      !this.isUploadingImage() &&
      !this.isUploadingModel() &&
      !this.isUploadingGallery() &&
      !this.isUploadingPoster() &&
      !this.isUploadingSocial() &&
      !this.reviewUnsaved() &&
      !this.reviewBusy(),
  );

  modelFileAccept = MODEL_FILE_ACCEPT;
  modelUploadHelpText = MODEL_UPLOAD_HELP_TEXT;

  productForm = createAdminProductForm(this.formBuilder);

  private formValue = toSignal(
    this.productForm.events.pipe(map(() => this.productForm.getRawValue())),
    {
      initialValue: this.productForm.getRawValue(),
    },
  );
  private formStatus = toSignal(this.productForm.statusChanges, {
    initialValue: this.productForm.status,
  });
  conflictFields = computed<AdminProductConflictField[]>(() => {
    const product = this.conflictProduct();
    const saved = this.savedProductValues();
    if (!product || !saved) return [];
    const current = adminProductFormValue(product);
    const local = this.formValue();
    return (Object.keys(ADMIN_PRODUCT_FORM_LABELS) as Array<keyof AdminProductFormValue>)
      .filter((key) => current[key] !== saved[key])
      .map((key) => ({
        key,
        label: ADMIN_PRODUCT_FORM_LABELS[key],
        current: adminProductComparisonValue(current[key]),
        local: adminProductComparisonValue(local[key]),
      }));
  });
  categoryOptions = computed(() =>
    adminCategoryOptions(this.categories(), this.formValue().category ?? '', true),
  );
  productEditorDirty = computed(
    () =>
      this.savedProductForm() !== '' &&
      JSON.stringify(this.formValue()) !== this.savedProductForm(),
  );
  canStartReview = computed(() => {
    const product = this.existingProduct();
    return (
      product !== null &&
      !product.requiresManufacturingReview &&
      !product.isActive &&
      product.updatedAt !== '' &&
      !this.productEditorBusy() &&
      !this.productEditorDirty() &&
      !this.productLoadError() &&
      !this.needsProductReview() &&
      !this.reviewStartConflict()
    );
  });

  previewImage = computed(() => this.formValue().mainImage);
  previewModel = computed(() => this.formValue().modelUrl);
  previewModelType = computed(() => this.formValue().modelType ?? ProductModelType.GLB);
  previewPoster = computed(() => this.formValue().posterImage || this.formValue().mainImage);
  previewProductName = computed(() => this.formValue().name || 'معاينة المنتج');
  madeToOrder = computed(() => this.formValue().isMadeToOrder);
  hasPricingError = computed(() => {
    this.formValue();
    this.formStatus();
    return this.productForm.errors?.['invalidDiscount'] === true;
  });
  hasProductionRangeError = computed(() => {
    this.formValue();
    this.formStatus();
    return this.productForm.errors?.['invalidProductionRange'] === true;
  });

  validationErrors = computed<FormValidationError[]>(() => {
    const values = this.formValue();
    this.formStatus();
    const errors: FormValidationError[] = ADMIN_PRODUCT_VALIDATION_FIELDS.filter((field) => {
      const control = this.productForm.controls[field.key];
      const emptyPublishedField =
        field.requiredWhenPublished && values.isActive && !String(values[field.key] || '').trim();
      const invalidPublishedPrice =
        field.key === 'price' && this.productForm.errors?.['invalidPublishedPrice'] === true;
      return control.invalid || emptyPublishedField || invalidPublishedPrice;
    });
    if (this.hasPricingError())
      errors.push({
        id: 'field-discount',
        field: 'سعر الخصم',
        message: 'سعر الخصم يجب أن يكون أقل من السعر الأساسي وغير سالب.',
        category: 'التسعير',
      });
    if (this.hasProductionRangeError())
      errors.push({
        id: 'field-production-time',
        field: 'مدة التصنيع',
        message: 'حدد مدة موجبة ووحدتها، والحد الأقصى لا يقل عن الحد الأدنى.',
        category: 'المواصفات',
      });
    for (const error of this.serverFieldErrors()) {
      if (
        values[error.key] === error.rejectedValue &&
        !errors.some((entry) => entry.id === error.id)
      ) {
        errors.push(error);
      }
    }
    return errors;
  });

  fieldErrors = computed(() => {
    this.formValue();
    const errors: Record<string, boolean> = {};
    for (const field of ADMIN_PRODUCT_VALIDATION_FIELDS) {
      const control = this.productForm.controls[field.key];
      const invalid = this.validationErrors().some((error) => error.id === field.id);
      errors[field.id] = invalid && (control.touched || this.attemptedSubmit());
    }
    for (const error of this.validationErrors()) {
      if (this.attemptedSubmit()) errors[error.id] = true;
    }
    return errors;
  });
  fieldMessages = computed(
    () =>
      Object.fromEntries(
        this.validationErrors().map((error) => [error.id, error.message]),
      ) as Record<string, string>,
  );
  specFields = computed(() =>
    ADMIN_PRODUCT_SPEC_FIELDS.map((field) => ({
      ...field,
      invalid: this.fieldErrors()[field.id] || false,
      error: this.fieldMessages()[field.id] || '',
    })),
  );
  metaFields = ADMIN_PRODUCT_META_FIELDS;
  imageAccept = ADMIN_IMAGE_ACCEPT;
  pageTitle = computed(() => (this.isEditMode() ? 'تعديل المنتج' : 'إضافة منتج'));
  mainUploadLabel = computed(() =>
    this.isUploadingImage()
      ? 'جارٍ رفع الصورة…'
      : this.previewImage()
        ? 'استبدال الصورة الرئيسية'
        : 'اختيار الصورة الرئيسية',
  );
  galleryUploadLabel = computed(() =>
    this.isUploadingGallery()
      ? `جارٍ رفع الصور ${this.galleryUploadProgress()}`
      : 'إضافة صور للمعرض',
  );
  modelUploadLabel = computed(() =>
    this.isUploadingModel()
      ? 'جارٍ رفع المجسم…'
      : this.selectedModelFileName() || 'اختيار ملف المجسم',
  );
  posterUploadLabel = computed(() =>
    this.isUploadingPoster() ? 'جارٍ الرفع…' : 'اختيار صورة غلاف المجسم',
  );
  socialUploadLabel = computed(() =>
    this.isUploadingSocial() ? 'جارٍ الرفع…' : 'اختيار صورة المشاركة',
  );
  canPreviewLive = computed(() => this.existingProduct()?.isActive === true);
  publicationBlocked = computed(() => {
    const product = this.existingProduct();
    if (!product) return true;
    if (!product.requiresManufacturingReview) return false;
    const review = product.manufacturingReview;
    return (
      !review ||
      review.status !== AdminManufacturingReviewStatus.Approved ||
      !review.sampleApproved ||
      !review.pricingApproved ||
      !review.rightsReviewed ||
      !review.approvedAt ||
      !review.approvedBy ||
      !review.approvedFingerprint ||
      !review.approvedQuote ||
      !review.measurementReference ||
      !review.sampleReference ||
      !review.rightsReference ||
      !review.verifiedWeightGrams ||
      !review.verifiedPrintHours ||
      !review.consumedFilamentGrams
    );
  });
  publicationGuidance = computed(() =>
    this.existingProduct() ? this.reviewText.pendingGuidance : this.reviewText.newDraftGuidance,
  );
  constructor() {
    this.productForm.controls.name.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        if (!this.slugEditedManually() && value) {
          this.productForm.controls.slug.setValue(this.buildSlug(value), { emitEvent: false });
        }
      });
    this.productForm.controls.galleryImages.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.galleryPreviewUrls.set(this.extractList(value));
        this.gallerySelectionError.set('');
      });
  }

  ngOnInit(): void {
    this.loadCategories();
    const productId = this.productId();
    if (productId) {
      this.isEditMode.set(true);
      this.loadProduct(productId);
    }
  }

  loadCategories(): void {
    if (this.categoriesLoading()) return;
    this.categoriesLoading.set(true);
    this.categoryLoadError.set('');
    this.adminProductService
      .getCategories()
      .pipe(
        finalize(() => this.categoriesLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => this.categories.set(response.data),
        error: () => this.categoryLoadError.set(ADMIN_CATEGORY_TEXT.loadError),
      });
  }

  retryLoadProduct(): void {
    if (this.productEditorBusy() || this.reviewBusy()) return;
    const productId = this.productId();
    if (productId) this.loadProduct(productId);
  }

  loadProductForReview(): void {
    const product = this.existingProduct();
    if (!product || this.productEditorBusy() || this.reviewBusy() || this.reviewUnsaved()) return;
    this.isLoadingConflict.set(true);
    this.conflictLoadError.set('');
    this.conflictProduct.set(null);
    this.adminProductService
      .getProductById(product.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoadingConflict.set(false)),
      )
      .subscribe({
        next: (response) => this.conflictProduct.set(response.data),
        error: (error: ApiErrorResponse) =>
          this.conflictLoadError.set(
            error.statusCode === 404 ? this.saveText.deleted : this.saveText.reloadError,
          ),
      });
  }

  keepLocalProductChanges(): void {
    this.acceptProductReview(true);
  }

  discardLocalProductChanges(): void {
    this.acceptProductReview(false);
  }

  private acceptProductReview(keepLocal: boolean): void {
    const current = this.conflictProduct();
    const saved = this.savedProductValues();
    if (!current || !saved || !this.canAcceptProductReview()) return;
    const merged = keepLocal
      ? mergeAdminProductDraft(
          saved,
          this.productForm.getRawValue(),
          adminProductFormValue(current),
        )
      : null;
    this.existingProduct.set(current);
    this.populateForm(current);
    if (merged) {
      this.productForm.patchValue(merged);
      this.galleryPreviewUrls.set(this.extractList(merged.galleryImages));
      this.restorePublicationControl();
    }
    this.productSaveConflict.set(false);
    this.conflictProduct.set(null);
    this.saveError.set('');
    this.attemptedSubmit.set(false);
  }

  onManufacturingProductUpdated(product: AdminProductRecord): void {
    const unsavedValues = this.productEditorDirty() ? this.productForm.getRawValue() : null;
    this.existingProduct.set(product);
    this.populateForm(product);
    if (unsavedValues) {
      this.productForm.patchValue({ ...unsavedValues, isActive: product.isActive });
      this.galleryPreviewUrls.set(this.extractList(unsavedValues.galleryImages));
    }
    this.reviewUnsaved.set(false);
  }

  onReviewDirtyChanged(dirty: boolean): void {
    this.reviewUnsaved.set(dirty);
  }

  onReviewBusyChanged(busy: boolean): void {
    this.reviewBusy.set(busy);
  }

  startManufacturingReview(): void {
    const product = this.existingProduct();
    if (!product || !this.canStartReview()) return;
    this.isStartingReview.set(true);
    this.reviewStartError.set('');
    this.manufacturingService
      .startReview(product.id, { expectedUpdatedAt: product.updatedAt })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isStartingReview.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.onManufacturingProductUpdated(response.data);
          this.messageService.add({
            severity: 'success',
            summary: 'بدأت مراجعة التصنيع',
            detail: 'أدخل القياسات والتكاليف الفعلية. المنتج ما زال غير منشور.',
          });
        },
        error: (error: ApiErrorResponse) => {
          this.reviewStartConflict.set(true);
          this.reviewStartError.set(
            error.statusCode === 409
              ? 'تغيّرت بيانات المنتج أو حالة نشره. أعد تحميل النسخة الحالية قبل بدء المراجعة.'
              : 'لم تتأكد نتيجة بدء المراجعة. أعد تحميل المنتج للتحقق من حالته قبل المحاولة مجددًا.',
          );
        },
      });
  }

  reloadManufacturingProduct(): void {
    if (this.productEditorBusy()) return;
    this.reviewStartError.set('');
    this.reviewStartConflict.set(false);
    this.retryLoadProduct();
  }

  private loadProduct(productId: string): void {
    this.isLoadingProduct.set(true);
    this.productLoadError.set('');
    this.adminProductService
      .getProductById(productId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoadingProduct.set(false)),
      )
      .subscribe({
        next: (response) => {
          if (!response.data) {
            this.productLoadError.set('بيانات المنتج غير متاحة. أعد تحميلها قبل التعديل.');
            return;
          }
          this.existingProduct.set(response.data);
          this.populateForm(response.data);
        },
        error: () =>
          this.productLoadError.set('تعذّر تحميل بيانات المنتج. تحقق من الاتصال ثم أعد المحاولة.'),
      });
  }

  private populateForm(product: AdminProductRecord): void {
    this.serverFieldErrors.set([]);
    this.slugEditedManually.set(true);
    this.productForm.patchValue(adminProductFormValue(product));
    this.galleryPreviewUrls.set(product.gallery ?? []);
    this.restorePublicationControl();
    this.savedProductValues.set(this.productForm.getRawValue());
    this.savedProductForm.set(JSON.stringify(this.productForm.getRawValue()));
  }

  private restorePublicationControl(): void {
    if (this.publicationBlocked()) {
      this.productForm.controls.isActive.setValue(false);
      this.productForm.controls.isActive.disable({ emitEvent: false });
    } else if (!this.isSubmitting()) {
      this.productForm.controls.isActive.enable({ emitEvent: false });
    }
  }

  private finishProductSave(): void {
    this.isSubmitting.set(false);
    this.productForm.enable({ emitEvent: false });
    this.restorePublicationControl();
    this.productForm.updateValueAndValidity();
  }

  onSlugChange(): void {
    this.slugEditedManually.set(true);
  }

  onMainImageFileSelected(event: Event): void {
    this.uploadImage(event, AdminImageField.Main);
  }
  onPosterImageSelected(event: Event): void {
    this.uploadImage(event, AdminImageField.Poster);
  }
  onSocialImageSelected(event: Event): void {
    this.uploadImage(event, AdminImageField.Social);
  }

  private imageUploadingState(field: AdminImageField): WritableSignal<boolean> {
    switch (field) {
      case AdminImageField.Main:
        return this.isUploadingImage;
      case AdminImageField.Poster:
        return this.isUploadingPoster;
      case AdminImageField.Social:
        return this.isUploadingSocial;
    }
  }

  private validImageFile(file: File): boolean {
    if (file.size > MAX_ADMIN_IMAGE_SIZE || !ADMIN_IMAGE_TYPES.includes(file.type)) {
      this.messageService.add({
        severity: 'error',
        summary: 'تعذر اختيار الصورة',
        detail: 'اختر صورة JPEG أو PNG أو WebP لا يزيد حجمها عن 10 MB.',
      });
      return false;
    }
    return true;
  }

  private uploadImage(event: Event, field: AdminImageField): void {
    if (this.uploadDisabled()) return;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !this.validImageFile(file)) return;
    const uploading = this.imageUploadingState(field);
    uploading.set(true);
    this.uploadService
      .uploadImage(file, 'products')
      .pipe(
        finalize(() => uploading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          if (!response.data?.url) {
            this.messageService.add({
              severity: 'error',
              summary: 'لم تكتمل الصورة',
              detail: 'لم يصل رابط الصورة من الخادم. أعد المحاولة.',
            });
            return;
          }
          this.productForm.controls[field].setValue(response.data.url);
          this.messageService.add({
            severity: 'success',
            summary: 'تم رفع الصورة',
            detail: 'احفظ المنتج لتثبيت الصورة في بياناته.',
          });
        },
        error: () =>
          this.messageService.add({
            severity: 'error',
            summary: 'تعذر رفع الصورة',
            detail: 'تحقق من الاتصال وصيغة الصورة وحجمها ثم أعد المحاولة.',
          }),
      });
  }

  onGalleryImagesSelected(event: Event): void {
    if (this.uploadDisabled()) return;
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []).filter((file) => this.validImageFile(file));
    input.value = '';
    if (!files.length) return;
    const remaining = Math.max(
      0,
      ADMIN_PRODUCT_LIMITS.gallery - new Set(this.galleryPreviewUrls()).size,
    );
    if (files.length > remaining) {
      this.gallerySelectionError.set(adminProductGalleryCapacityMessage(remaining));
      return;
    }
    this.gallerySelectionError.set('');
    this.isUploadingGallery.set(true);
    this.galleryUploadProgress.set(`0/${files.length}`);
    let completed = 0;
    const uploads = files.map((file) =>
      this.uploadService.uploadImage(file, 'products').pipe(
        catchError(() => of(null)),
        finalize(() => {
          completed += 1;
          this.galleryUploadProgress.set(`${completed}/${files.length}`);
        }),
      ),
    );
    forkJoin(uploads)
      .pipe(
        finalize(() => this.isUploadingGallery.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((responses) => {
        const urls = responses.flatMap((response) =>
          response?.data?.url ? [response.data.url] : [],
        );
        const allUrls = [...new Set([...this.galleryPreviewUrls(), ...urls])];
        this.productForm.controls.galleryImages.setValue(allUrls.join(', '));
        this.messageService.add({
          severity: urls.length === files.length ? 'success' : 'warn',
          summary: 'نتيجة رفع الصور',
          detail: `تم رفع ${urls.length} من ${files.length} صورة. احفظ المنتج لتثبيت الصور المرفوعة.`,
        });
      });
  }

  removeGalleryImage(index: number): void {
    if (this.uploadDisabled()) return;
    const urls = [...this.galleryPreviewUrls()];
    urls.splice(index, 1);
    this.productForm.controls.galleryImages.setValue(urls.join(', '));
  }

  onModelFileSelected(event: Event): void {
    if (this.uploadDisabled()) return;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const detectedType = getModelTypeFromPath(file.name);
    if (!detectedType || file.size > MAX_MODEL_UPLOAD_SIZE_BYTES) {
      this.messageService.add({
        severity: 'error',
        summary: 'ملف المجسم غير مناسب',
        detail: this.modelUploadHelpText,
      });
      return;
    }
    this.isUploadingModel.set(true);
    this.uploadService
      .uploadModel(file, this.productId())
      .pipe(
        finalize(() => this.isUploadingModel.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          if (!response.data?.url) {
            this.messageService.add({
              severity: 'error',
              summary: 'لم يكتمل رفع المجسم',
              detail: 'لم يصل رابط الملف من الخادم. أعد المحاولة.',
            });
            return;
          }
          this.productForm.controls.modelType.setValue(detectedType);
          this.productForm.controls.modelUrl.setValue(response.data.url);
          this.selectedModelFileName.set(file.name);
          this.messageService.add({
            severity: 'success',
            summary: 'تم رفع المجسم',
            detail: 'تم التعرف على الصيغة. احفظ المنتج لتثبيت الملف.',
          });
        },
        error: () =>
          this.messageService.add({
            severity: 'error',
            summary: 'تعذر رفع المجسم',
            detail: 'تحقق من الاتصال وسلامة الملف وصيغته ثم أعد المحاولة.',
          }),
      });
  }
  saveProduct(continueEditing: boolean): void {
    if (!this.canSaveProduct()) return;
    this.attemptedSubmit.set(true);

    if (this.productForm.invalid || this.validationErrors().length) {
      this.productForm.markAllAsTouched();
      const count = this.validationErrors().length;
      this.messageService.add({
        severity: 'error',
        summary: 'راجع بيانات المنتج',
        detail: `راجع ${count} من الحقول الموضحة في قائمة الملاحظات.`,
      });
      this.scrollToFirstInvalidField();
      return;
    }

    const product = this.buildProduct();
    if (!product) return;
    const revision = this.existingProduct()?.revision ?? null;
    if (this.isEditMode() && revision === null) return;
    this.isSubmitting.set(true);
    this.saveError.set('');
    this.serverFieldErrors.set([]);
    const submittedValues = this.productForm.getRawValue();
    this.productForm.disable({ emitEvent: false });

    if (this.isEditMode() && revision !== null) {
      this.adminProductService
        .updateProduct(product.id, product, revision)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => this.finishProductSave()),
        )
        .subscribe({
          next: (response) => {
            this.existingProduct.set(response.data);
            this.populateForm(response.data);
            this.messageService.add({
              severity: 'success',
              summary: 'تم تحديث المنتج',
              detail: 'تم حفظ تعديلات المنتج.',
            });
            if (continueEditing) {
              this.router.navigate(['/admin/products', product.id, 'edit']);
            } else {
              this.router.navigate(['/admin/products']);
            }
          },
          error: (err: ApiErrorResponse) => {
            if (err.statusCode === 422 && !err.errors?.['expectedRevision']?.length) {
              this.showValidationRejection(err, submittedValues, false);
              return;
            }
            if (err.statusCode !== 422 || err.errors?.['expectedRevision']?.length) {
              this.productSaveConflict.set(true);
              this.conflictProduct.set(null);
            }
            const errorMsg =
              err.statusCode === 409
                ? this.existingProduct()?.requiresManufacturingReview
                  ? 'لم يُحفظ التعديل: قد تتطلب حالة المراجعة إلغاء النشر أولًا أو اعتمادًا جديدًا، أو قد يكون رابط المنتج مستخدمًا. أعد تحميل بيانات المنتج وراجع الحالة والرابط.'
                  : 'رابط المنتج مستخدم بالفعل أو تغيّرت بياناته. راجع الرابط وأعد تحميل المنتج.'
                : 'لم يتم تأكيد حفظ التعديلات. راجع الحقول وحالة النشر ثم أعد المحاولة.';
            this.messageService.add({
              severity: 'error',
              summary: 'تعذر حفظ التعديل',
              detail: errorMsg,
            });
            this.saveError.set(this.productSaveConflict() ? this.saveText.conflict : errorMsg);
          },
        });
    } else {
      this.adminProductService
        .createProduct(product)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => this.finishProductSave()),
        )
        .subscribe({
          next: (res) => {
            const createdId = res.data?.id || res.data?._id || product.id;
            const createdProduct = { ...product, ...res.data, id: createdId };
            this.existingProduct.set(createdProduct);
            this.populateForm(createdProduct);
            this.productId.set(createdId);
            this.isEditMode.set(true);
            this.messageService.add({
              severity: 'success',
              summary: this.reviewText.createdSummary,
              detail: this.reviewText.createdDetail,
            });
            if (continueEditing) {
              this.router.navigate(['/admin/products', createdId, 'edit']);
            } else {
              this.router.navigate(['/admin/products']);
            }
          },
          error: (err: ApiErrorResponse) => {
            if (err.statusCode === 422) {
              this.showValidationRejection(err, submittedValues, true);
              return;
            }
            let errorMsg = 'لم يتم تأكيد إنشاء المنتج. تحقق من القائمة قبل تكرار الحفظ.';
            if (err.errors?.['isActive']?.length) {
              errorMsg = this.reviewText.activeCreationError;
            } else if (err.statusCode === 409) {
              errorMsg = 'رابط المنتج مستخدم بالفعل. اختر رابطًا مختلفًا.';
            }
            this.messageService.add({
              severity: 'error',
              summary: 'تعذر إنشاء المنتج',
              detail: errorMsg,
            });
          },
        });
    }
  }

  private showValidationRejection(
    error: ApiErrorResponse,
    values: AdminProductFormValue,
    creating: boolean,
  ): void {
    this.serverFieldErrors.set(adminProductServerFieldErrors(error.errors ?? {}, values));
    const detail =
      creating && error.errors?.['isActive']?.length
        ? this.reviewText.activeCreationError
        : creating
          ? this.saveText.rejectedCreate
          : this.saveText.rejectedUpdate;
    this.saveError.set(detail);
    this.messageService.add({ severity: 'error', summary: 'راجع بيانات المنتج', detail });
  }

  scrollToField(fieldId: string): void {
    const el = document.getElementById(fieldId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const targetInput = el.matches('input, textarea, select')
        ? el
        : (el.querySelector(
            'input, textarea, select, .p-select, .p-inputnumber-input',
          ) as HTMLElement | null);
      targetInput?.focus?.();
    }
  }

  private scrollToFirstInvalidField(): void {
    setTimeout(() => {
      const firstInvalid = document.querySelector(
        '.admin-field.has-error input, .admin-field.has-error textarea, .admin-field.has-error .p-select, .admin-field .ng-invalid',
      ) as HTMLElement | null;
      if (firstInvalid) {
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInvalid.focus?.();
      }
    }, 120);
  }

  cancel(): void {
    if (this.isSubmitting()) return;
    this.router.navigate(['/admin/products']);
  }

  previewProduct(): void {
    if (this.isSubmitting()) return;
    const product = this.existingProduct();
    if (product?.isActive) this.router.navigate(['/products', product.slug]);
  }

  private buildProduct(): Product | null {
    const formValue = this.productForm.getRawValue();
    if (!formValue.category || !formValue.material || formValue.price === null) return null;
    const now = new Date().toISOString();

    return {
      id: this.existingProduct()?.id ?? `prod-${Date.now()}`,
      slug: formValue.slug.trim(),
      name: formValue.name.trim(),
      category: formValue.category,
      shortDescription: formValue.shortDescription ?? '',
      description: formValue.description ?? '',
      price: Number(formValue.price ?? 0),
      discountPrice: formValue.discountPrice,
      rating: this.existingProduct()?.rating ?? null,
      image: formValue.mainImage ?? '',
      gallery: this.extractList(formValue.galleryImages),
      modelUrl: formValue.modelUrl ?? '',
      modelType: formValue.modelType ?? ProductModelType.GLB,
      posterImage: formValue.posterImage || null,
      imageAlt: formValue.imageAlt || null,
      socialImage: formValue.socialImage || null,
      tags: this.extractList(formValue.tags),
      material: formValue.material,
      finish: formValue.finish ?? '',
      color: formValue.color ?? '',
      size: formValue.size ?? '',
      weight: formValue.weight ?? '',
      printTime: formValue.printTime ?? '',
      isMadeToOrder: formValue.isMadeToOrder ?? false,
      productionTimeMin: formValue.isMadeToOrder ? formValue.productionTimeMin : null,
      productionTimeMax: formValue.isMadeToOrder ? formValue.productionTimeMax : null,
      productionTimeUnit: formValue.isMadeToOrder ? formValue.productionTimeUnit : null,
      layerHeight: formValue.layerHeight || null,
      infill: formValue.infill || null,
      isFeatured: formValue.isFeatured ?? false,
      isActive: formValue.isActive,
      badge: formValue.badge ?? ProductBadge.NONE,
      safetyNote: formValue.safetyNote ?? '',
      metaTitle: formValue.metaTitle || null,
      metaDescription: formValue.metaDescription || null,
      keywords: this.extractList(formValue.keywords),
      createdAt: this.existingProduct()?.createdAt ?? now,
      updatedAt: now,
    };
  }

  private extractList(value: string | null): string[] {
    return adminProductListValues(value);
  }

  private buildSlug(value: string): string {
    const clean = value
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/(^-|-$)/g, '');
    return clean || `product-${Date.now().toString(36)}`;
  }
}
