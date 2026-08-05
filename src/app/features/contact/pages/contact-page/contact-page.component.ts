import {
  Component,
  inject,
  signal,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  viewChild,
  NgZone
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { WhatsAppService } from '@core/services/whatsapp.service';
import { SeoService } from '@core/services/seo.service';
import { CustomOrderService } from '../../services/custom-order.service';
import { PRODUCT_TYPE_OPTIONS, COLOR_FINISH_OPTIONS, CUSTOM_FAQ_ITEMS, FaqItem } from '../../contact.control';
import { CustomOrderRequest } from '@core/models/custom-order-request.model';
import { environment } from '../../../../../environments/environment.prod';
import * as THREE from 'three';

@Component({
  selector: 'app-contact-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './contact-page.component.html',
  styleUrl: './contact-page.component.scss'
})
export class ContactPageComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly whatsAppService = inject(WhatsAppService);
  private readonly customOrderService = inject(CustomOrderService);
  private readonly seoService = inject(SeoService);
  private readonly ngZone = inject(NgZone);

  readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('contactCanvas');

  readonly productTypeOptions: string[] = PRODUCT_TYPE_OPTIONS;
  readonly colorFinishOptions: string[] = COLOR_FINISH_OPTIONS;
  readonly faqItems: FaqItem[] = CUSTOM_FAQ_ITEMS;

  readonly whatsAppNumber = environment.whatsAppNumber;
  readonly storePhone = environment.storePhone;

  readonly customForm: FormGroup = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required]],
    productType: [PRODUCT_TYPE_OPTIONS[0], [Validators.required]],
    dimensions: ['Standard 100 cm', [Validators.required]],
    colorFinish: [COLOR_FINISH_OPTIONS[0], [Validators.required]],
    referenceUrl: [''],
    details: ['', [Validators.required, Validators.minLength(10)]]
  });

  readonly isSubmitted = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly generatedWhatsAppUrl = signal<string>('');

  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private renderer?: THREE.WebGLRenderer;
  private particleSystem?: THREE.Points;
  private animationFrameId?: number;

  ngOnInit(): void {
    this.seoService.setTitle('Custom 3D Anime Forge Order & Contact - 3D Otaku');
    this.seoService.setMetaDescription('Submit your custom anime 3D print request or weapon replica idea directly via form or WhatsApp.');
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initContact3dScene(), 50);
  }

  ngOnDestroy(): void {
    this.cleanContact3dScene();
  }

  onSubmit(): void {
    if (this.customForm.invalid) {
      this.customForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const request: CustomOrderRequest = this.customForm.value;
    const url = this.whatsAppService.getCustomOrderUrl(request);
    this.generatedWhatsAppUrl.set(url);

    this.customOrderService.createCustomOrder({
      fullName: request.fullName,
      phone: request.phone,
      whatsappNumber: request.phone,
      email: request.email,
      productIdea: request.productType,
      description: request.details,
      preferredColor: request.colorFinish,
      estimatedSize: request.dimensions,
      referenceImageUrl: request.referenceUrl
    }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.isSubmitted.set(true);
        window.open(url, '_blank');
      },
      error: () => {
        this.isSubmitting.set(false);
        this.isSubmitted.set(true);
        window.open(url, '_blank');
      }
    });
  }

  resetForm(): void {
    this.customForm.reset({
      productType: PRODUCT_TYPE_OPTIONS[0],
      dimensions: 'Standard 100 cm',
      colorFinish: COLOR_FINISH_OPTIONS[0]
    });
    this.isSubmitted.set(false);
  }

  private initContact3dScene(): void {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;

    this.cleanContact3dScene();

    const parent = canvas.parentElement;
    const width = parent?.clientWidth || window.innerWidth;
    const height = parent?.clientHeight || 450;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.z = 10;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const particleCount = 200;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const colorChoices = [
      new THREE.Color(0xec4899),
      new THREE.Color(0x10b981),
      new THREE.Color(0x38bdf8)
    ];

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      positions[idx] = (Math.random() - 0.5) * 16;
      positions[idx + 1] = (Math.random() - 0.5) * 16;
      positions[idx + 2] = (Math.random() - 0.5) * 16;

      const c = colorChoices[Math.floor(Math.random() * colorChoices.length)];
      colors[idx] = c.r;
      colors[idx + 1] = c.g;
      colors[idx + 2] = c.b;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.09,
      vertexColors: true,
      transparent: true,
      opacity: 0.75
    });

    this.particleSystem = new THREE.Points(particleGeo, particleMat);
    this.scene.add(this.particleSystem);

    this.ngZone.runOutsideAngular(() => {
      let clock = new THREE.Clock();
      const animate = () => {
        if (!this.renderer || !this.scene || !this.camera) return;
        this.animationFrameId = requestAnimationFrame(animate);

        const elapsedTime = clock.getElapsedTime();

        if (this.particleSystem) {
          this.particleSystem.rotation.y = elapsedTime * 0.05;
        }

        this.renderer.render(this.scene, this.camera);
      };
      animate();
    });
  }

  private cleanContact3dScene(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = undefined;
    }
    this.scene = undefined;
    this.camera = undefined;
    this.particleSystem = undefined;
  }
}
