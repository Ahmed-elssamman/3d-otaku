import {
  Component,
  inject,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  viewChild,
  NgZone
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '@core/services/seo.service';
import { WORKFLOW_STEPS, WorkflowStep } from '../../about.control';
import { APP_CONSTANTS } from '@core/constants/app.constants';
import { SectionTitleComponent } from '@shared/components/section-title/section-title.component';
import { GlowButtonComponent } from '@shared/components/glow-button/glow-button.component';
import * as THREE from 'three';

@Component({
  selector: 'app-about-page',
  standalone: true,
  imports: [RouterLink, SectionTitleComponent, GlowButtonComponent],
  templateUrl: './about-page.component.html',
  styleUrl: './about-page.component.scss'
})
export class AboutPageComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly seoService = inject(SeoService);
  private readonly ngZone = inject(NgZone);

  readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('aboutCanvas');

  readonly workflowSteps: WorkflowStep[] = WORKFLOW_STEPS;
  readonly safetyDisclaimer = APP_CONSTANTS.SAFETY_DISCLAIMER;

  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private renderer?: THREE.WebGLRenderer;
  private particleSystem?: THREE.Points;
  private floatingShape?: THREE.Mesh;
  private animationFrameId?: number;

  private mouseX = 0;
  private mouseY = 0;
  private targetMouseX = 0;
  private targetMouseY = 0;

  readonly teamValues = [
    {
      icon: 'pi pi-bolt',
      title: 'Anime Passion & Precision',
      desc: 'We are otaku creators building props we want to hold ourselves. Every katana guard, kunai seal, and mask is sculptured with anime accuracy.',
      color: 'from-pink-500/20 to-purple-500/20',
      border: 'border-pink-500/40'
    },
    {
      icon: 'pi pi-box',
      title: 'High-Density Additive Manufacturing',
      desc: 'Using ultra-pure PLA+ filament, 0.12mm layer heights, and multi-shell infills for maximum durability without heavy weight.',
      color: 'from-cyan-500/20 to-blue-500/20',
      border: 'border-cyan-500/40'
    },
    {
      icon: 'pi pi-shield',
      title: '100% Convention Safe Props',
      desc: 'Engineered specifically for conventions, cosplay gatherings, and home exhibition shelves. All edges are blunted and unsharpened.',
      color: 'from-emerald-500/20 to-teal-500/20',
      border: 'border-emerald-500/40'
    }
  ];

  ngOnInit(): void {
    this.seoService.setTitle('About 3D Otaku - World\'s #1 Anime 3D Print Forge');
    this.seoService.setMetaDescription('Learn about 3D Otaku, our high-density PLA+ 3D printing technology, and 1:1 anime cosplay prop craftsmanship.');
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initAbout3dScene(), 50);
  }

  ngOnDestroy(): void {
    this.cleanAbout3dScene();
  }

  onMouseMove(event: MouseEvent): void {
    const windowHalfX = window.innerWidth / 2;
    const windowHalfY = window.innerHeight / 2;
    this.targetMouseX = (event.clientX - windowHalfX) * 0.001;
    this.targetMouseY = (event.clientY - windowHalfY) * 0.001;
  }

  private initAbout3dScene(): void {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;

    this.cleanAbout3dScene();

    const parent = canvas.parentElement;
    const width = parent?.clientWidth || window.innerWidth;
    const height = parent?.clientHeight || 600;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.z = 10;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Centerpiece Wireframe Gem (Anime Power Core)
    const geo = new THREE.IcosahedronGeometry(2.5, 1);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xec4899,
      wireframe: true,
      transparent: true,
      opacity: 0.35
    });
    this.floatingShape = new THREE.Mesh(geo, mat);
    this.scene.add(this.floatingShape);

    // Particle Cloud (Aura Vortex)
    const particleCount = 350;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const palette = [
      new THREE.Color(0xec4899),
      new THREE.Color(0xa855f7),
      new THREE.Color(0x06b6d4),
      new THREE.Color(0x10b981)
    ];

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      positions[idx] = (Math.random() - 0.5) * 20;
      positions[idx + 1] = (Math.random() - 0.5) * 20;
      positions[idx + 2] = (Math.random() - 0.5) * 20;

      const col = palette[Math.floor(Math.random() * palette.length)];
      colors[idx] = col.r;
      colors[idx + 1] = col.g;
      colors[idx + 2] = col.b;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.08,
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

        this.mouseX += (this.targetMouseX - this.mouseX) * 0.05;
        this.mouseY += (this.targetMouseY - this.mouseY) * 0.05;

        if (this.floatingShape) {
          this.floatingShape.rotation.x = elapsedTime * 0.2 + this.mouseY;
          this.floatingShape.rotation.y = elapsedTime * 0.3 + this.mouseX;
        }

        if (this.particleSystem) {
          this.particleSystem.rotation.y = elapsedTime * 0.05 + this.mouseX;
        }

        this.renderer.render(this.scene, this.camera);
      };
      animate();
    });
  }

  private cleanAbout3dScene(): void {
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
    this.floatingShape = undefined;
    this.particleSystem = undefined;
  }
}
