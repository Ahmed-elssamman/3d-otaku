import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductBadge } from '@core/enums/product-badge.enum';
import { ProductCategory } from '@core/enums/product-category.enum';
import { ProductMaterial } from '@core/enums/product-material.enum';
import { ProductModelType } from '@core/enums/product-model-type.enum';
import { ProductionTimeUnit } from '@core/enums/production-time-unit.enum';
import { Product } from '@core/models/product.model';
import { APP_CONSTANTS } from '@core/constants/app.constants';
import {
  getModelTypeFromPath,
  MAX_MODEL_UPLOAD_SIZE_BYTES,
  MAX_MODEL_UPLOAD_SIZE_LABEL,
  MODEL_FILE_ACCEPT
} from '@core/constants/model-file.constants';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { AdminProductService } from '../../services/admin-product.service';
import { UploadService } from '@core/services/upload.service';
import {
  ADMIN_CATEGORY_OPTIONS,
  PRODUCT_BADGE_OPTIONS,
  PRODUCT_MATERIAL_OPTIONS,
  PRODUCT_MODEL_TYPE_OPTIONS,
  MODEL_UPLOAD_HELP_TEXT
  ,PRODUCTION_TIME_UNIT_OPTIONS
} from '../../data/admin-products.data';
import { AdminFilePreviewComponent } from '../../components/admin-file-preview.component';
import { AdminSettingsService } from '../../services/admin-settings.service';

function productPricingValidator(control: AbstractControl): ValidationErrors | null {
  const price = control.get('price')?.value as number | null;
  const discountPrice = control.get('discountPrice')?.value as number | null;
  if (discountPrice === null || discountPrice === 0) {
    return null;
  }
  return typeof price === 'number' && discountPrice >= 0 && discountPrice < price ? null : { invalidDiscount: true };
}

function productionRangeValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.get('isMadeToOrder')?.value) {
    return null;
  }
  const minimum = control.get('productionTimeMin')?.value as number | null;
  const maximum = control.get('productionTimeMax')?.value as number | null;
  const unit = control.get('productionTimeUnit')?.value as string | null;
  return typeof minimum === 'number' && typeof maximum === 'number' && minimum > 0 && maximum >= minimum && Boolean(unit)
    ? null
    : { invalidProductionRange: true };
}

