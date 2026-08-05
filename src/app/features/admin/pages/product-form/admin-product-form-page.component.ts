import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductBadge } from '@core/enums/product-badge.enum';
import { ProductCategory } from '@core/enums/product-category.enum';
import { ProductMaterial } from '@core/enums/product-material.enum';
import { ProductModelType } from '@core/enums/product-model-type.enum';
import { Product } from '@core/models/product.model';
import { APP_CONSTANTS } from '@core/constants/app.constants';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { Rating } from 'primeng/rating';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { AdminProductService } from '../../services/admin-product.service';
import { UploadService } from '@core/services/upload.service';
import {
  ADMIN_CATEGORY_OPTIONS,
  PRODUCT_BADGE_OPTIONS,
  PRODUCT_MATERIAL_OPTIONS,
  PRODUCT_MODEL_TYPE_OPTIONS
} from '../../data/admin-products.data';
import { AdminFilePreviewComponent } from '../../components/admin-file-preview.component';

@Component({
  selector: 'app-admin-product-form-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    Button,
    InputNumber,
    InputText,
    Message,
    Rating,
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

  categoryOptions = ADMIN_CATEGORY_OPTIONS.filter(option => option.value !== 'all');
  badgeOptions = PRODUCT_BADGE_OPTIONS;
  materialOptions = PRODUCT_MATERIAL_OPTIONS;
  modelTypeOptions = PRODUCT_MODEL_TYPE_OPTIONS;

  productId = this.route.snapshot.paramMap.get('id');
  existingProduct = signal<Product | null>(null);
  isEditMode = signal<boolean>(false);
  slugEditedManually = signal<boolean>(false);
  isUploadingImage = signal<boolean>(false);
  isUploadingModel = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  productForm = this.formBuilder.group({
    name: ['', [Validators.required]],
    slug: ['', [Validators.required]],
    category: [ProductCategory.SWORDS as string, [Validators.required]],
    shortDescription: ['', [Validators.required]],
    description: ['', [Validators.required]],
    price: [0, [Validators.required, Validators.min(0.01)]],
    discountPrice: [null as number | null],
    rating: [5, [Validators.required, Validators.min(0), Validators.max(5)]],
    badge: [ProductBadge.NONE as string, [Validators.required]],
    isFeatured: [false],
    isActive: [true],
    mainImage: ['', [Validators.required]],
    galleryImages: [''],
    modelUrl: ['', [Validators.required]],
    modelType: [ProductModelType.GLB as string, [Validators.required]],
    posterImage: [''],
    material: [ProductMaterial.PLA_PLUS as string, [Validators.required]],
    finish: [APP_CONSTANTS.DEFAULT_FINISH, [Validators.required]],
    color: ['', [Validators.required]],
    size: ['', [Validators.required]],
    weight: ['', [Validators.required]],
    printTime: ['', [Validators.required]],
    layerHeight: [''],
    infill: [''],
    metaTitle: [''],
    metaDescription: [''],
    keywords: [''],
    safetyNote: [APP_CONSTANTS.SAFETY_DISCLAIMER, [Validators.required]]
  });

  previewImage = computed(() => this.productForm.controls.mainImage.value);
  previewModel = computed(() => this.productForm.controls.modelUrl.value);
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
      rating: product.rating,
      badge: product.badge ?? ProductBadge.NONE,
      isFeatured: product.isFeatured,
      isActive: product.isActive,
      mainImage: product.image,
      galleryImages: (product.gallery ?? []).join(', '),
      modelUrl: product.modelUrl,
      modelType: product.modelType,
      posterImage: product.posterImage ?? '',
      material: product.material,
      finish: product.finish,
      color: product.color,
      size: product.size,
      weight: product.weight,
      printTime: product.printTime,
      layerHeight: product.layerHeight ?? '',
      infill: product.infill ?? '',
      metaTitle: product.metaTitle ?? '',
      metaDescription: product.metaDescription ?? '',
      keywords: (product.keywords ?? []).join(', '),
      safetyNote: product.safetyNote
    });
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
          this.messageService.add({ severity: 'error', summary: 'Upload failed', detail: err?.message || 'Failed to upload image.' });
        }
      });
    }
  }

  onModelFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.isUploadingModel.set(true);
      this.uploadService.uploadModel(file, this.productId || undefined).subscribe({
        next: (res) => {
          this.isUploadingModel.set(false);
          if (res.data?.url) {
            this.productForm.controls.modelUrl.setValue(res.data.url);
            this.messageService.add({ severity: 'success', summary: 'Model uploaded', detail: '3D model file uploaded.' });
          }
        },
        error: (err) => {
          this.isUploadingModel.set(false);
          this.messageService.add({ severity: 'error', summary: 'Upload failed', detail: err?.message || 'Failed to upload 3D model.' });
        }
      });
    }
  }

  saveProduct(continueEditing: boolean): void {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
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
          this.messageService.add({ severity: 'error', summary: 'Update failed', detail: err?.message || 'Could not update product.' });
        }
      });
    } else {
      this.adminProductService.createProduct(product).subscribe({
        next: (res) => {
          this.isSubmitting.set(false);
          const createdId = res.data?.id || product.id;
          this.messageService.add({ severity: 'success', summary: 'Product created', detail: 'Product created successfully.' });
          if (continueEditing) {
            this.router.navigate(['/admin/products', createdId, 'edit']);
          } else {
            this.router.navigate(['/admin/products']);
          }
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.messageService.add({ severity: 'error', summary: 'Creation failed', detail: err?.message || 'Could not create product.' });
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
      rating: Number(formValue.rating ?? 0),
      image: formValue.mainImage ?? '',
      gallery: this.extractList(formValue.galleryImages),
      modelUrl: formValue.modelUrl ?? '',
      modelType: (formValue.modelType as ProductModelType) ?? ProductModelType.GLB,
      posterImage: formValue.posterImage || formValue.mainImage || null,
      tags: this.extractList(formValue.keywords),
      material: (formValue.material as ProductMaterial) ?? ProductMaterial.PLA_PLUS,
      finish: formValue.finish ?? '',
      color: formValue.color ?? '',
      size: formValue.size ?? '',
      weight: formValue.weight ?? '',
      printTime: formValue.printTime ?? '',
      layerHeight: formValue.layerHeight || null,
      infill: formValue.infill || null,
      isFeatured: formValue.isFeatured ?? false,
      isActive: formValue.isActive ?? true,
      badge: (formValue.badge as ProductBadge) ?? ProductBadge.NONE,
      safetyNote: formValue.safetyNote ?? APP_CONSTANTS.SAFETY_DISCLAIMER,
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
    return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
}
