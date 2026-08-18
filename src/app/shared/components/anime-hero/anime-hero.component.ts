import {
  Component,
  computed,
  inject,
  signal,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  viewChild,
  NgZone
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { HERO_STATS, HeroStat } from './anime-hero.control';
import { GlowButtonComponent } from '../glow-button/glow-button.component';
import { Product3dViewerComponent } from '../product-3d-viewer/product-3d-viewer.component';
import { ProductService } from '@core/services/product.service';
import { AdminSettingsService } from '../../../features/admin/services/admin-settings.service';
import { Product } from '@core/models/product.model';
import * as THREE from 'three';

@Component({
  selector: 'app-anime-hero',
  standalone: true,
  imports: [RouterLink, GlowButtonComponent, Product3dViewerComponent],
  templateUrl: './anime-hero.component.html',
  styleUrl: './anime-hero.component.scss'
})
export class AnimeHeroComponent implements OnInit, AfterViewInit, OnDestroy {
  private productService = inject(ProductService);
  private adminSettingsService = inject(AdminSettingsService);
  private ngZone = inject(NgZone);

  readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('heroCanvas');

  readonly stats: HeroStat[] = HERO_STATS;
  readonly settings = this.adminSettingsService.settings;

  readonly allProducts = computed(() => this.productService.allProducts());
  readonly spotlightProducts = computed(() => this.allProducts().slice(0, 5));
  readonly selectedProductIndex = signal<number>(0);

  readonly currentProduct = computed<Product | null>(() => {
    const list = this.allProducts();
    if (!list.length) return null;
    return list[this.selectedProductIndex() % list.length];
  });

  readonly is3dViewActive = signal<boolean>(true);

  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private renderer?: THREE.WebGLRenderer;
  private particleSystem?: THREE.Points;
  private floatingRings: THREE.Mesh[] = [];
  private animationFrameId?: number;

  private mouseX = 0;
  private mouseY = 0;
  private targetMouseX = 0;
  private targetMouseY = 0;

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    setTimeout(() => this.initHero3dScene(), 50);
  }

  ngOnDestroy(): void {
    this.cleanHero3dScene();
  }

  selectProduct(index: number): void {
    this.selectedProductIndex.set(index);
  }

  toggle3dView(): void {
    this.is3dViewActive.set(!this.is3dViewActive());
  }

  onMouseMove(event: MouseEvent): void {
    const windowHalfX = window.innerWidth / 2;
    const windowHalfY = window.innerHeight / 2;
    this.targetMouseX = (event.clientX - windowHalfX) * 0.0008;
    this.targetMouseY = (event.clientY - windowHalfY) * 0.0008;
  }

  private initHero3dScene(): void {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;

    this.cleanHero3dScene();

    const parent = canvas.parentElement;
    const width = parent?.clientWidth || window.innerWidth;
    const height = parent?.clientHeight || 700;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.z = 12;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Floating Holographic Rings
    const ringGeo = new THREE.TorusGeometry(3.5, 0.04, 16, 100);

    const ringMat1 = new THREE.MeshBasicMaterial({ color: 0xec4899, wireframe: true, transparent: true, opacity: 0.4 });
    const ring1 = new THREE.Mesh(ringGeo, ringMat1);
    ring1.rotation.x = Math.PI / 3;
    this.scene.add(ring1);
    this.floatingRings.push(ring1);

    const ringMat2 = new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, transparent: true, opacity: 0.4 });
    const ring2 = new THREE.Mesh(ringGeo, ringMat2);
    ring2.rotation.y = Math.PI / 4;
    ring2.scale.setScalar(1.3);
    this.scene.add(ring2);
    this.floatingRings.push(ring2);

    // Particle Cloud
    const particleCount = 280;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const colorChoices = [
      new THREE.Color(0xec4899),
      new THREE.Color(0x8b5cf6),
      new THREE.Color(0x38bdf8),
      new THREE.Color(0xf59e0b)
    ];

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      positions[idx] = (Math.random() - 0.5) * 22;
      positions[idx + 1] = (Math.random() - 0.5) * 22;
      positions[idx + 2] = (Math.random() - 0.5) * 22;

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
      opacity: 0.8
    });

    this.particleSystem = new THREE.Points(particleGeo, particleMat);
    this.scene.add(this.particleSystem);

    this.ngZone.runOutsideAngular(() => {
      let clock = new THREE.Clock();

      const animate = () => {
        if (!this.renderer || !this.scene || !this.camera) return;
        this.animationFrameId = requestAnimationFrame(animate);

        const elapsedTime = clock.getElapsedTime();

        this.mouseX += (this.targetMouseX - this.mouseX) * 0.05;
        this.mouseY += (this.targetMouseY - this.mouseY) * 0.05;

        this.floatingRings.forEach((ring, index) => {
          ring.rotation.x = elapsedTime * (0.15 + index * 0.1) + this.mouseY;
          ring.rotation.y = elapsedTime * (0.2 + index * 0.1) + this.mouseX;
        });

        if (this.particleSystem) {
          this.particleSystem.rotation.y = elapsedTime * 0.04 + this.mouseX;
        }

        this.renderer.render(this.scene, this.camera);
      };
      animate();
    });
  }

  private cleanHero3dScene(): void {
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
    this.floatingRings = [];
  }
}