@Component({
  selector: 'app-admin-product-form-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    Button,
    InputNumber,
    InputText,
    Message,
    CurrencyPipe,
    Select,
    Textarea,
    ToggleSwitch,
    AdminFilePreviewComponent
  ],
  templateUrl: './admin-product-form-page.component.html',
  styleUrl: './admin-product-form-page.component.scss'
})
export class AdminProductFormPageComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private adminProductService = inject(AdminProductService);
  private uploadService = inject(UploadService);
  private messageService = inject(MessageService);
  private settingsService = inject(AdminSettingsService);

  categoryOptions = ADMIN_CATEGORY_OPTIONS.filter(option => option.value !== 'all');
  badgeOptions = PRODUCT_BADGE_OPTIONS;
  materialOptions = PRODUCT_MATERIAL_OPTIONS;
  modelTypeOptions = PRODUCT_MODEL_TYPE_OPTIONS;
  productionTimeUnitOptions = PRODUCTION_TIME_UNIT_OPTIONS;

  productId = this.route.snapshot.paramMap.get('id');
  existingProduct = signal<Product | null>(null);
  isEditMode = signal<boolean>(false);
  slugEditedManually = signal<boolean>(false);
  isUploadingImage = signal<boolean>(false);
  isUploadingModel = signal<boolean>(false);
  isUploadingGallery = signal<boolean>(false);
  isUploadingPoster = signal<boolean>(false);
  isUploadingSocial = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  selectedModelFileName = signal<string>('');
  galleryUploadProgress = signal<string>('');
  galleryPreviewUrls = signal<string[]>([]);

  modelFileAccept = MODEL_FILE_ACCEPT;
  modelUploadHelpText = MODEL_UPLOAD_HELP_TEXT;

  productForm = this.formBuilder.group({
    name: ['', [Validators.required]],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
    category: [ProductCategory.SWORDS as string, [Validators.required]],
    shortDescription: ['', [Validators.required]],
    description: ['', [Validators.required]],
    price: [0, [Validators.required, Validators.min(0.01)]],
    discountPrice: [null as number | null],
    badge: [ProductBadge.NONE as string, [Validators.required]],
    isFeatured: [false],
    isActive: [true],
    mainImage: [''],
    galleryImages: [''],
    modelUrl: [''],
    modelType: [ProductModelType.GLB as string, [Validators.required]],
    posterImage: [''],
    imageAlt: [''],
    socialImage: [''],
    material: [ProductMaterial.PLA_PLUS as string, [Validators.required]],
    finish: [APP_CONSTANTS.DEFAULT_FINISH, [Validators.required]],
    color: ['', [Validators.required]],
    size: ['', [Validators.required]],
    weight: ['', [Validators.required]],
    printTime: ['', [Validators.required]],
    isMadeToOrder: [false],
    productionTimeMin: [null as number | null],
    productionTimeMax: [null as number | null],
    productionTimeUnit: [ProductionTimeUnit.BUSINESS_DAYS as string],
    layerHeight: [''],
    infill: [''],
    metaTitle: [''],
    metaDescription: [''],
    keywords: [''],
    tags: [''],
    safetyNote: ['']
  }, { validators: [productPricingValidator, productionRangeValidator] });

  previewImage = computed(() => this.productForm.controls.mainImage.value);
  previewModel = computed(() => this.productForm.controls.modelUrl.value);
  previewModelType = computed(() => (this.productForm.controls.modelType.value as ProductModelType) ?? ProductModelType.GLB);
  previewPoster = computed(() => this.productForm.controls.posterImage.value || this.productForm.controls.mainImage.value);
  previewProductName = computed(() => this.productForm.controls.name.value || 'Product Preview');

  constructor() {
    this.productForm.controls.name.valueChanges.subscribe(value => {
      if (!this.slugEditedManually() && value) {
        this.productForm.controls.slug.setValue(this.buildSlug(value), { emitEvent: false });
      }
    });
  }

  ngOnInit(): void {
    this.settingsService.getAdminSettings().subscribe();
    if (this.productId) {
      this.isEditMode.set(true);
      this.adminProductService.getProductById(this.productId).subscribe({
        next: (res) => {
          const product = res.data || this.adminProductService.loadFromStorage().find(p => p.id === this.productId);
          if (product) {
            this.existingProduct.set(product);
            this.populateForm(product);
          }
        },
        error: () => {
          const product = this.adminProductService.loadFromStorage().find(p => p.id === this.productId);
          if (product) {
            this.existingProduct.set(product);
            this.populateForm(product);
          }
        }
      });
    }
  }

  private populateForm(product: Product): void {
    this.productForm.patchValue({
      name: product.name,
      slug: product.slug,
      category: product.category,
      shortDescription: product.shortDescription,
      description: product.description,
      price: product.price,
      discountPrice: product.discountPrice ?? null,
      badge: product.badge ?? ProductBadge.NONE,
      isFeatured: product.isFeatured,
      isActive: product.isActive,
      mainImage: product.image,
      galleryImages: (product.gallery ?? []).join(', '),
      modelUrl: product.modelUrl,
      modelType: product.modelType,
      posterImage: product.posterImage ?? '',
      imageAlt: product.imageAlt ?? '',
      socialImage: product.socialImage ?? '',
      material: product.material,
      finish: product.finish,
      color: product.color,
      size: product.size,
      weight: product.weight,
      printTime: product.printTime,
      isMadeToOrder: product.isMadeToOrder ?? false,
      productionTimeMin: product.productionTimeMin ?? null,
      productionTimeMax: product.productionTimeMax ?? null,
      productionTimeUnit: product.productionTimeUnit ?? ProductionTimeUnit.BUSINESS_DAYS,
      layerHeight: product.layerHeight ?? '',
      infill: product.infill ?? '',
      metaTitle: product.metaTitle ?? '',
      metaDescription: product.metaDescription ?? '',
      keywords: (product.keywords ?? []).join(', '),
      tags: (product.tags ?? []).join(', '),
      safetyNote: product.safetyNote
    });
    this.galleryPreviewUrls.set(product.gallery ?? []);
  }

  onSlugChange(): void {
    this.slugEditedManually.set(true);
  }

  onMainImageFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.isUploadingImage.set(true);
      this.uploadService.uploadImage(file, 'products').subscribe({
        next: (res) => {
          this.isUploadingImage.set(false);
          if (res.data?.url) {
            this.productForm.controls.mainImage.setValue(res.data.url);
            this.messageService.add({ severity: 'success', summary: 'Image uploaded', detail: 'Main product image uploaded.' });
          }
        },
        error: (err) => {
          this.isUploadingImage.set(false);
          const errorMsg = err?.error?.message || err?.message || 'Failed to upload image.';
          this.messageService.add({ severity: 'error', summary: 'Upload failed', detail: errorMsg });
        }
      });
    }
  }

  onGalleryImagesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const files = Array.from(input.files);
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
    const validFiles = files.filter(f => {
      if (f.size > MAX_IMAGE_SIZE) {
        this.messageService.add({ severity: 'warn', summary: 'File too large', detail: `${f.name} exceeds 10 MB and was skipped.` });
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      input.value = '';
      return;
    }

    this.isUploadingGallery.set(true);
    let completed = 0;
    const uploadedUrls: string[] = [];

    validFiles.forEach(file => {
      this.galleryUploadProgress.set(`${completed + 1}/${validFiles.length}`);
      this.uploadService.uploadImage(file, 'products').subscribe({
        next: (res) => {
          completed++;
          if (res.data?.url) {
            uploadedUrls.push(res.data.url);
          }
          this.galleryUploadProgress.set(`${completed}/${validFiles.length}`);

          if (completed === validFiles.length) {
            this.isUploadingGallery.set(false);
            const currentUrls = this.galleryPreviewUrls();
            const newUrls = [...currentUrls, ...uploadedUrls];
            this.galleryPreviewUrls.set(newUrls);
            this.productForm.controls.galleryImages.setValue(newUrls.join(', '));
            this.messageService.add({
              severity: 'success',
              summary: 'Gallery updated',
              detail: `${uploadedUrls.length} image(s) uploaded successfully.`
            });
          }
        },
        error: (err) => {
          completed++;
          const errorMsg = err?.error?.message || err?.message || 'Upload error';
          this.messageService.add({ severity: 'error', summary: 'Upload failed', detail: `Failed to upload ${file.name}: ${errorMsg}` });
          if (completed === validFiles.length) {
            this.isUploadingGallery.set(false);
            if (uploadedUrls.length > 0) {
              const currentUrls = this.galleryPreviewUrls();
              const newUrls = [...currentUrls, ...uploadedUrls];
              this.galleryPreviewUrls.set(newUrls);
              this.productForm.controls.galleryImages.setValue(newUrls.join(', '));
            }
          }
        }
      });
    });

    input.value = '';
  }

  removeGalleryImage(index: number): void {
    const urls = [...this.galleryPreviewUrls()];
    urls.splice(index, 1);
    this.galleryPreviewUrls.set(urls);
    this.productForm.controls.galleryImages.setValue(urls.join(', '));
  }

  onPosterImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (file.size > 10 * 1024 * 1024) {
        this.messageService.add({ severity: 'error', summary: 'File too large', detail: 'Poster image must be under 10 MB.' });
        input.value = '';
        return;
      }
      this.isUploadingPoster.set(true);
      this.uploadService.uploadImage(file, 'products').subscribe({
        next: (res) => {
          this.isUploadingPoster.set(false);
          if (res.data?.url) {
            this.productForm.controls.posterImage.setValue(res.data.url);
            this.messageService.add({ severity: 'success', summary: 'Poster uploaded', detail: 'Poster image uploaded successfully.' });
          }
        },
        error: (err) => {
          this.isUploadingPoster.set(false);
          const errorMsg = err?.error?.message || err?.message || 'Failed to upload poster image.';
          this.messageService.add({ severity: 'error', summary: 'Upload failed', detail: errorMsg });
        }
      });
    }
  }

  onSocialImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (file.size > 10 * 1024 * 1024) {
        this.messageService.add({ severity: 'error', summary: 'File too large', detail: 'Social image must be under 10 MB.' });
        input.value = '';
        return;
      }
      this.isUploadingSocial.set(true);
      this.uploadService.uploadImage(file, 'general').subscribe({
        next: (res) => {
          this.isUploadingSocial.set(false);
          if (res.data?.url) {
            this.productForm.controls.socialImage.setValue(res.data.url);
            this.messageService.add({ severity: 'success', summary: 'Social image uploaded', detail: 'Social sharing image uploaded successfully.' });
          }
        },
        error: (err) => {
          this.isUploadingSocial.set(false);
          const errorMsg = err?.error?.message || err?.message || 'Failed to upload social image.';
          this.messageService.add({ severity: 'error', summary: 'Upload failed', detail: errorMsg });
        }
      });
    }
  }

  onModelFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const detectedType = getModelTypeFromPath(file.name);

      if (!detectedType) {
        this.messageService.add({
          severity: 'error',
          summary: 'Unsupported 3D format',
          detail: `Choose one of these formats: ${this.modelUploadHelpText}`
        });
        input.value = '';
        return;
      }

      if (file.size > MAX_MODEL_UPLOAD_SIZE_BYTES) {
        this.messageService.add({
          severity: 'error',
          summary: 'Model is too large',
          detail: `The selected file exceeds the ${MAX_MODEL_UPLOAD_SIZE_LABEL} limit.`
        });
        input.value = '';
        return;
      }

      this.selectedModelFileName.set(file.name);
      this.productForm.controls.modelType.setValue(detectedType);
      this.isUploadingModel.set(true);
      this.uploadService.uploadModel(file, this.productId).subscribe({
        next: (res) => {
          this.isUploadingModel.set(false);
          if (res.data?.url) {
            this.productForm.controls.modelUrl.setValue(res.data.url);
            this.messageService.add({
              severity: 'success',
              summary: `${detectedType} model ready`,
              detail: 'The model was uploaded and its format was detected automatically.'
            });
          }
        },
        error: (err) => {
          this.isUploadingModel.set(false);
          const errorMsg = err?.error?.message || err?.message || 'Failed to upload 3D model.';
          this.messageService.add({ severity: 'error', summary: 'Upload failed', detail: errorMsg });
        }
      });
    }
  }

  saveProduct(continueEditing: boolean): void {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      this.messageService.add({ severity: 'warn', summary: 'Validation Error', detail: 'Please fill in all required fields marked in red.' });
      return;
    }

    this.isSubmitting.set(true);
    const product = this.buildProduct();

    if (this.isEditMode()) {
      this.adminProductService.updateProduct(product.id, product).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.messageService.add({ severity: 'success', summary: 'Product updated', detail: 'Product updated successfully.' });
          if (continueEditing) {
            this.router.navigate(['/admin/products', product.id, 'edit']);
          } else {
            this.router.navigate(['/admin/products']);
          }
        },
        error: (err) => {
          this.isSubmitting.set(false);
          const errorMsg = err?.error?.message || err?.message || 'Could not update product.';
          this.messageService.add({ severity: 'error', summary: 'Update failed', detail: errorMsg });
        }
      });
    } else {
      this.adminProductService.createProduct(product).subscribe({
        next: (res) => {
          this.isSubmitting.set(false);
          const createdId = res.data?.id || (res.data as unknown as { _id?: string })?._id || product.id;
          this.messageService.add({ severity: 'success', summary: 'Product created', detail: 'Product created successfully.' });
          if (continueEditing) {
            this.router.navigate(['/admin/products', createdId, 'edit']);
          } else {
            this.router.navigate(['/admin/products']);
          }
        },
        error: (err) => {
          this.isSubmitting.set(false);
          const errorMsg = err?.error?.message || err?.message || 'Could not create product.';
          this.messageService.add({ severity: 'error', summary: 'Creation failed', detail: errorMsg });
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/admin/products']);
  }

  previewProduct(): void {
    const slug = this.productForm.controls.slug.value;
    if (slug) {
      this.router.navigate(['/products', slug]);
    }
  }

  private buildProduct(): Product {
    const formValue = this.productForm.getRawValue();
    const now = new Date().toISOString();

    return {
      id: this.existingProduct()?.id ?? `prod-${Date.now()}`,
      slug: formValue.slug ?? '',
      name: formValue.name ?? '',
      category: (formValue.category as ProductCategory) ?? ProductCategory.SWORDS,
      shortDescription: formValue.shortDescription ?? '',
      description: formValue.description ?? '',
      price: Number(formValue.price ?? 0),
      discountPrice: formValue.discountPrice ? Number(formValue.discountPrice) : null,
      rating: this.existingProduct()?.rating ?? null,
      image: formValue.mainImage ?? '',
      gallery: this.extractList(formValue.galleryImages),
      modelUrl: formValue.modelUrl ?? '',
      modelType: (formValue.modelType as ProductModelType) ?? ProductModelType.GLB,
      posterImage: formValue.posterImage || formValue.mainImage || null,
      imageAlt: formValue.imageAlt || null,
      socialImage: formValue.socialImage || null,
      tags: this.extractList(formValue.tags),
      material: (formValue.material as ProductMaterial) ?? ProductMaterial.PLA_PLUS,
      finish: formValue.finish ?? '',
      color: formValue.color ?? '',
      size: formValue.size ?? '',
      weight: formValue.weight ?? '',
      printTime: formValue.printTime ?? '',
      isMadeToOrder: formValue.isMadeToOrder ?? false,
      productionTimeMin: formValue.isMadeToOrder ? formValue.productionTimeMin : null,
      productionTimeMax: formValue.isMadeToOrder ? formValue.productionTimeMax : null,
      productionTimeUnit: formValue.isMadeToOrder ? formValue.productionTimeUnit as ProductionTimeUnit : null,
      layerHeight: formValue.layerHeight || null,
      infill: formValue.infill || null,
      isFeatured: formValue.isFeatured ?? false,
      isActive: formValue.isActive ?? true,
      badge: (formValue.badge as ProductBadge) ?? ProductBadge.NONE,
      safetyNote: formValue.safetyNote ?? '',
      metaTitle: formValue.metaTitle || null,
      metaDescription: formValue.metaDescription || null,
      keywords: this.extractList(formValue.keywords),
      createdAt: this.existingProduct()?.createdAt ?? now,
      updatedAt: now
    };
  }

  private extractList(value: string | null): string[] {
    if (!value) return [];
    return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
  }

  private buildSlug(value: string): string {
    const clean = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return clean || `product-${Date.now().toString(36)}`;
  }
}
